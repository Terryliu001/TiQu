/**
 * 左栏词条面板。
 * - 在图谱上 hover 即在此预览；click 选中后固定显示（hover 离开仍保留）。
 * - 选中后可「编辑」（改名称/章节/正文/简介）或「删除」。
 * - 底部可给当前词条增删关联（即图谱上的边）。
 * - 「新建词条」打开表单，写入后成为新节点。
 * 公式走现有 Markdown（KaTeX），词条正文里的 $..$ 一定能正确渲染。
 */
import { useMemo, useState } from 'react';
import { useKnowledge } from '../store/knowledge';
import { CHAPTERS, getChapter } from '../core/knowledge/seed';
import { Markdown } from './Markdown';
import { Icon } from './icons';

export function KnowledgePanel() {
  const terms = useKnowledge((s) => s.terms);
  const links = useKnowledge((s) => s.links);
  const selectedId = useKnowledge((s) => s.selectedId);
  const hoverId = useKnowledge((s) => s.hoverId);
  const editId = useKnowledge((s) => s.editId);
  const creating = useKnowledge((s) => s.creating);
  const startEdit = useKnowledge((s) => s.startEdit);
  const startCreate = useKnowledge((s) => s.startCreate);
  const stopEdit = useKnowledge((s) => s.stopEdit);
  const addTerm = useKnowledge((s) => s.addTerm);
  const updateTerm = useKnowledge((s) => s.updateTerm);
  const removeTerm = useKnowledge((s) => s.removeTerm);
  const addEdge = useKnowledge((s) => s.addEdge);
  const removeEdge = useKnowledge((s) => s.removeEdge);
  const select = useKnowledge((s) => s.select);

  const displayId = creating ? '__new__' : editId ?? hoverId ?? selectedId;
  const term = useMemo(() => terms.find((t) => t.id === displayId) ?? null, [terms, displayId]);

  const neighborIds = useMemo(() => {
    if (!displayId || displayId === '__new__') return [];
    const set = new Set<string>();
    for (const l of links) {
      const s = l.source as string;
      const t = l.target as string;
      if (s === displayId) set.add(t);
      if (t === displayId) set.add(s);
    }
    return [...set];
  }, [links, displayId]);
  const neighbors = terms.filter((t) => neighborIds.includes(t.id));

  const [query, setQuery] = useState('');
  const addable = useMemo(() => {
    if (!displayId || displayId === '__new__') return [];
    const q = query.trim().toLowerCase();
    return terms
      .filter((t) => t.id !== displayId && !neighborIds.includes(t.id))
      .filter((t) => !q || t.name.toLowerCase().includes(q) || getChapter(t.chapter).name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [terms, displayId, neighborIds, query]);

  if (creating || editId) {
    return (
      <TermForm
        key={editId ?? 'new'}
        term={editId ? term : null}
        onCancel={stopEdit}
        onSave={(data) => {
          if (editId && term) updateTerm(term.id, data);
          else addTerm(data);
        }}
        onDelete={editId && term ? () => removeTerm(term.id) : undefined}
      />
    );
  }

  if (!term) {
    return (
      <aside className="kpanel">
        <div className="kp-head">
          <h3>词条</h3>
          <button className="btn sm" onClick={startCreate}>
            <Icon name="plus" size={14} />
            新建
          </button>
        </div>
        <div className="kp-empty">
          <Icon name="graph" size={30} />
          <p>在右侧图谱上 <b>悬停</b> 看词条预览，<b>点击</b> 固定查看与编辑。</p>
        </div>
      </aside>
    );
  }

  const chapter = getChapter(term.chapter);

  return (
    <aside className="kpanel">
      <div className="kp-head">
        <h3>词条</h3>
        <button className="btn sm" onClick={startCreate}>
          <Icon name="plus" size={14} />
          新建
        </button>
      </div>

      <div className="kp-scroll scroll">
        <div className="kp-term">
          <div className="kp-titlebar">
            <span className="kp-chip" style={{ background: chapter.color }}>
              {chapter.name}
            </span>
            {hoverId && hoverId !== selectedId && <span className="kp-flag">悬停预览</span>}
          </div>
          <h2 className="kp-name">{term.name}</h2>
          <p className="kp-summary">{term.summary}</p>
          <div className="kp-body">
            <Markdown>{term.body}</Markdown>
          </div>

          <div className="kp-actions">
            <button className="btn sm" onClick={() => startEdit(term.id)}>
              <Icon name="edit" size={13} />
              编辑
            </button>
            <button
              className="btn sm ghost"
              onClick={() => {
                if (confirm(`确定删除词条「${term.name}」？相关关联也会移除。`)) removeTerm(term.id);
              }}
            >
              <Icon name="trash" size={13} />
              删除
            </button>
          </div>
        </div>

        <div className="kp-rel">
          <div className="kp-rel-head">关联词条（{neighbors.length}）</div>
          <div className="kp-chips">
            {neighbors.length === 0 && <span className="kp-none">暂无关联，下面添加</span>}
            {neighbors.map((n) => (
              <span key={n.id} className="kp-relchip" style={{ borderColor: getChapter(n.chapter).color }}>
                <button className="link" onClick={() => select(n.id)} title="查看该词条">
                  {n.name}
                </button>
                <button
                  className="x"
                  title="移除关联"
                  onClick={() => removeEdge(term.id, n.id)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="kp-add">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索并添加关联词条…"
            />
            {query.trim() && addable.length > 0 && (
              <div className="kp-addlist">
                {addable.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      addEdge(term.id, n.id);
                      setQuery('');
                    }}
                  >
                    <span className="dot" style={{ background: getChapter(n.chapter).color }} />
                    {n.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

function TermForm({
  term,
  onCancel,
  onSave,
  onDelete,
}: {
  term: ReturnType<typeof useKnowledge.getState>['terms'][number] | null;
  onCancel: () => void;
  onSave: (data: { name: string; chapter: string; summary: string; body: string }) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(term?.name ?? '');
  const [chapter, setChapter] = useState(term?.chapter ?? CHAPTERS[0].id);
  const [summary, setSummary] = useState(term?.summary ?? '');
  const [body, setBody] = useState(term?.body ?? '');

  const canSave = name.trim().length > 0 && summary.trim().length > 0 && body.trim().length > 0;

  return (
    <aside className="kpanel">
      <div className="kp-head">
        <h3>{term ? '编辑词条' : '新建词条'}</h3>
        <button className="btn sm ghost" onClick={onCancel}>
          取消
        </button>
      </div>
      <div className="kp-form scroll">
        <label>
          名称
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：黎曼可积" />
        </label>
        <label>
          章节
          <select value={chapter} onChange={(e) => setChapter(e.target.value)}>
            {CHAPTERS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          一句话简介
          <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="用于图谱悬停预览" />
        </label>
        <label>
          正文（支持 Markdown 与 LaTeX，$a^2+b^2=c^2$）
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            placeholder={'用 $$...$$ 写块级公式，如：\n\n$$\\int_a^b f(x)\\,\\mathrm{d}x=F(b)-F(a)$$'}
          />
        </label>
        <div className="kp-form-actions">
          {onDelete && (
            <button
              className="btn ghost danger"
              onClick={() => {
                if (confirm('确定删除该词条？')) onDelete();
              }}
            >
              <Icon name="trash" size={13} />
              删除
            </button>
          )}
          <span className="grow" />
          <button className="btn primary" disabled={!canSave} onClick={() => onSave({ name, chapter, summary, body })}>
            保存
          </button>
        </div>
      </div>
    </aside>
  );
}
