/**
 * 厂商预置。全部走 OpenAI 兼容协议（/chat/completions），
 * 差异只有 baseURL、默认模型、是否支持图片。
 *
 * 视觉能力是硬事实：DeepSeek 的对话模型收不了图，选它时界面要明说
 * "只发文字"，否则用户会以为题面截图没发出去。
 */

export interface ProviderPreset {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  models: string[];
  vision: boolean;
  /** 浏览器直连是否已知可用（CORS）。null = 未实测。 */
  browserDirect: boolean | null;
  note?: string;
}

export const PROVIDERS: ProviderPreset[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    vision: false,
    browserDirect: true,
    note: '不支持图片：只发送题面文字，公式可能错序',
  },
  {
    id: 'qwen',
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-vl-max',
    models: ['qwen-vl-max', 'qwen-vl-plus', 'qwen-plus'],
    vision: true,
    browserDirect: null,
    note: '视觉模型可直接读题面截图',
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4v-plus',
    models: ['glm-4v-plus', 'glm-4v', 'glm-4-plus'],
    vision: true,
    browserDirect: null,
  },
  {
    id: 'kimi',
    name: 'Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k-vision-preview',
    models: ['moonshot-v1-8k-vision-preview', 'moonshot-v1-32k-vision-preview', 'moonshot-v1-8k'],
    vision: true,
    browserDirect: null,
  },
  {
    id: 'siliconflow',
    name: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-VL-72B-Instruct',
    models: [
      'Qwen/Qwen2.5-VL-72B-Instruct',
      'Qwen/Qwen2-VL-72B-Instruct',
      'deepseek-ai/DeepSeek-V3',
    ],
    vision: true,
    browserDirect: null,
    note: '聚合多家模型，一个 Key 通用',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
    vision: true,
    browserDirect: true,
  },
  {
    id: 'custom',
    name: '自定义',
    baseUrl: 'http://127.0.0.1:8787/v1',
    model: '',
    models: [],
    vision: true,
    browserDirect: null,
    note: '任意 OpenAI 兼容端点；本地代理可用 http://127.0.0.1:8787/v1',
  },
];

export interface AiSettings {
  providerId: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  /** 是否把题面截图一起发送。模型不支持图片时自动忽略。 */
  sendImage: boolean;
  /** 是否附上 PDF 文本层的题面文字（辅助，可能乱序）。 */
  sendText: boolean;
  systemPrompt: string;
}

export const DEFAULT_SYSTEM_PROMPT = [
  '你是一位耐心的讲题老师，擅长把解题思路讲清楚。',
  '输入可能包含题面图片（来自 PDF 原页的裁切，是权威来源），以及一段机器抽取的文字（仅作辅助，可能缺字、错序，或把公式拆成碎片）。',
  '图片与文字冲突时，以图片为准；不要根据乱序文字补写公式或数字。',
  '如果题面确实看不清，直接说“题面不清晰”，不要猜。',
  '回答用中文，分步骤讲，公式用 LaTeX（行内 $...$，独立 $$...$$）。',
].join('\n');

export function defaultSettings(): AiSettings {
  const provider = PROVIDERS[0];
  return {
    providerId: provider.id,
    baseUrl: provider.baseUrl,
    apiKey: '',
    model: provider.model,
    temperature: 0.3,
    maxTokens: 2048,
    // 默认这家不支持图片，开关就落到关；换到视觉模型时 chooseProvider 会自动打开
    sendImage: provider.vision,
    sendText: true,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
  };
}

export function providerOf(id: string): ProviderPreset {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[PROVIDERS.length - 1];
}

/** 规范化 baseURL：去尾斜杠；允许用户只填域名。 */
export function normalizeBaseUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, '');
  if (!url) return url;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}
