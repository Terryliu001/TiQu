/**
 * 右栏：AI 讲题。
 *
 * 一次只服务一道题：题面截图 + 可选文字 + 多轮追问。
 * 未配置时给引导而不是装死；模型不支持图片时明说（否则用户以为图没发出去）。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { PRESETS } from '../core/ai/prompt';
import { providerOf } from '../core/ai/providers';
import { Icon } from './icons';
import { Markdown } from './Markdown';

export function Inspector() {
  const pdf = useApp((s) => s.pdf);
  const open = useApp((s) => s.inspectorOpen);
  const questions = useApp((s) => s.questions);
  const selectedId = useApp((s) => s.selectedId);
  const chats = useApp((s) => s.chats);
  const settings = useApp((s) => s.settings);
  const streaming = useApp((s) => s.streaming);
  const ask = useApp((s) => s.ask);
  const stop = useApp((s) => s.stop);
  const clearChat = useApp((s) => s.clearChat);
  const setSettingsOpen = useApp((s) => s.setSettingsOpen);
  const toggleInspector = useApp((s) => s.toggleInspector);
  const select = useApp((s) => s.select);

  const [draft, setDraft] = useState('');
  const [thumb, setThumb] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const question = questions.find((q) => q.id === selectedId) ?? null;
  const messages = useMemo(
    () => (question ? chats[question.id] ?? [] : []),
    [chats, question],
  );
  const provider = providerOf(settings.providerId);
  const configured = Boolean(settings.apiKey.trim() && settings.model.trim());

  // 题面缩略图（也用 2× 渲染，跟 AI 裁切共用同一份页面缓存）
  useEffect(() => {
    let cancelled = false;
    const slice = question?.slices[0];
    if (!pdf || !slice) {
      setThumb(null);
      return;
    }
    pdf
      .cropRegion(slice.page, slice.rect, 2, 720)
      .then((url) => {
        if (!cancelled) setThumb(url);
      })
      .catch(() => {
        if (!cancelled) setThumb(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pdf, question]);

  // 新消息滚到底
  useEffect(() => {
    const element = chatRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages.length, messages[messages.length - 1]?.content, question?.id]);

  const send = (text?: string) => {
    if (!question || streaming) return;
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
    void ask(question, content);
  };

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text);
  };

  return (
    <aside className={`inspector${open ? '' : ' closed'}`}>
      <div className="insp-head">
        <h3>AI 讲题</h3>
        {question && <span className="tagq">题号 {question.label}</span>}
        <span className="spacer" />
        {question && messages.length > 0 && (
          <button
            className="icon-btn"
            title="清空这道题的对话"
            onClick={() => clearChat(question.id)}
          >
            <Icon name="trash" size={15} />
          </button>
        )}
        <button className="icon-btn" title="收起面板（]）" onClick={toggleInspector}>
          <Icon name="close" size={15} />
        </button>
      </div>

      {!question ? (
        <div className="ai-empty">
          <h4>先选一道题</h4>
          <p>左边点一道题，或直接在卷面上点一个框。题面会以截图形式交给你的 AI，公式不会被文字转写弄乱。</p>
        </div>
      ) : (
        <>
          <div className="qcard">
            <div className="qcard-top">
              <div
                className="thumb"
                onClick={() => thumb && setLightbox(thumb)}
                title={thumb ? '点开看题面' : ''}
              >
                {thumb ? <img src={thumb} alt={`题号 ${question.label} 的题面`} /> : null}
              </div>
              <div className="qcard-meta">
                <div className="t1">
                  <span>题号 {question.label}</span>
                  <span className={`kind ${question.kind}`}>
                    {question.kind === 'choice'
                      ? '选择'
                      : question.kind === 'blank'
                        ? '填空'
                        : question.kind === 'judge'
                          ? '判断'
                          : '解答'}
                  </span>
                  <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>
                    第 {(question.slices[0]?.page ?? 0) + 1} 页
                  </span>
                </div>
                <div className="t2">
                  {question.slices.length > 1 ? `跨 ${question.slices.length} 段` : '单段'}
                  <span className="dot" />
                  {question.source === 'scan' ? '版面识别' : question.source === 'manual' ? '手画' : '文本层'}
                </div>
                {!provider.vision ? (
                  <span className="attached warn">
                    <Icon name="clip" size={10} />
                    该模型不支持图片，只发文字
                  </span>
                ) : settings.sendImage ? (
                  <span className="attached">
                    <Icon name="clip" size={10} />
                    题面截图已附上
                  </span>
                ) : (
                  <span className="attached warn">
                    <Icon name="clip" size={10} />
                    已关闭图片发送
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="chat scroll" ref={chatRef}>
            {messages.length === 0 && (
              <div className="ai-empty" style={{ margin: 0 }}>
                <h4>{configured ? '问点什么' : '先接上你的 AI'}</h4>
                <p>
                  {configured
                    ? '可以直接点下面的预设，也可以自己写问题。对话按题保存，切走再回来还在。'
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
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                className="preset"
                disabled={streaming}
                onClick={() => send(preset.ask)}
              >
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
                placeholder={configured ? '就这道题继续追问…（Enter 发送，Shift+Enter 换行）' : '先配置 AI 服务'}
              />
              <div className="composer-row">
                <button
                  className="icon-btn sm"
                  title={settings.sendImage ? '本次会附题面截图' : '未发送图片'}
                  onClick={() => setSettingsOpen(true)}
                >
                  <Icon name="clip" size={14} />
                </button>
                <span className="hint">
                  {configured ? `${provider.name} · ${settings.model}` : '未配置'}
                </span>
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

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="题面" />
        </div>
      )}
    </aside>
  );
}
