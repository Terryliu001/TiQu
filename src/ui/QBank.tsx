/**
 * 题库：把历年真题按专题装订成册，像在书架上取书一样翻阅。
 * 书架最左边是「题册」——15 份预置 PDF 试卷，点一份即可载入工作台正常使用。
 * 题干与答案均用 Markdown + LaTeX 渲染。
 */
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { BANK, BANK_STATS } from '../core/qbank/seed';
import { PRESET_PDFS, type PresetPdf } from '../core/qbank/pdfs';
import { useApp } from '../store';
import { Markdown } from './Markdown';
import { Icon } from './icons';

const PDFS = '__pdfs__';

export function QBank() {
  const [sel, setSel] = useState<string>(BANK.books[0].id);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const openFile = useApp((s) => s.openFile);
  const setView = useApp((s) => s.setView);
  const showToast = useApp((s) => s.showToast);

  const isPdfs = sel === PDFS;
  const book = useMemo(() => BANK.books.find((b) => b.id === sel) ?? BANK.books[0], [sel]);
  const toggle = (id: string) => setOpen((s) => ({ ...s, [id]: !s[id] }));

  const loadPreset = async (pdf: PresetPdf) => {
    if (busy) return;
    setBusy(pdf.id);
    try {
      const res = await fetch(pdf.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], pdf.fileName, { type: 'application/pdf' });
      await openFile(file);
      if (useApp.getState().project) setView('workbench');
    } catch (error) {
      showToast(`载入题册失败：${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="qbank">
      <header className="qb-head">
        <p className="qb-kicker">Question bank · 历年真题</p>
        <h2>题库</h2>
        <p className="qb-sub">
          把真题与常考题型按专题装订成册，像在书架上取书一样翻阅。共 <b>{BANK_STATS.books}</b> 册、<b>{BANK_STATS.questions}</b> 道题；
          左侧「题册」另备 <b>{PRESET_PDFS.length}</b> 份 PDF 原卷，可一键载入工作台。
        </p>
      </header>

      <div className="shelf">
        <div className="shelf-books">
          <button
            className={`book book-pdfs${isPdfs ? ' on' : ''}`}
            onClick={() => setSel(PDFS)}
            title="打开题册：15 份预置 PDF"
          >
            <span className="book-band" />
            <span className="book-index">题册</span>
            <span className="book-title">预置 PDF</span>
            <span className="book-count">{PRESET_PDFS.length} 份原卷</span>
          </button>

          {BANK.books.map((b) => (
            <button
              key={b.id}
              className={`book${b.id === sel ? ' on' : ''}`}
              style={{ '--c': b.color } as CSSProperties}
              onClick={() => setSel(b.id)}
              title={`打开《${b.title}》`}
            >
              <span className="book-band" />
              <span className="book-index">{b.index}</span>
              <span className="book-title">{b.title}</span>
              <span className="book-count">{b.questions.length} 题</span>
            </button>
          ))}
        </div>
        <div className="shelf-board" />
      </div>

      {isPdfs ? (
        <section className="qbook">
          <div className="qbook-head">
            <span className="qbook-dot" style={{ background: 'var(--accent)' }} />
            <h3>题册 · 预置 PDF</h3>
            <span className="qbook-sub">点一份试卷，载入工作台开始切题与问 AI</span>
            <span className="grow" />
            <span className="qbook-n">{PRESET_PDFS.length} 份</span>
          </div>
          <div className="pdf-grid scroll">
            {PRESET_PDFS.map((pdf) => (
              <button
                key={pdf.id}
                className="pdf-card"
                onClick={() => void loadPreset(pdf)}
                disabled={Boolean(busy)}
              >
                <span className="pdf-ico">
                  <Icon name="doc" size={18} />
                </span>
                <span className="pdf-body">
                  <span className="pdf-title">{pdf.title}</span>
                  <span className="pdf-meta">
                    <span className={`pdf-tag ${pdf.tag === '工科' ? 'k' : 'm'}`}>{pdf.tag}</span>
                    {pdf.meta}
                  </span>
                </span>
                <span className="pdf-go">{busy === pdf.id ? '载入中…' : '载入'}</span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="qbook">
          <div className="qbook-head">
            <span className="qbook-dot" style={{ background: book.color }} />
            <h3>{book.title}</h3>
            <span className="qbook-sub">{book.subtitle}</span>
            <span className="grow" />
            <span className="qbook-n">{book.questions.length} 题</span>
          </div>
          <div className="q-list scroll">
            {book.questions.map((q) => (
              <article key={q.id} className="q-item">
                <div className="q-meta">
                  <span className="q-no" style={{ background: book.color }}>{q.no}</span>
                  <span className="q-point">{q.point}</span>
                  <span className="grow" />
                  <span className="q-src">{q.source}</span>
                </div>
                <div className="q-stem">
                  <Markdown>{q.stem}</Markdown>
                </div>
                {q.answer && (
                  <div className="q-ans">
                    <button
                      className={`q-ans-btn${open[q.id] ? ' on' : ''}`}
                      onClick={() => toggle(q.id)}
                    >
                      <Icon
                        name="chev"
                        size={12}
                        style={{ transform: open[q.id] ? 'rotate(90deg)' : 'rotate(0deg)' }}
                      />
                      {open[q.id] ? '收起答案' : '参考答案'}
                    </button>
                    {open[q.id] && (
                      <div className="q-ans-body">
                        <Markdown>{q.answer}</Markdown>
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
