/**
 * 题号识别（纯函数，可单测）。
 *
 * 输入是**一行文字**（已聚行拼接），输出"这行以什么题号开头"。
 *
 * 两条纪律（移植自刷起 `pattern.dart`，都是真卷打出来的）：
 * 1. **顺序匹配、命中即停**：`1.` 与 `（1）` 是不同层级，不能都试一遍取最长。
 * 2. **宁可漏、不可错**：误判一个伪题号（`1.5 分`、`图 3-1`）会切出错位的框；
 *    漏一个只是少切一道，用户还能手动补。
 */
import type { MarkKind, QuestionMark } from '../../types';

interface MarkPattern {
  re: RegExp;
  kind: MarkKind;
  numberOf: (m: RegExpMatchArray) => number | null;
}

const ARABIC = /^(\d{1,3})\s*[.、．]\s*/;
const PAREN = /^[（(]\s*(\d{1,2})\s*[）)]\s*/;
const CIRCLED = /^([\u2460-\u2473])\s*/;
const TH_QUESTION = /^第\s*(\d{1,3})\s*题\s*[.、．:：]?\s*/;
const EXAMPLE = /^[【[]\s*(?:例|习题|练习)?\s*(\d{1,3})\s*[】\]]\s*/;
const CN_NUMERAL = /^([一二三四五六七八九十]{1,3})\s*[、.．]\s*/;
/** `三(14分) 求函数…`：分数紧跟中文序号、没有顿号。真卷里整节都这么写。 */
const CN_WITH_SCORE = /^([一二三四五六七八九十]{1,3})\s*[（(]\s*\d+\s*分\s*[）)]\s*/;
const ROMAN = /^([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ]{1,4})\s*[、.．]\s*/;

const PATTERNS: MarkPattern[] = [
  { re: ARABIC, kind: 'arabic', numberOf: (m) => toInt(m[1]) },
  { re: PAREN, kind: 'parenArabic', numberOf: (m) => toInt(m[1]) },
  { re: CIRCLED, kind: 'circled', numberOf: (m) => (m[1] ? m[1].codePointAt(0)! - 0x2460 + 1 : null) },
  { re: TH_QUESTION, kind: 'thQuestion', numberOf: (m) => toInt(m[1]) },
  { re: EXAMPLE, kind: 'example', numberOf: (m) => toInt(m[1]) },
  { re: CN_NUMERAL, kind: 'cnNumeral', numberOf: (m) => cnNumeralToInt(m[1]) },
  { re: CN_WITH_SCORE, kind: 'cnNumeral', numberOf: (m) => cnNumeralToInt(m[1]) },
  { re: ROMAN, kind: 'roman', numberOf: (m) => romanToInt(m[1]) },
];

function toInt(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

/** 从行文本里抽题号。抽不到返回 null。 */
export function matchQuestionMark(rawText: string): QuestionMark | null {
  const text = rawText.trimStart();
  if (!text) return null;

  for (const pattern of PATTERNS) {
    const m = text.match(pattern.re);
    if (!m) continue;
    const rest = text.slice(m[0].length).trim();
    if (pseudoReason(rest, pattern.kind) !== null) return null;

    let label = m[0].trim();
    // `五(8分)` → `五、`：分值不该挤进题号胶囊。
    if (pattern.kind === 'cnNumeral' && /[（(]/.test(label)) {
      const head = label.match(/^([一二三四五六七八九十]{1,3})/);
      if (head) label = `${head[1]}、`;
    }
    return {
      label,
      kind: pattern.kind,
      rest,
      number: pattern.numberOf(m),
    };
  }
  return null;
}

/** 伪题号排除。命中返回原因（方便单测断言），不是伪题号返回 null。 */
export function pseudoReason(rest: string, kind: MarkKind): string | null {
  if (!rest) return 'rest-empty';
  const head = rest[0];
  // `图 3-1` / `表 2` / `式 (1)`：引用，不是题。
  if ('图表页式章节注'.includes(head)) return 'citation';
  // `1.5 分` / `2.4 已知…`：数字后紧跟数字是小数。
  if (/^\d/.test(rest)) return 'decimal';
  // `（3 分）` 这类分值标注。
  if (kind === 'parenArabic' && rest.startsWith('分')) return 'score';
  return null;
}

/** 题型粗判：只看题干文本，不做语义理解。 */
export function classifyKind(stem: string): string {
  // 至少两个选项标记才算选择题，避免把"图 A. 所示"算进去。
  const optionHits = (stem.match(/(?:^|\s)[A-D]\s*[.、．]/g) ?? []).length;
  if (optionHits >= 2) return 'choice';
  if (stem.includes('判断') || /对[”"』]?\s*或\s*[“"『]?错/.test(stem) || /（\s*）|\(\s*\)/.test(stem)) {
    return 'judge';
  }
  if (stem.includes('填空') || stem.includes('____') || stem.includes('＿＿')) return 'blank';
  return 'essay';
}

/** 从大题标题反推题型（`一、填空题（共 30 分）` → blank）。 */
export function kindFromHeading(heading: string): string | null {
  if (heading.includes('选择')) return 'choice';
  if (heading.includes('填空')) return 'blank';
  if (heading.includes('判断')) return 'judge';
  if (/计算|证明|解答|应用/.test(heading)) return 'essay';
  return null;
}

/** 中文数字 → 整数（1–99）。 */
export function cnNumeralToInt(token: string): number | null {
  const digits: Record<string, number> = {
    一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
  };
  if (!token) return null;
  if (!token.includes('十')) return token.length === 1 ? (digits[token] ?? null) : null;

  const tenIndex = token.indexOf('十');
  const tensPart = token.slice(0, tenIndex);
  const onesPart = token.slice(tenIndex + 1);
  const tens = tensPart === '' ? 1 : (digits[tensPart] ?? 0);
  const ones = onesPart === '' ? 0 : (digits[onesPart] ?? 0);
  if (tens === 0) return null;
  if (onesPart !== '' && onesPart.length !== 1) return null;
  return tens * 10 + ones;
}

const ROMAN_VALUES: Record<string, number> = {
  Ⅰ: 1, Ⅱ: 2, Ⅲ: 3, Ⅳ: 4, Ⅴ: 5, Ⅵ: 6, Ⅶ: 7, Ⅷ: 8, Ⅸ: 9, Ⅹ: 10, Ⅺ: 11, Ⅻ: 12,
};

export function romanToInt(token: string): number | null {
  if (!token || token.length !== 1) return null;
  return ROMAN_VALUES[token] ?? null;
}

export function prefersMajor(kind: MarkKind): boolean {
  return kind === 'cnNumeral' || kind === 'roman' || kind === 'example';
}

export function isArabicKind(kind: MarkKind): boolean {
  return kind === 'arabic' || kind === 'thQuestion';
}

/** 判断题干里数学符号的量，决定要不要只给图片不给文字。 */
export function formulaHeavy(text: string): boolean {
  const matches = text.match(/[\u1D400-\u1D7FF\u0370-\u03FF\uE000-\uF8FF≤≥≠≈∞√∫∑∏±×÷∈∀∃]/g) ?? [];
  return matches.length >= 2 || matches.length / Math.max(1, text.length) > 0.06;
}
