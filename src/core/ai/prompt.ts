/**
 * 交给 AI 的题面载荷。
 *
 * 铁律（照搬刷起的 `question_payload.dart`）：**图片是权威来源**，
 * 机器文本只作辅助，且必须带上"这段文字是怎么来的"。
 * 公式题宁可只给图片，也不要把乱序碎片当事实喂给模型。
 */
import type { Question } from '../../types';
import type { ChatTurn } from './client';

export interface QuestionPayload {
  label: string;
  page: number;
  /** dataURL，可空（模型不支持图片时）。 */
  image: string | null;
  /** 题面文字，可空（公式题不给）。 */
  text: string | null;
  textProvenance: 'none' | 'pdfTextLayer' | 'scan';
}

export function buildUserPrompt(payload: QuestionPayload, ask: string): string {
  const lines: string[] = [];
  lines.push(`题号 ${payload.label}（第 ${payload.page + 1} 页）。`);

  if (payload.image && payload.text) {
    lines.push(
      payload.textProvenance === 'pdfTextLayer'
        ? '附了题面图片和一段 PDF 文本层抽取的文字。文字来自机器抽取，可能缺字、错序或把公式拆成碎片，仅供定位，冲突时以图片为准。'
        : '附了题面图片和一段版面识别得到的文字，仅供参考，冲突时以图片为准。',
    );
  } else if (payload.image) {
    lines.push('只附了题面图片（来自 PDF 原页裁切），请直接看图理解题意。');
  } else if (payload.text) {
    lines.push('只附了题面文字（当前模型不支持图片）。文字可能错序，遇到读不通的公式请说明，不要猜。');
  }
  lines.push(ask.trim() || '请讲解这道题。');
  return lines.join('\n');
}

export function buildTurns(
  systemPrompt: string,
  payload: QuestionPayload,
  history: { role: 'user' | 'assistant'; content: string }[],
  ask: string,
): ChatTurn[] {
  const turns: ChatTurn[] = [{ role: 'system', content: systemPrompt }];
  for (const message of history) turns.push({ role: message.role, content: message.content });
  turns.push({
    role: 'user',
    content: buildUserPrompt(payload, ask),
    images: payload.image ? [payload.image] : undefined,
  });
  return turns;
}

export const PRESETS: { id: string; label: string; ask: string }[] = [
  { id: 'explain', label: '讲解这道题', ask: '请一步步讲解这道题的解法，重点说清每一步为什么这么做。' },
  { id: 'answer', label: '只给答案', ask: '只给出最终答案，不要过程。如果答案不唯一，全部列出。' },
  { id: 'hint', label: '给点提示', ask: '先不要给完整答案，只给一个能让我自己往下做的关键提示。' },
  { id: 'check', label: '检查我的思路', ask: '我会在下面写出我的思路，请指出哪里对、哪里错，并给出修正。' },
];

/** 题面是否"公式密集"，决定要不要附文字。 */
export function isFormulaHeavy(text: string): boolean {
  const math = text.match(/[\u1D400-\u1D7FF\u0370-\u03FF\uE000-\uF8FF≤≥≠≈∞√∫∑∏±×÷∈∀∃]/g) ?? [];
  return math.length >= 2 || math.length / Math.max(1, text.length) > 0.06;
}

export function payloadFor(question: Question, image: string | null, text: string | null): QuestionPayload {
  const clean = text?.trim() ?? '';
  return {
    label: question.label,
    page: question.slices[0]?.page ?? 0,
    image,
    text: clean && !isFormulaHeavy(clean) ? clean : null,
    textProvenance: clean ? (question.source === 'rule' ? 'pdfTextLayer' : 'scan') : 'none',
  };
}
