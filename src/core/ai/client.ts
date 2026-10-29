/**
 * OpenAI 兼容的流式客户端。
 *
 * 只用 fetch + ReadableStream：不引 SDK（少 200KB）、错误分类掌握在自己手里。
 *
 * 三条降级（来自刷起的真机经验）：
 * 1. 有的网关无视 stream=true，直接回一整段 JSON → 按 JSON 解析；
 * 2. 老网关不认 `stream_options` → 去掉重试一次；
 * 3. reasoning 模型的思考过程放在 `reasoning_content`（DeepSeek）或
 *    `reasoning`（部分网关），统一收进 reasoning 字段折叠展示。
 */
import { normalizeBaseUrl, type AiSettings } from './providers';

export type AiErrorKind =
  | 'notConfigured'
  | 'auth'
  | 'rateLimited'
  | 'network'
  | 'cors'
  | 'server'
  | 'timeout'
  | 'badResponse'
  | 'aborted';

export class AiError extends Error {
  constructor(
    readonly kind: AiErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
  /** dataURL 列表，仅 user 轮使用。 */
  images?: string[];
}

export interface StreamHandlers {
  onDelta: (text: string) => void;
  onReasoning?: (text: string) => void;
}

export async function streamChat(
  settings: AiSettings,
  turns: ChatTurn[],
  handlers: StreamHandlers,
  signal: AbortSignal,
): Promise<void> {
  if (!settings.apiKey.trim()) throw new AiError('notConfigured', '还没有填写 API Key');
  if (!settings.model.trim()) throw new AiError('notConfigured', '还没有填写模型名');

  const base = normalizeBaseUrl(settings.baseUrl);
  if (!base) throw new AiError('notConfigured', '还没有填写 API 地址');
  const url = `${base}/chat/completions`;

  const send = (payload: Record<string, unknown>) =>
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal,
    });

  let response: Response;
  try {
    response = await send(buildRequestBody(settings, turns, settings.deepThinking));
    // 深度思考的参数（推理模型 / reasoning_effort / enable_thinking）不一定被每家接受；
    // 若返回 400，降级为普通请求重试一次，避免「开关一开就报错」。
    if (!response.ok && response.status === 400 && settings.deepThinking) {
      response = await send(buildRequestBody(settings, turns, false));
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw new AiError('aborted', '已取消');
    // 浏览器里 fetch 被跨域拦截时只会给一个 TypeError，没有更多信息。
    throw new AiError(
      'cors',
      '无法连接该服务。可能是网络不通，或服务不允许浏览器直接调用（跨域限制）。可换一家厂商，或按 README 启动本地代理。',
    );
  }

  if (!response.ok) {
    const text = await safeText(response);
    if (response.status === 401 || response.status === 403) {
      throw new AiError('auth', `密钥无效或无权限（${response.status}）${short(text)}`);
    }
    if (response.status === 429) {
      throw new AiError('rateLimited', `请求过于频繁或额度用尽（429）${short(text)}`);
    }
    if (response.status >= 500) {
      throw new AiError('server', `服务端错误（${response.status}）${short(text)}`);
    }
    throw new AiError('badResponse', `请求失败（${response.status}）${short(text)}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  // 有的网关直接回整段 JSON。
  if (contentType.includes('application/json')) {
    const raw = await response.text();
    const parsed = safeJson(raw);
    const message = parsed ? extractMessage(parsed) : null;
    if (message?.content) handlers.onDelta(message.content);
    if (message?.reasoning) handlers.onReasoning?.(message.reasoning);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) throw new AiError('badResponse', '响应没有可读的数据流');

  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE 以空行分隔事件；兼容 \r\n。
      let index = buffer.search(/\r?\n\r?\n/);
      while (index >= 0) {
        const event = buffer.slice(0, index);
        buffer = buffer.slice(index + (buffer[index] === '\r' ? 4 : 2));
        handleEvent(event, handlers);
        index = buffer.search(/\r?\n\r?\n/);
      }
    }
    if (buffer.trim()) handleEvent(buffer, handlers);
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw new AiError('aborted', '已取消');
    throw new AiError('network', '读取响应流失败，请检查网络后重试');
  } finally {
    reader.releaseLock();
  }
}

/**
 * 组装请求体。deep=true 时按厂商尽量启用「深度思考」：
 *   - DeepSeek：切到 deepseek-reasoner（其推理过程走 reasoning_content），并去掉不被支持的 temperature；
 *   - 通义千问（DashScope 兼容模式）：enable_thinking=true；
 *   - 智谱 GLM：thinking={type:'enabled'}；
 *   - 其余（OpenAI / Kimi / 硅基流动 / 自定义）：reasoning_effort='medium'。
 * 若网关不接受，streamChat 会在 400 时用 deep=false 重试一次。
 */
function buildRequestBody(
  settings: AiSettings,
  turns: ChatTurn[],
  deep: boolean,
): Record<string, unknown> {
  let model = settings.model;
  const extras: Record<string, unknown> = {};
  let omitTemperature = false;

  if (deep) {
    switch (settings.providerId) {
      case 'deepseek':
        model = 'deepseek-reasoner';
        omitTemperature = true;
        break;
      case 'qwen':
        extras.enable_thinking = true;
        break;
      case 'zhipu':
        extras.thinking = { type: 'enabled' };
        break;
      default:
        extras.reasoning_effort = 'medium';
    }
  }

  const body: Record<string, unknown> = {
    model,
    messages: turns.map(toApiMessage),
    max_tokens: settings.maxTokens,
    stream: true,
    stream_options: { include_usage: true },
  };
  if (!omitTemperature) body.temperature = settings.temperature;
  Object.assign(body, extras);
  return body;
}

function toApiMessage(turn: ChatTurn) {
  if (turn.role === 'user' && turn.images && turn.images.length > 0) {
    return {
      role: 'user',
      content: [
        ...turn.images.map((url) => ({ type: 'image_url', image_url: { url } })),
        { type: 'text', text: turn.content },
      ],
    };
  }
  return { role: turn.role, content: turn.content };
}

function handleEvent(raw: string, handlers: StreamHandlers) {
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    const json = safeJson(payload);
    if (!json) continue;

    const choice = json.choices?.[0];
    const delta = choice?.delta ?? {};
    const reasoning = delta.reasoning_content ?? delta.reasoning;
    if (typeof reasoning === 'string' && reasoning) handlers.onReasoning?.(reasoning);
    if (typeof delta.content === 'string' && delta.content) handlers.onDelta(delta.content);
  }
}

function extractMessage(json: any): { content: string; reasoning: string } | null {
  const message = json?.choices?.[0]?.message;
  if (!message) return null;
  return {
    content: typeof message.content === 'string' ? message.content : '',
    reasoning: message.reasoning_content ?? message.reasoning ?? '',
  };
}

function safeJson(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function short(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return `：${clean.slice(0, 160)}`;
}

/** 发一条最小请求探活。 */
export async function testConnection(settings: AiSettings): Promise<{ ok: boolean; message: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    let received = '';
    await streamChat(
      { ...settings, deepThinking: false, maxTokens: 8, temperature: 0 },
      [
        { role: 'system', content: '只回一个词：ok' },
        { role: 'user', content: 'ping' },
      ],
      { onDelta: (text) => (received += text) },
      controller.signal,
    );
    return { ok: true, message: `连接正常${received ? `（回复：${received.slice(0, 20)}）` : ''}` };
  } catch (error) {
    const e = error as AiError;
    return { ok: false, message: e.message ?? '连接失败' };
  } finally {
    clearTimeout(timer);
  }
}

/** 拉模型列表（不强求，失败不影响使用）。 */
export async function listModels(settings: AiSettings): Promise<string[]> {
  const base = normalizeBaseUrl(settings.baseUrl);
  const response = await fetch(`${base}/models`, {
    headers: { Authorization: `Bearer ${settings.apiKey}` },
  });
  if (!response.ok) throw new Error(`获取模型列表失败（${response.status}）`);
  const json = await response.json();
  const data = Array.isArray(json?.data) ? json.data : [];
  return data.map((item: any) => item?.id).filter((id: unknown): id is string => typeof id === 'string');
}
