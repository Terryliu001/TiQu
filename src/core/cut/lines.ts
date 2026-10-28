/**
 * 片段 → 行 → 栏。切题的唯一输入是"行"，不是 PDF 的原始片段。
 *
 * 为什么必须聚行：pdf.js 给的是 PDF 内部排版块，真卷一页几百个片段，
 * `12.` 会被拆成 `1` / `2` / `.`，题号正则跑在片段上几乎不可能命中。
 *
 * 三条口径（照搬刷起 `text_line.dart` / `columns.dart`，都是真卷调出来的）：
 * 1. 按片段垂直中心升序，与当前行中心差 ≤ 0.5×行高 归入该行；
 * 2. 行内按 x 升序拼接，间距超过 0.8×字号 补一个空格；
 * 3. 行字号取片段高度的**下四分位**——多行公式会把某个片段撑高 2–3 倍，
 *    中位数会被整体带偏，下四分位只要有四分之一的片段正常就能估准。
 */
import type { Rect, TextLine, TextPiece } from '../../types';
import { matchQuestionMark } from './pattern';

export interface ColumnBand {
  left: number;
  right: number;
}

export interface PdfTextItemLike {
  str: string;
  width: number;
  height: number;
  transform: number[];
  fontName?: string;
  hasEOL?: boolean;
}

export function rectFromLTRB(left: number, top: number, right: number, bottom: number): Rect {
  return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

export function rectCenterY(r: Rect): number {
  return r.top + r.height / 2;
}

export function rectCenterX(r: Rect): number {
  return r.left + r.width / 2;
}

export function rectRight(r: Rect): number {
  return r.left + r.width;
}

export function rectBottom(r: Rect): number {
  return r.top + r.height;
}

export function isEmptyRect(r: Rect): boolean {
  return r.width <= 0 || r.height <= 0;
}

/**
 * pdf.js 的 TextItem → 本项目片段。
 *
 * @param transform 页面 viewport 的 transform（scale = 1 时单位是 pt）
 * @param viewportHeight 视口高度，用于把 y 翻成"左上原点、向下为正"
 */
export function piecesFromTextItems(
  items: PdfTextItemLike[],
  transform: number[],
  viewportHeight: number,
): TextPiece[] {
  const out: TextPiece[] = [];
  for (const item of items) {
    const text = item.str ?? '';
    if (!text.trim()) continue;

    // 把文本矩阵乘进视口矩阵，得到基线原点。
    const m = multiplyMatrix(transform, item.transform);
    const fontHeight = Math.hypot(m[2], m[3]) || item.height || 10;
    const width = Math.max(item.width || 0, fontHeight * 0.25);
    const left = m[4];
    const baseline = m[5];
    const top = baseline - fontHeight;
    const rect = rectFromLTRB(left, top, left + width, baseline);
    if (isEmptyRect(rect)) continue;

    out.push({ text, rect, fontSize: fontHeight });
  }
  return out;
}

/** 2D 仿射矩阵乘法（pdf.js Util.transform 的等价实现，避免把 pdfjs 拖进纯函数层）。 */
function multiplyMatrix(m1: number[], m2: number[]): number[] {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

/** 一箱被多少比例的行覆盖就算"有字"。15% 是实测值，见下。 */
const BLOCKED_ROW_SHARE = 0.15;
const ROW_BIN_HEIGHT = 8;
const MIN_GUTTER_RATIO = 0.025;

/**
 * 检测分栏。单栏返回一个覆盖整页的 band。
 *
 * 判据：某一列若被 ≥15% 的文字行覆盖就算"有字"；连续无字带宽度
 * ≥ max(10pt, 页宽 2.5%)、中心落在页宽 35%–65%、两侧都有料 → 栏间距。
 *
 * 为什么 15%：双栏卷的居中标题常常横跨栏间距，但它只占 2–3 行（<5%），
 * 不会把空白带填满；而真正的栏间距是"整页这一列都没字"（0%）。
 */
export function detectColumns(rects: Rect[], pageWidth: number): ColumnBand[] {
  const single: ColumnBand[] = [{ left: 0, right: pageWidth }];
  if (pageWidth <= 0) return single;

  const usable = rects.filter((r) => !isEmptyRect(r));
  if (usable.length < 6) return single;

  const bins = Math.ceil(pageWidth);
  const rows = new Map<number, Rect[]>();
  for (const rect of usable) {
    const row = Math.floor(rectCenterY(rect) / ROW_BIN_HEIGHT);
    const list = rows.get(row);
    if (list) list.push(rect);
    else rows.set(row, [rect]);
  }
  const rowCount = rows.size;
  if (rowCount < 4) return single;

  const blockThreshold = Math.ceil(rowCount * BLOCKED_ROW_SHARE);
  const coveredRows = new Int32Array(bins);
  const touched = new Uint8Array(bins);

  for (const row of rows.values()) {
    touched.fill(0);
    for (const rect of row) {
      const from = clampInt(Math.floor(rect.left), 0, bins - 1);
      const to = clampInt(Math.ceil(rectRight(rect)), 0, bins);
      for (let i = from; i < to; i++) touched[i] = 1;
    }
    for (let i = 0; i < bins; i++) if (touched[i]) coveredRows[i]++;
  }

  const minGutter = Math.max(pageWidth * MIN_GUTTER_RATIO, 10);

  // 找最宽的内部无字带，且必须居中。
  let bestStart = -1;
  let bestEnd = -1;
  let i = 0;
  while (i < bins) {
    if (coveredRows[i] >= blockThreshold) {
      i++;
      continue;
    }
    let j = i;
    while (j < bins && coveredRows[j] < blockThreshold) j++;
    if (i > 0 && j < bins) {
      const width = j - i;
      const center = (i + j) / 2;
      const centered = center > pageWidth * 0.35 && center < pageWidth * 0.65;
      if (width >= minGutter && centered) {
        if (bestStart < 0 || j - i > bestEnd - bestStart) {
          bestStart = i;
          bestEnd = j;
        }
      }
    }
    i = j;
  }
  if (bestStart < 0) return single;

  const gutterLeft = bestStart;
  const gutterRight = bestEnd;

  let leftCount = 0;
  let rightCount = 0;
  let leftMin = Infinity;
  let leftMax = 0;
  let rightMin = Infinity;
  let rightMax = 0;
  for (const rect of usable) {
    if (rectRight(rect) <= gutterLeft) {
      leftCount++;
      leftMin = Math.min(leftMin, rect.left);
      leftMax = Math.max(leftMax, rectRight(rect));
    } else if (rect.left >= gutterRight) {
      rightCount++;
      rightMin = Math.min(rightMin, rect.left);
      rightMax = Math.max(rightMax, rectRight(rect));
    }
  }

  const enoughLeft = leftCount >= usable.length * 0.12;
  const enoughRight = rightCount >= usable.length * 0.12;
  const wideEnough = leftMax - leftMin >= pageWidth * 0.2 && rightMax - rightMin >= pageWidth * 0.2;
  if (!enoughLeft || !enoughRight || !wideEnough) return single;

  return [
    { left: 0, right: gutterLeft },
    { left: gutterRight, right: pageWidth },
  ];
}

export function columnIndexOf(centerX: number, columns: ColumnBand[]): number {
  for (let i = 0; i < columns.length; i++) {
    if (centerX >= columns[i].left && centerX < columns[i].right) return i;
  }
  return 0;
}

export function groupByColumn(pieces: TextPiece[], columns: ColumnBand[]): TextPiece[][] {
  const groups: TextPiece[][] = columns.map(() => []);
  for (const piece of pieces) {
    groups[columnIndexOf(rectCenterX(piece.rect), columns)].push(piece);
  }
  return groups;
}

/** 片段 → 行。同一条基线上的碎片合并成一句。 */
export function clusterLines(
  pieces: TextPiece[],
  opts: { tolerance?: number; spaceGapRatio?: number; column?: number } = {},
): TextLine[] {
  const tolerance = opts.tolerance ?? 0.5;
  const spaceGapRatio = opts.spaceGapRatio ?? 0.8;
  const column = opts.column ?? 0;

  const usable = pieces.filter((p) => p.text.trim() && !isEmptyRect(p.rect));
  if (usable.length === 0) return [];

  const sorted = [...usable].sort((a, b) => rectCenterY(a.rect) - rectCenterY(b.rect));
  const rows: Row[] = [];
  for (const piece of sorted) {
    if (rows.length > 0) {
      const last = rows[rows.length - 1];
      const ref = Math.max(piece.fontSize, last.fontSize());
      if (Math.abs(rectCenterY(piece.rect) - last.centerY()) <= ref * tolerance) {
        last.add(piece);
        continue;
      }
    }
    rows.push(new Row(piece));
  }
  return rows.map((row) => row.toLine(spaceGapRatio, column));
}

class Row {
  private pieces: TextPiece[];
  private left: number;
  private top: number;
  private right: number;
  private bottom: number;

  constructor(first: TextPiece) {
    this.pieces = [first];
    this.left = first.rect.left;
    this.top = first.rect.top;
    this.right = rectRight(first.rect);
    this.bottom = rectBottom(first.rect);
  }

  centerY(): number {
    return (this.top + this.bottom) / 2;
  }

  fontSize(): number {
    return this.bottom - this.top;
  }

  add(piece: TextPiece) {
    this.pieces.push(piece);
    this.left = Math.min(this.left, piece.rect.left);
    this.top = Math.min(this.top, piece.rect.top);
    this.right = Math.max(this.right, rectRight(piece.rect));
    this.bottom = Math.max(this.bottom, rectBottom(piece.rect));
  }

  toLine(spaceGapRatio: number, column: number): TextLine {
    const ordered = [...this.pieces].sort((a, b) => a.rect.left - b.rect.left);
    const fontSize = fontSizeOf(ordered);
    let text = '';
    let previous: TextPiece | null = null;
    for (const piece of ordered) {
      if (previous) {
        const gap = piece.rect.left - rectRight(previous.rect);
        if (gap > fontSize * spaceGapRatio) text += ' ';
      }
      text += piece.text.trim();
      previous = piece;
    }
    return {
      text: text.trim(),
      rect: rectFromLTRB(this.left, this.top, this.right, this.bottom),
      fontSize,
      column,
      pieces: ordered,
    };
  }
}

/** 行字号 = 片段高度的下四分位（不是中位数、不是最大值）。 */
function fontSizeOf(ordered: TextPiece[]): number {
  const heights = ordered
    .map((p) => (p.fontSize > 0 ? p.fontSize : p.rect.height))
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  if (heights.length === 0) return 0;
  return heights[Math.floor((heights.length - 1) * 0.25)];
}

const PAGE_NUMBER_RE = /^[\s\-—–©第]*(\d{1,3}|第\s*\d{1,3}\s*页([\s，,、/／]*共?\s*\d{1,3}\s*页?)?|\d{1,3}\s*[/／]\s*\d{1,3}\s*页?|page\s*\d{1,3})[\s\-—–页]*$/i;
const TAIL_PAGE_NUMBER_RE = /\d{1,4}\s*[/／]\s*\d{1,4}\s*$/;
const SENTENCE_PUNCTUATION_RE = /[，。？！；：]/;

/**
 * 剔除页眉/页脚。
 *
 * 不能无脑切掉上下 5%：密排卷子的第一题常压在上边界带里。判定三条：
 * - 页码形态（`12` / `第 3 页` / `3/20`）→ 删（不论在不在带内）；
 * - 带内但看着像题号行 → 保留；
 * - 带内且是长正文（>30 字且有句读）→ 保留；
 * - 其余带内的 → 删。
 */
export function dropMargins(lines: TextLine[], pageHeight: number, bandRatio = 0.05): TextLine[] {
  if (pageHeight <= 0) return lines;
  const band = pageHeight * bandRatio;
  return lines.filter((line) => {
    if (PAGE_NUMBER_RE.test(line.text) || TAIL_PAGE_NUMBER_RE.test(line.text)) return false;
    const centerY = rectCenterY(line.rect);
    const inBand = centerY < band || centerY > pageHeight - band;
    if (!inBand) return true;
    if (matchQuestionMark(line.text)) return true;
    return line.text.length > 30 && SENTENCE_PUNCTUATION_RE.test(line.text);
  });
}

/** 文档顺序：栏 → y。切题前必须排好。 */
export function sortLines(lines: TextLine[]): TextLine[] {
  return [...lines].sort((a, b) => (a.column - b.column) || (a.rect.top - b.rect.top));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
