/** 知识树领域模型：章节、词条、图谱节点与边。 */

export interface Chapter {
  /** 稳定 id，用于着色与归类。 */
  id: string;
  /** 章节中文名，显示在图例与词条卡片上。 */
  name: string;
  /** 主题色（HEX），同一章节点共享。 */
  color: string;
}

export interface Term {
  id: string;
  /** 词条名，如「拉格朗日中值定理」。 */
  name: string;
  /** 所属章节 id。 */
  chapter: string;
  /** 一句话简介，用于 hover 预览与图谱副标题。 */
  summary: string;
  /**
   * 正文，Markdown + LaTeX（行内 $..$，块级 $$..$$）。
   * 在 seed.ts 里用 String.raw 书写，保留反斜杠不被转义。
   */
  body: string;
}

/** 跨章节关联：把两个词条连成一条边。 */
export interface CrossLink {
  from: string;
  to: string;
  /** 关系简述，hover 边时可显示。 */
  note?: string;
}

export interface GraphNode {
  id: string;
  name: string;
  chapter: string;
  color: string;
  summary: string;
  /** 出/入度合计，用于决定节点大小。 */
  degree: number;
  /** d3-force 运行期坐标。 */
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  /** 固定坐标（拖拽后）。 */
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: string;
  target: string;
  note?: string;
}
