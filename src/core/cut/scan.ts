/**
 * 扫描件（无文字层）的版面切题。
 *
 * 不依赖 OCR：题号在字形统计上有很强的指纹——
 *   数字/括号 = 窄而高的连通域；汉字 = 宽而密；中文序号 = 宽扁横画。
 * 认出"这一行以题号开头"之后，挂一个 forcedMark 到行上，复用同一套切分算法。
 *
 * 两个必须按顺序做的原因（真机踩出来的）：
 * 1. **先分栏再聚行**：双栏页左右共用基线，先聚行会把两栏拼成横跨整页的一行。
 * 2. **字高从原始行段求**：合并上下标会把两行并成 2 倍高的块，中位数被带偏，
 *    题号阈值一起放大，最后一个题号都认不出来。
 */

import type { PageLines, TextLine } from '../../types';
import { rectFromLTRB, rectRight } from './lines';
import type { QuestionMark } from '../../types';

export interface ScanOptions {
  /** 亮度低于它算"墨"（0 黑 255 白）。扫描件背景发灰，165 是实测值。 */
  inkThreshold?: number;
  /** 一行里暗像素占比低于它算空白行。 */
  rowInkRatio?: number;
  /** 列墨量低于页高这个比例算"无字列"（找栏间距用）。 */
  columnInkRatio?: number;
}

const DEFAULTS: Required<ScanOptions> = {
  inkThreshold: 165,
  rowInkRatio: 0.008,
  columnInkRatio: 0.005,
};

interface Band {
  left: number;
  right: number;
}

interface RowSeg {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** 分析一页扫描图。返回的 line.text 恒为空，题号在 forcedMark 上。 */
export function analyzeScanPage(
  bitmap: HTMLCanvasElement,
  pageIndex: number,
  scale: number,
  opts: ScanOptions = {},
): PageLines {
  const options = { ...DEFAULTS, ...opts };
  const ctx = bitmap.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('无法读取画布像素');
  const { width, height } = bitmap;
  const image = ctx.getImageData(0, 0, width, height).data;

  // 二值化：1 = 墨。灰度用整数近似，比 toFixed 快。
  const ink = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < ink.length; i++, p += 4) {
    const gray = (image[p] * 299 + image[p + 1] * 587 + image[p + 2] * 114) / 1000;
    if (gray < options.inkThreshold) ink[i] = 1;
  }

  const bands = detectBands(ink, width, height, options);
  const lines: TextLine[] = [];

  bands.forEach((band, column) => {
    const segs = findRowSegments(ink, width, band, height, options);
    const em = estimateEm(segs);
    if (em <= 0) return;

    // 页边距：取"最左的足够大的簇"，不是最左、也不是众数。
    // 选择题的选项行往往比题干行多，按众数会选中选项缩进，把 A/B/C/D 全当题号。
    const marginPx = dominantLeft(segs, em);

    for (const seg of segs) {
      const unit = em;
      if (seg.bottom - seg.top < unit * 0.35) continue;
      if (seg.right - seg.left < unit * 0.8) continue;

      const lead = readLeadToken(ink, width, seg, unit);
      const looksLikeMark = lead !== null && seg.left <= marginPx + unit * 1.2;
      // 题号后必须有正文：孤零零的编号是页码或装饰。
      const hasBody = seg.right - (lead?.right ?? seg.left) > unit * 1.2;

      const mark: QuestionMark | null =
        looksLikeMark && hasBody
          ? {
              label: '',
              kind: lead?.kind === 'paren' ? 'parenArabic' : 'arabic',
              rest: '内容',
              number: null,
            }
          : null;

      lines.push({
        text: '',
        rect: rectFromLTRB(seg.left / scale, seg.top / scale, seg.right / scale, seg.bottom / scale),
        fontSize: unit / scale,
        column,
        forcedMark: mark,
        pieces: [],
      });
    }
  });

  return {
    pageIndex,
    width: width / scale,
    height: height / scale,
    lines,
  };
}

/** 找栏：连续"无字列"构成栏间距，要求居中且够宽。 */
function detectBands(
  ink: Uint8Array,
  width: number,
  height: number,
  options: Required<ScanOptions>,
): Band[] {
  const single: Band[] = [{ left: 0, right: width }];
  const colInk = new Int32Array(width);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      if (ink[rowOffset + x]) colInk[x]++;
    }
  }
  const threshold = height * options.columnInkRatio;
  const minGutter = Math.max(10, width * 0.025);

  let bestStart = -1;
  let bestEnd = -1;
  let x = 0;
  while (x < width) {
    if (colInk[x] >= threshold) {
      x++;
      continue;
    }
    let j = x;
    while (j < width && colInk[j] < threshold) j++;
    if (x > 0 && j < width) {
      const w = j - x;
      const center = (x + j) / 2;
      if (w >= minGutter && center > width * 0.35 && center < width * 0.65) {
        if (bestStart < 0 || j - x > bestEnd - bestStart) {
          bestStart = x;
          bestEnd = j;
        }
      }
    }
    x = j;
  }
  if (bestStart < 0) return single;
  return [
    { left: 0, right: bestStart },
    { left: bestEnd, right: width },
  ];
}

/** 栏内逐行找行段，合并上下标，丢掉横线与噪点。 */
function findRowSegments(
  ink: Uint8Array,
  width: number,
  band: Band,
  height: number,
  options: Required<ScanOptions>,
): RowSeg[] {
  const bandWidth = band.right - band.left;
  const rowHasInk = new Uint8Array(height);
  const rowLeft = new Int32Array(height).fill(-1);
  const rowRight = new Int32Array(height).fill(-1);
  const rowInkCount = new Int32Array(height);

  for (let y = 0; y < height; y++) {
    const offset = y * width;
    let count = 0;
    let left = -1;
    let right = -1;
    for (let x = band.left; x < band.right; x++) {
      if (!ink[offset + x]) continue;
      count++;
      if (left < 0) left = x;
      right = x;
    }
    // 左右边界只认"有一定高度的墨迹列"：1px 噪点会把选项行拉到正文左边。
    if (count >= Math.max(2, bandWidth * options.rowInkRatio)) {
      rowHasInk[y] = 1;
      rowLeft[y] = left;
      rowRight[y] = right;
      rowInkCount[y] = count;
    }
  }

  // 行距：空白带长度的下四分位（段间距远大于行距，中位数会偏大）。
  const gaps: number[] = [];
  let run = 0;
  for (let y = 0; y < height; y++) {
    if (rowHasInk[y]) {
      if (run > 0) gaps.push(run);
      run = 0;
    } else {
      run++;
    }
  }
  const lineGap = quantile(gaps, 0.25) || 3;

  const raw: RowSeg[] = [];
  let start = -1;
  let lastInkRow = -1;
  for (let y = 0; y <= height; y++) {
    const has = y < height && rowHasInk[y] === 1;
    if (has) {
      if (start < 0) start = y;
      lastInkRow = y;
    } else if (start >= 0 && (y >= height || y - lastInkRow > Math.max(2, lineGap * 0.6))) {
      raw.push(buildSeg(start, lastInkRow, rowLeft, rowRight));
      start = -1;
    }
  }

  // 合并上下标：间距小且有一段明显更矮。
  const merged: RowSeg[] = [];
  for (const seg of raw) {
    const prev = merged[merged.length - 1];
    if (prev) {
      const gap = seg.top - prev.bottom;
      const prevH = prev.bottom - prev.top;
      const curH = seg.bottom - seg.top;
      const shorter = Math.min(prevH, curH);
      const taller = Math.max(prevH, curH);
      if (gap <= taller * 0.45 && shorter < taller * 0.6) {
        prev.top = Math.min(prev.top, seg.top);
        prev.bottom = Math.max(prev.bottom, seg.bottom);
        prev.left = Math.min(prev.left, seg.left);
        prev.right = Math.max(prev.right, seg.right);
        continue;
      }
    }
    merged.push({ ...seg });
  }

  // 丢掉横线（很扁）、噪点（很矮）。
  return merged.filter((seg) => {
    const h = seg.bottom - seg.top;
    const w = seg.right - seg.left;
    if (h < 4) return false;
    if (w > bandWidth * 0.9 && h < w * 0.03) return false;
    return true;
  });
}

function buildSeg(
  top: number,
  bottom: number,
  rowLeft: Int32Array,
  rowRight: Int32Array,
): RowSeg {
  let left = Infinity;
  let right = -Infinity;
  for (let y = top; y <= bottom; y++) {
    if (rowLeft[y] >= 0) left = Math.min(left, rowLeft[y]);
    if (rowRight[y] >= 0) right = Math.max(right, rowRight[y]);
  }
  return { top, bottom, left: Number.isFinite(left) ? left : 0, right: Number.isFinite(right) ? right : 0 };
}

/** 字高 = 行段高度中位数（用原始段求，不用合并后的）。 */
function estimateEm(segs: RowSeg[]): number {
  const heights = segs.map((s) => s.bottom - s.top).filter((h) => h > 0);
  if (heights.length === 0) return 0;
  heights.sort((a, b) => a - b);
  return heights[Math.floor(heights.length / 2)];
}

/** 最左的"足够大"的簇：不是最左，也不是众数。 */
function dominantLeft(segs: RowSeg[], em: number): number {
  if (segs.length === 0) return 0;
  const tolerance = em;
  const clusters: { x: number; count: number }[] = [];
  for (const seg of segs) {
    const hit = clusters.find((c) => Math.abs(c.x - seg.left) <= tolerance);
    if (hit) {
      hit.count++;
    } else {
      clusters.push({ x: seg.left, count: 1 });
    }
  }
  if (clusters.length === 0) return 0;
  const maxCount = Math.max(...clusters.map((c) => c.count));
  clusters.sort((a, b) => a.x - b.x);
  const need = Math.max(3, maxCount * 0.3);
  return clusters.find((c) => c.count >= need)?.x ?? clusters[0].x;
}

interface LeadToken {
  right: number;
  kind: 'arabic' | 'paren';
}

/**
 * 行首题号：在 max(10, 3.4em) 窗口里找 8 邻接连通域，按形状分类。
 *
 * 只判"像不像题号"，不读具体数字——扫描件没有 OCR，读数字要靠字形模板，
 * 收益低；题号由切分后的序号补上。
 */
function readLeadToken(ink: Uint8Array, width: number, seg: RowSeg, em: number): LeadToken | null {
  const windowWidth = Math.max(10, Math.round(em * 3.4));
  const left = seg.left;
  const right = Math.min(seg.right, left + windowWidth);
  const top = seg.top;
  const bottom = seg.bottom;
  const w = right - left;
  const h = bottom - top;
  if (w <= 2 || h <= 2) return null;

  const visited = new Uint8Array(w * h);
  const boxes: { x0: number; y0: number; x1: number; y1: number; ink: number }[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (visited[idx]) continue;
      if (!ink[(top + y) * width + (left + x)]) continue;

      // BFS 收集连通域
      const stack = [idx];
      visited[idx] = 1;
      let x0 = x;
      let x1 = x;
      let y0 = y;
      let y1 = y;
      let count = 0;
      while (stack.length > 0) {
        const cur = stack.pop()!;
        const cx = cur % w;
        const cy = (cur - cx) / w;
        count++;
        x0 = Math.min(x0, cx);
        x1 = Math.max(x1, cx);
        y0 = Math.min(y0, cy);
        y1 = Math.max(y1, cy);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const nIdx = ny * w + nx;
            if (visited[nIdx]) continue;
            if (!ink[(top + ny) * width + (left + nx)]) continue;
            visited[nIdx] = 1;
            stack.push(nIdx);
          }
        }
      }
      boxes.push({ x0, y0, x1, y1, ink: count });
    }
  }
  if (boxes.length === 0) return null;

  boxes.sort((a, b) => a.x0 - b.x0);
  const first = boxes[0];
  const bw = (first.x1 - first.x0 + 1) / em;
  const bh = (first.y1 - first.y0 + 1) / em;
  const density = first.ink / Math.max(1, (first.x1 - first.x0 + 1) * (first.y1 - first.y0 + 1));

  const narrowTall = bw >= 0.06 && bw <= 0.55 && bh >= 0.35 && bh <= 0.95 && density <= 0.25;
  const horizontal = bw >= 0.55 && bh <= 0.45;
  if (!narrowTall && !horizontal) return null;

  // 数字 + 小数点/顿号 → arabic；括号包住的数字 → paren。
  let cursor = first.x1;
  let paren = false;
  let digits = 1;
  for (let i = 1; i < boxes.length && i < 5; i++) {
    const box = boxes[i];
    if (box.x0 - cursor > em * 0.6) break;
    const wRatio = (box.x1 - box.x0 + 1) / em;
    const hRatio = (box.y1 - box.y0 + 1) / em;
    // 右括号：窄高、贴着前一个数字
    if (wRatio < 0.4 && hRatio > 0.5 && box.x0 - cursor < em * 0.25) {
      paren = true;
      cursor = box.x1;
      break;
    }
    if (wRatio < 0.45 && hRatio < 0.3) {
      // 小数点 / 顿号 / 句点：题号到此结束
      cursor = box.x1;
      break;
    }
    if (wRatio < 0.55 && hRatio > 0.35) {
      digits++;
      cursor = box.x1;
      continue;
    }
    break;
  }

  if (horizontal && digits === 1) {
    // 中文序号（一、二、）：横画开头，后面必须紧跟顿号类的点
    return { right: cursor, kind: 'arabic' };
  }
  return { right: cursor, kind: paren ? 'paren' : 'arabic' };
}

function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q))];
}

export { rectRight };
