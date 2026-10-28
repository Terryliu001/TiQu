/** 全局数据契约。切题、渲染、AI、存储都只认这里的类型。 */

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type MarkKind =
  | 'arabic'
  | 'parenArabic'
  | 'circled'
  | 'thQuestion'
  | 'example'
  | 'cnNumeral'
  | 'roman';

export type QuestionKind = 'choice' | 'blank' | 'judge' | 'essay';

/** 从一行文字里识别出的题号。 */
export interface QuestionMark {
  label: string;
  kind: MarkKind;
  rest: string;
  number: number | null;
}

/** 印刷文字片段（pdf.js TextItem 转换后）。坐标单位是 pt，左上原点，y 向下。 */
export interface TextPiece {
  text: string;
  rect: Rect;
  fontSize: number;
}

/** 聚行后的一行文字。 */
export interface TextLine {
  text: string;
  rect: Rect;
  fontSize: number;
  column: number;
  /** 扫描件专用：版面算法猜出来的题号，直接挂在这里。 */
  forcedMark?: QuestionMark | null;
  pieces: TextPiece[];
}

export interface PageLines {
  pageIndex: number;
  width: number;
  height: number;
  lines: TextLine[];
}

/** 跨页题在本页上的一段。 */
export interface PageSlice {
  page: number;
  rect: Rect;
}

/** 一道题。ordinal 是文档顺序，1 起；大题也占序号。 */
export interface Question {
  id: string;
  ordinal: number;
  label: string;
  /** 1 = 大题（容器），2 = 小题。 */
  level: number;
  kind: QuestionKind;
  stem: string;
  slices: PageSlice[];
  confidence: number;
  fontSize: number;
  number: number | null;
  parentOrdinal: number | null;
  source: 'rule' | 'scan' | 'manual' | 'ai';
  /** 用户锁定的题不再被自动重切覆盖（当前只做标记与展示）。 */
  locked?: boolean;
}

export interface CutResult {
  questions: Question[];
  markCount: number;
  warnings: string[];
  /** 切题耗时，毫秒。 */
  elapsed: number;
}

/** 页面上的一道题（渲染用，已把跨页拆成多段）。 */
export interface QuestionOnPage {
  question: Question;
  slice: PageSlice;
  indexInPage: number;
}

export interface PageSize {
  index: number;
  width: number;
  height: number;
}

/** AI 消息。 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  /** 流式进行中 */
  streaming?: boolean;
  error?: string;
  at: number;
  /** 该轮附带的题面（用于气泡里回看） */
  attachLabel?: string;
}

export interface ProjectMeta {
  id: string;
  name: string;
  fileName: string;
  pageCount: number;
  sizeBytes: number;
  createdAt: number;
  updatedAt: number;
  cutSource: 'none' | 'text' | 'scan';
}
