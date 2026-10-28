/**
 * 层级判定：把题号分成大题（1）/ 小题（2）两级。
 *
 * 为什么"样式优先、字号兜底"：真卷实测，pdfium 会把多行公式报成一个超高对象，
 * "字号跳变 ≥1.15 倍即大题"会把它判反。所以顺序是：
 *   1. 样式：中文数字 / 罗马数字 / `【例 x】` → 大题；`（3）` / `①` → 小题；
 *   2. 两级并存：既有 `1.` 又有 `（1）` → 前者大题（最常见的小节结构）；
 *   3. 字号：只在样式全同、没法区分时，才看字号断层；
 *   4. 都不成立 → 全卷同级。
 *
 * 层级只决定"谁切断谁的区域"，判错只会让框大小不对，不会丢题。
 */
import type { MarkKind } from '../../types';
import { isArabicKind, prefersMajor } from './pattern';

export interface Leveling {
  levels: number[];
  basis: 'style' | 'mixed' | 'font' | 'none';
  threshold?: number;
  majorCount: number;
  minorCount: number;
}

interface Gap {
  lower: number;
  upper: number;
  ratio: number;
}

export function assignLevels(
  kinds: MarkKind[],
  fontSizes: number[],
  opts: { fontJumpRatio?: number; allowFontFallback?: boolean } = {},
): Leveling {
  const fontJumpRatio = opts.fontJumpRatio ?? 1.15;
  const allowFontFallback = opts.allowFontFallback ?? true;
  const count = kinds.length;
  if (count === 0) return { levels: [], basis: 'none', majorCount: 0, minorCount: 0 };

  const tally = (levels: number[], basis: Leveling['basis'], threshold?: number): Leveling => ({
    levels,
    basis,
    threshold,
    majorCount: levels.filter((v) => v === 1).length,
    minorCount: levels.filter((v) => v === 2).length,
  });

  // 1) 样式直接给结论
  if (kinds.some(prefersMajor)) {
    return tally(kinds.map((k) => (prefersMajor(k) ? 1 : 2)), 'style');
  }

  // 2) `1.` 与 `（1）` 并存 → 前者大题
  const hasArabic = kinds.some(isArabicKind);
  const hasParen = kinds.includes('parenArabic');
  if (hasArabic && hasParen) {
    return tally(kinds.map((k) => (isArabicKind(k) ? 1 : 2)), 'mixed');
  }

  // 3) 字号断层（扫描件不启用：行高是像素估的，倾斜/上下标会让同级差 1.3 倍）
  const gap = allowFontFallback ? largestGap(fontSizes) : null;
  if (gap && gap.ratio >= fontJumpRatio) {
    return tally(fontSizes.map((size) => (size >= gap.upper ? 1 : 2)), 'font', gap.upper);
  }

  // 4) 全卷同级
  return tally(new Array(count).fill(2), 'none');
}

function largestGap(sizes: number[]): Gap | null {
  const distinct = Array.from(new Set(sizes.filter((v) => v > 0))).sort((a, b) => a - b);
  if (distinct.length < 2) return null;
  let best: Gap | null = null;
  for (let i = 1; i < distinct.length; i++) {
    const lower = distinct[i - 1];
    const upper = distinct[i];
    if (lower <= 0) continue;
    const ratio = upper / lower;
    if (!best || ratio > best.ratio) best = { lower, upper, ratio };
  }
  return best;
}
