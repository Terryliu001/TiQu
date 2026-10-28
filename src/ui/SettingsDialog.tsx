/** BYOK 设置。密钥只存本机 IndexedDB，不经过任何服务器。 */
import { useState } from 'react';
import { useApp } from '../store';
import { listModels, testConnection } from '../core/ai/client';
import { PROVIDERS, providerOf } from '../core/ai/providers';
import { Icon } from './icons';

export function SettingsDialog() {
  const open = useApp((s) => s.settingsOpen);
  const setOpen = useApp((s) => s.setSettingsOpen);
  const settings = useApp((s) => s.settings);
  const update = useApp((s) => s.updateSettings);
  const showToast = useApp((s) => s.showToast);

  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [advanced, setAdvanced] = useState(false);

  if (!open) return null;

  const provider = providerOf(settings.providerId);

  const chooseProvider = (id: string) => {
    const preset = providerOf(id);
    setResult(null);
    setModels([]);
    update({
      providerId: id,
      baseUrl: preset.baseUrl,
      model: preset.model,
      // 不支持图片的模型，先把开关落到"只发文字"，避免用户以为图发出去了
      sendImage: preset.vision,
    });
  };

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    const outcome = await testConnection(settings);
    setResult(outcome);
    setTesting(false);
  };

  const fetchModels = async () => {
    try {
      const list = await listModels(settings);
      setModels(list);
      showToast(`拿到 ${list.length} 个模型`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取失败', 'error');
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => setOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>AI 服务</h3>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>密钥只存在本机浏览器</span>
          <span className="spacer" />
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="关闭">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="modal-body scroll">
          <div className="field">
            <label>选一家（都走 OpenAI 兼容协议）</label>
            <div className="provider-grid">
              {PROVIDERS.map((item) => (
                <button
                  key={item.id}
                  className={`provider${item.id === settings.providerId ? ' on' : ''}`}
                  onClick={() => chooseProvider(item.id)}
                >
                  <span className="pname">{item.name}</span>
                  <span className="pnote">{item.vision ? '支持图片' : '仅文字'}</span>
                </button>
              ))}
            </div>
            {provider.note && <div className="hint">{provider.note}</div>}
          </div>

          <div className="field">
            <label>API Key</label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => update({ apiKey: e.target.value.trim() })}
              placeholder="sk-…"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="hint">
              只写入这台电脑的 IndexedDB。换浏览器或清了站点数据要重新填。
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>接口地址（Base URL）</label>
              <input
                type="text"
                value={settings.baseUrl}
                onChange={(e) => update({ baseUrl: e.target.value })}
                spellCheck={false}
              />
            </div>
            <div className="field">
              <label>模型</label>
              <input
                type="text"
                value={settings.model}
                onChange={(e) => update({ model: e.target.value })}
                list="model-options"
                spellCheck={false}
              />
              <datalist id="model-options">
                {(models.length > 0 ? models : provider.models).map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="field-row" style={{ alignItems: 'center' }}>
            <button className="btn ghost" onClick={() => void runTest()} disabled={testing || !settings.apiKey}>
              {testing ? '测试中…' : '测试连接'}
            </button>
            <button className="btn ghost" onClick={() => void fetchModels()} disabled={!settings.apiKey}>
              拉取模型列表
            </button>
          </div>

          {result && (
            <div className={`test-result ${result.ok ? 'ok' : 'err'}`} style={{ marginTop: 10 }}>
              {result.message}
            </div>
          )}

          <div style={{ height: 18 }} />

          <div className="switch-row">
            <div>
              <div className="label">随消息发送题面截图</div>
              <div className="desc">
                {provider.vision
                  ? '推荐打开：公式、图形不会被文字转写弄乱'
                  : '当前模型不支持图片，打开也会被忽略'}
              </div>
            </div>
            <button
              className={`switch${settings.sendImage ? ' on' : ''}`}
              onClick={() => update({ sendImage: !settings.sendImage })}
              aria-label="发送题面截图"
            />
          </div>

          <div className="switch-row">
            <div>
              <div className="label">附加 PDF 文本层的题干文字</div>
              <div className="desc">作为辅助定位；公式题会自动跳过（乱序文字反而误导模型）</div>
            </div>
            <button
              className={`switch${settings.sendText ? ' on' : ''}`}
              onClick={() => update({ sendText: !settings.sendText })}
              aria-label="附加题干文字"
            />
          </div>

          <div style={{ height: 12 }} />

          <button className="btn sm" onClick={() => setAdvanced(!advanced)} style={{ paddingLeft: 0 }}>
            <Icon name="chev" size={13} style={{ transform: advanced ? 'rotate(180deg)' : 'none' }} />
            {advanced ? '收起高级设置' : '高级设置'}
          </button>

          {advanced && (
            <div style={{ marginTop: 12 }}>
              <div className="field-row">
                <div className="field">
                  <label>温度（0 更稳，1 更发散）</label>
                  <input
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    value={settings.temperature}
                    onChange={(e) => update({ temperature: Number(e.target.value) })}
                  />
                </div>
                <div className="field">
                  <label>最大回复长度（tokens）</label>
                  <input
                    type="number"
                    min={256}
                    max={16384}
                    step={256}
                    value={settings.maxTokens}
                    onChange={(e) => update({ maxTokens: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="field">
                <label>系统提示词</label>
                <textarea
                  value={settings.systemPrompt}
                  onChange={(e) => update({ systemPrompt: e.target.value })}
                  spellCheck={false}
                />
                <div className="hint">
                  这段决定了模型怎么讲题。改坏了点下面「恢复默认」。
                </div>
                <button
                  className="btn sm"
                  style={{ marginTop: 8 }}
                  onClick={() => update({ systemPrompt: DEFAULT_PROMPT })}
                >
                  恢复默认
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-foot">
          <span style={{ marginRight: 'auto', fontSize: 11, color: 'var(--ink-3)' }}>
            {settings.apiKey ? '已保存' : '未填写密钥'}
          </span>
          <button className="btn primary" onClick={() => setOpen(false)}>
            完成
          </button>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_PROMPT = [
  '你是一位耐心的讲题老师，擅长把解题思路讲清楚。',
  '输入可能包含题面图片（来自 PDF 原页的裁切，是权威来源），以及一段机器抽取的文字（仅作辅助，可能缺字、错序，或把公式拆成碎片）。',
  '图片与文字冲突时，以图片为准；不要根据乱序文字补写公式或数字。',
  '如果题面确实看不清，直接说“题面不清晰”，不要猜。',
  '回答用中文，分步骤讲，公式用 LaTeX（行内 $...$，独立 $$...$$）。',
].join('\n');
