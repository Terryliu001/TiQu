/**
 * 右栏：针对选中词条的 AI 对话。
 * 复用主仓库的流式通道（streamChat + buildTermTurns），上下文是词条正文（含 LaTeX）。
 * 样式复用 Inspector 的 .chat/.composer/.presets 等全局类。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useKnowledge } from '../store/knowledge';
import { useApp } from '../store';
import { Markdown } from './Markdown';
import { Icon } from './icons';
import { getChapter } from '../core/knowledge/seed';

const TERM_PRESETS = [
  { id: 'explain', label: '讲讲它', ask: '请讲解这个词条的定义、核心思想与典型用法，重点说清公式的含义。' },
  { id: 'example', label: '举个例', ask: '请给出一个具体例子或例题，说明这个概念怎么用。' },
  { id: 'relate', label: '相关概念', ask: '这个概念和哪些数学分析里的其它概念紧密相关？它们是什么关系？' },
  { id: 'mistake', label: '易错点', ask: '学习这个概念时常见的误解和易错点有哪些？' },
];

export function TermChat() {
  const terms = useKnowledge((s) => s.terms);
  const selectedId = useKnowledge((s) => s.selectedId);
  const chats = useKnowledge((s) => s.chats);
  const streaming = useKnowledge((s) => s.streaming);
  const ask = useKnowledge((s) => s.ask);
  const stop = useKnowledge((s) => s.stop);
  const clearChat = useKnowledge((s) => s.clearChat);

  const settings = useApp((s) => s.settings);
  const setSettingsOpen = useApp((s) => s.setSettingsOpen);
  const updateSettings = useApp((s) => s.updateSettings);
  const inspectorOpen = useApp((s) => s.inspectorOpen);
  const configured = Boolean(settings.apiKey.trim() && settings.model.trim());

  const [draft, setDraft] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const term = useMemo(() => terms.find((t) => t.id === selectedId) ?? null, [terms, selectedId]);
  const messages = useMemo(() => (term ? chats[term.id] ?? [] : []), [chats, term]);

  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, messages[messages.length - 1]?.content, term?.id]);

  const send = (text?: string) => {
    if (!term || streaming) return;
    const content = (text ?? draft).trim();
    if (!content) {
      inputRef.current?.focus();
      return;
    }
    if (!configured) {
      setSettingsOpen(true);
      return;
    }
    setDraft('');
    void ask(term.id, content);
  };

  const copy = (text: string) => void navigator.clipboard.writeText(text);

  return (
    <aside className={`inspector kchat${inspectorOpen ? '' : ' closed'}`}>
      <div className="insp-head">
        <h3>AI 讲题</h3>
        {term && <span className="tagq" style={{ background: getChapter(term.chapter).color }}>{term.name}</span>}
        <span className="spacer" />
        {term && messages.length > 0 && (
          <button className="icon-btn" title="清空对话" onClick={() => clearChat(term.id)}>
            <Icon name="trash" size={15} />
          </button>
        )}
        <button className="icon-btn" title="收起面板" onClick={() => useApp.getState().toggleInspector()}>
          <Icon name="close" size={15} />
        </button>
      </div>

      {!term ? (
        <div className="ai-empty">
          <h4>先选一个词条</h4>
          <p>在图谱上点一个节点，或从左栏选。AI 会以该词条的定义与公式为上下文回答你的问题。</p>
        </div>
      ) : (
        <>
          <div className="qcard">
            <div className="qcard-top">
              <div className="qcard-meta" style={{ paddingLeft: 0 }}>
                <div className="t1">
                  <span>{term.name}</span>
                  <span className="kind" style={{ background: getChapter(term.chapter).color }}>
                    {getChapter(term.chapter).name}
                  </span>
                </div>
                <div className="t2">上下文已附该词条正文（含公式）</div>
              </div>
            </div>
          </div>

          <div className="chat scroll" ref={chatRef}>
            {messages.length === 0 && (
              <div className="ai-empty" style={{ margin: 0 }}>
                <h4>{configured ? '问点什么' : '先接上你的 AI'}</h4>
                <p>
                  {configured
                    ? '可以直接点下面的预设，也可以自己写。对话按词条保存，切走再回来还在。'
                    : '题取不自带模型额度。填一个你自己的 API Key（OpenAI 兼容即可），密钥只存在这台电脑的浏览器里。'}
                </p>
                {!configured && (
                  <button className="btn primary" onClick={() => setSettingsOpen(true)}>
                    配置 AI 服务
                  </button>
                )}
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`msg ${message.role === 'assistant' ? 'ai' : 'me'}`}>
                {message.role === 'assistant' && (
                  <div className="avatar">
                    <Icon name="ai" size={13} />
                  </div>
                )}
                <div className="body">
                  {message.reasoning && (
                    <details className="reasoning">
                      <summary>思考过程</summary>
                      <div className="thinking">{message.reasoning}</div>
                    </details>
                  )}
                  <div className="bubble">
                    {message.role === 'assistant' ? (
                      message.content ? (
                        <Markdown>{message.content}</Markdown>
                      ) : message.error ? null : (
                        <span style={{ color: 'var(--ink-3)' }}>正在思考…</span>
                      )
                    ) : (
                      message.content
                    )}
                    {message.streaming && <span className="cursor-blink" />}
                  </div>
                  {message.error && <div className="err">{message.error}</div>}
                  {message.role === 'assistant' && !message.streaming && message.content && (
                    <div className="ai-foot">
                      <button onClick={() => copy(message.content)}>
                        <Icon name="copy" size={12} />
                        复制
                      </button>
                      <span>·</span>
                      <span>{settings.model}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="presets">
            {TERM_PRESETS.map((preset) => (
              <button key={preset.id} className="preset" disabled={streaming} onClick={() => send(preset.ask)}>
                {preset.label}
              </button>
            ))}
          </div>

          <div className="composer">
            <div className="composer-box">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={configured ? '就这个词条继续追问…（Enter 发送，Shift+Enter 换行）' : '先配置 AI 服务'}
              />
              <div className="composer-row">
                <span className="hint">{configured ? '上下文：当前词条' : '未配置'}</span>
                <button
                  className={`think-toggle${settings.deepThinking ? ' on' : ''}`}
                  title={
                    settings.deepThinking
                      ? '深度思考：已开启（推理模型 / 推理参数）'
                      : '深度思考：已关闭，点击开启（DeepSeek 会切到推理模型 deepseek-reasoner）'
                  }
                  disabled={streaming}
                  onClick={() => updateSettings({ deepThinking: !settings.deepThinking })}
                >
                  <Icon name="spark" size={12} />
                  深度思考
                </button>
                {streaming ? (
                  <button className="send stop" onClick={stop} title="停止">
                    <Icon name="stop" size={13} />
                  </button>
                ) : (
                  <button className="send" onClick={() => send()} disabled={!draft.trim()} title="发送（Enter）">
                    <Icon name="send" size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
