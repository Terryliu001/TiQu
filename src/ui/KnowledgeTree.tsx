/**
 * 知识树主视图：三栏。
 * 左：词条面板（hover 预览 / 选中查看 / 编辑 / 关联）
 * 中：关系图谱（d3-force 自绘）+ 章节图例 + 操作提示
 * 右：针对选中词条的 AI 对话
 * 不依赖打开 PDF，独立成第三种视图。
 */
import { useEffect } from 'react';
import { useKnowledge } from '../store/knowledge';
import { CHAPTERS } from '../core/knowledge/seed';
import { KnowledgeGraph } from './KnowledgeGraph';
import { KnowledgePanel } from './KnowledgePanel';
import { TermChat } from './TermChat';

export function KnowledgeTree() {
  const terms = useKnowledge((s) => s.terms);
  const links = useKnowledge((s) => s.links);
  const load = useKnowledge((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="kview">
      <KnowledgePanel />

      <div className="kcenter">
        <div className="kg-legend">
          {CHAPTERS.map((c) => (
            <span key={c.id} className="lg" title={c.name}>
              <span className="dot" style={{ background: c.color }} />
              {c.name}
            </span>
          ))}
        </div>

        <KnowledgeGraph terms={terms} links={links} />

        <div className="kg-hint">
          滚轮缩放 · 拖空白平移 · 拖节点移动 · 悬停看预览 · 点击选中
        </div>
      </div>

      <TermChat />
    </div>
  );
}
