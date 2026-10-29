/**
 * 由词条 + 边集合构建力导向图谱的节点与边。
 *
 * 默认边（baseEdges）来源两类：
 *  1. 同章内「相邻成链」——保证每章内部连通；
 *  2. CROSS_LINKS——跨章节概念桥。
 * 知识树仓库会把用户对边的增删作为覆盖层叠加到默认边上，再调用 buildGraph。
 */
import { CHAPTERS, TERMS, CROSS_LINKS, getChapter } from './seed';
import type { GraphLink, GraphNode, Term } from './types';

const keyOf = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** 默认边集合（不含坐标）。用户删除的边由仓库按 key 剔除。 */
export function baseEdges(): GraphLink[] {
  const byChapter = new Map<string, Term[]>();
  for (const term of TERMS) {
    const list = byChapter.get(term.chapter) ?? [];
    list.push(term);
    byChapter.set(term.chapter, list);
  }

  const links: GraphLink[] = [];
  const seen = new Set<string>();
  const addLink = (source: string, target: string, note?: string) => {
    if (source === target) return;
    const key = keyOf(source, target);
    if (seen.has(key)) return;
    seen.add(key);
    links.push({ source, target, note });
  };

  for (const list of byChapter.values()) {
    for (let i = 1; i < list.length; i++) addLink(list[i - 1].id, list[i].id);
  }
  for (const link of CROSS_LINKS) addLink(link.from, link.to, link.note);
  return links;
}

export interface Graph {
  nodes: GraphNode[];
  links: GraphLink[];
}

export function buildGraph(terms: Term[], links: GraphLink[]): Graph {
  // 章节在环上均匀排布，作为簇中心，给节点一个合理的初始散布
  const centers = new Map<string, { cx: number; cy: number }>();
  const R = 520;
  CHAPTERS.forEach((c, i) => {
    const angle = (i / CHAPTERS.length) * Math.PI * 2;
    centers.set(c.id, { cx: Math.cos(angle) * R, cy: Math.sin(angle) * R });
  });

  const nodes: GraphNode[] = terms.map((term) => {
    const chapter = getChapter(term.chapter);
    const center = centers.get(term.chapter) ?? { cx: 0, cy: 0 };
    const jitter = () => (Math.random() - 0.5) * 150;
    return {
      id: term.id,
      name: term.name,
      chapter: term.chapter,
      color: chapter.color,
      summary: term.summary,
      degree: 0,
      x: center.cx + jitter(),
      y: center.cy + jitter(),
    };
  });

  const ids = new Set(nodes.map((n) => n.id));
  const validLinks = links.filter((l) => ids.has(l.source) && ids.has(l.target));
  for (const link of validLinks) {
    const s = nodes.find((n) => n.id === link.source);
    const t = nodes.find((n) => n.id === link.target);
    if (s) s.degree += 1;
    if (t) t.degree += 1;
  }

  return { nodes, links: validLinks };
}
