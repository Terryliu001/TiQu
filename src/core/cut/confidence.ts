/**
 * 切题置信度。
 *
 *   conf = 0.45
 *        + 0.20 * boundary  // 下一题号是否同栏、间距是否合理
 *        + 0.15 * style     // 字号与同层级中位数是否一致
 *        + 0.10 * order     // 题号是否连续（允许跳 1 个）
 *        + 0.10 * text      // 题干是否有内容（8 字以上记满）
 *        - 0.20（来源是扫描件 / 版面推断）
 *
 * 三个分数都是 0..1 的连续值，不是"是/否"——"间距略大"只该扣一点，
 * 否则一个阈值就把 0.80 拽到 0.55，黄色框满天飞。
 *
 * 注意：本项目**不用置信度染色框**，只用左侧细条提示（框色一律中性）。
 */

export const GREEN_THRESHOLD = 0.8;
export const YELLOW_THRESHOLD = 0.55;

export type RegionGrade = 'green' | 'yellow' | 'red';

export function gradeOf(confidence: number): RegionGrade {
  if (confidence >= GREEN_THRESHOLD) return 'green';
  if (confidence >= YELLOW_THRESHOLD) return 'yellow';
  return 'red';
}

export interface ConfidenceSignals {
  boundary: number;
  style: number;
  order: number;
  text: number;
  fromScan?: boolean;
}

export function regionConfidence(s: ConfidenceSignals): number {
  let value = 0.45 + 0.2 * clamp01(s.boundary) + 0.15 * clamp01(s.style) + 0.1 * clamp01(s.order) + 0.1 * clamp01(s.text);
  if (s.fromScan) value -= 0.2;
  return clamp01(value);
}

/** 题号连续性：连续 1，跳 1 个 0.5，更多 0.2 / 0。 */
export function orderScore(current: number | null, previous: number | null): number {
  if (current === null || previous === null) return 0.5;
  const delta = current - previous;
  if (delta === 1) return 1;
  if (delta === 2) return 0.5;
  return delta > 0 ? 0.2 : 0;
}

/** 题干长度：8 字以上记满，线性过渡到 0。 */
export function textScore(stem: string): number {
  const length = stem.trim().length;
  if (length <= 0) return 0;
  if (length >= 8) return 1;
  return length / 8;
}

/** 字号一致性：与同层级中位数比，下限 0.4（字号本身是近似值，不搞一票否决）。 */
export function styleScore(fontSize: number, levelMedianFontSize: number): number {
  if (fontSize <= 0 || levelMedianFontSize <= 0) return 0.5;
  const diff = Math.abs(fontSize - levelMedianFontSize) / levelMedianFontSize;
  if (diff <= 0.02) return 1;
  if (diff <= 0.15) return 1 - ((diff - 0.02) / 0.13) * 0.3;
  if (diff >= 0.45) return 0.4;
  return 0.7 - ((diff - 0.15) / 0.3) * 0.3;
}

/** 题末到下一题号之间的留白：0–3 倍行高算合理。 */
export function boundaryScore(args: {
  gap: number;
  fontSize: number;
  sameColumn: boolean;
  hasNext: boolean;
}): number {
  const { gap, fontSize, sameColumn, hasNext } = args;
  if (!hasNext) return 0.6;
  if (!sameColumn) return 0.4;
  if (fontSize <= 0) return 0.7;
  // 负 gap 不是"留白异常"，是公式碎片落到下一题之后的数据假象，按紧贴处理。
  const ratio = gap / fontSize;
  if (ratio < 0) return 1;
  if (ratio <= 3) return 1;
  const extra = (ratio - 3) / 6;
  return extra >= 0.7 ? 0.3 : 1 - extra;
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
