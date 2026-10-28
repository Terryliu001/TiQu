/**
 * 左栏：题目索引。
 *
 * 它解决的是"卷面之外的第二条路径"：卷面上找题靠眼睛，长卷翻页很累；
 * 列表可以搜索、按题型筛、按页分组，键盘 ↑↓ 直接切题。
 */
import { useMemo, useState } from 'react';
import type { Question, QuestionKind } from '../types';
import { useApp } from '../store';
import { Icon } from './icons';

const KIND_LABEL: Record<QuestionKind, string> = {
  choice: '选择',
  blank: '填空',
  judge: '判断',
  essay: '解答',
};

type Filter = 'all' | QuestionKind;

export function Rail() {
  const questions = useApp((s) => s.questions);
  const selectedId = useApp((s) => s.selectedId);
  const select = useApp((s) => s.select);
  const ops = useApp((s) => s.ops);
  const undo = useApp((s) => s.undo);
  const redo = useApp((s) => s.redo);
  const railOpen = useApp((s) => s.railOpen);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: questions.length };
    for (const q of questions) out[q.kind] = (out[q.kind] ?? 0) + 1;
    return out;
  }, [questions]);

  const filtered = useMemo(() => {
    const keyword = query.trim();
    return questions.filter((q) => {
      if (filter !== 'all' && q.kind !== filter) return false;
      if (!keyword) return true;
      return q.label.includes(keyword) || q.stem.includes(keyword);
    });
  }, [questions, filter, query]);

  const groups = useMemo(() => {
    const map = new Map<number, Question[]>();
    for (const q of filtered) {
      const page = q.slices[0]?.page ?? 0;
      const list = map.get(page);
      if (list) list.push(q);
      else map.set(page, [q]);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [filtered]);

  return (
    <aside className={`rail${railOpen ? '' : ' closed'}`}>
      <div className="rail-head">
        <div className="rail-title">
          <h2>题目</h2>
          <span className="count">{questions.length} 道</span>
          <span className="spacer" />
          <span className="count">{ops.length ? `已改 ${ops.length}` : ''}</span>
        </div>
        <div className="search">
          <Icon name="search" size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索题号或题干…"
            aria-label="搜索题目"
          />
          {query && (
            <button className="icon-btn sm" onClick={() => setQuery('')} aria-label="清空搜索">
              <Icon name="close" size={12} />
            </button>
          )}
        </div>
        <div className="chips">
          <button className={`chip${filter === 'all' ? ' on' : ''}`} onClick={() => setFilter('all')}>
            全部 <span className="n">{counts.all ?? 0}</span>
          </button>
          {(['choice', 'blank', 'essay'] as QuestionKind[]).map((kind) =>
            counts[kind] ? (
              <button
                key={kind}
                className={`chip${filter === kind ? ' on' : ''}`}
                onClick={() => setFilter(kind)}
              >
                {KIND_LABEL[kind]} <span className="n">{counts[kind]}</span>
              </button>
            ) : null,
          )}
        </div>
      </div>

      <div className="qlist scroll">
        {groups.length === 0 && (
          <div style={{ padding: '24px 12px', fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.8 }}>
            {questions.length === 0 ? '还没有题目。点右上角「重新切题」，或在编辑模式下直接在卷面上画框。' : '没有匹配的题目。'}
          </div>
        )}

        {groups.map(([page, list]) => (
          <div key={page}>
            <div className="group-head">
              <span>第 {page + 1} 页</span>
              <span className="rule" />
              <span>{list.length}</span>
            </div>
            {list.map((q) => (
              <button
                key={q.id}
                className={`qitem${q.id === selectedId ? ' on' : ''}`}
                onClick={() => select(q.id)}
                title={q.stem || `第 ${q.label} 题`}
              >
                <span className="qno">{q.label}</span>
                <span className="qbody">
                  <span className={`qstem${q.stem ? '' : ' dim'}`}>
                    {q.stem ? q.stem.replace(/\s*\n\s*/g, ' ') : '（没有文本层，仅框选）'}
                  </span>
                  <span className="qmeta">
                    <span className={`kind ${q.kind}`}>{KIND_LABEL[q.kind as QuestionKind] ?? '解答'}</span>
                    {q.slices.length > 1 && (
                      <>
                        <span className="dot" />
                        <span>跨 {q.slices.length} 段</span>
                      </>
                    )}
                    {q.source === 'manual' && (
                      <>
                        <span className="dot" />
                        <span className="flag manual">手画</span>
                      </>
                    )}
                    {q.locked && (
                      <>
                        <span className="dot" />
                        <span>已锁定</span>
                      </>
                    )}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="rail-foot">
        <Icon name="undo" size={13} />
        <span>修改记录</span>
        <span style={{ flex: 1 }} />
        <button className="btn sm" onClick={undo} disabled={ops.length === 0}>
          撤销
        </button>
        <button className="btn sm" onClick={redo}>
          重做
        </button>
      </div>
    </aside>
  );
}
