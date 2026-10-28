/**
 * 用户覆盖层：改框不直接改自动结果，而是记一条"操作"。
 *
 * 这样撤销 = 弹掉最后一条重放；重新切题 = 把同一串操作套到新结果上，
 * 手改不会因为换算法而丢失。这套语义来自刷起的 `corrections.json`，
 * 本项目把 10 种 op 收敛成 8 种（不做跨页加/去段，合并/拆分已覆盖绝大多数场景）。
 */
import type { Question, Rect } from '../types';

export type Correction =
  | { t: 'move'; id: string; dx: number; dy: number }
  | { t: 'resize'; id: string; page: number; rect: Rect }
  | { t: 'add'; question: Question }
  | { t: 'delete'; id: string }
  | { t: 'merge'; id: string }
  | { t: 'split'; id: string; page: number; y: number; newId: string; label: string }
  | { t: 'rename'; id: string; label: string }
  | { t: 'lock'; id: string };

export function applyCorrection(questions: Question[], op: Correction): Question[] {
  const list = questions.map((q) => ({ ...q, slices: q.slices.map((s) => ({ ...s, rect: { ...s.rect } })) }));

  switch (op.t) {
    case 'move': {
      const q = list.find((item) => item.id === op.id);
      if (!q) return list;
      q.slices = q.slices.map((s) => ({
        ...s,
        rect: { ...s.rect, left: s.rect.left + op.dx, top: s.rect.top + op.dy },
      }));
      return normalize(list);
    }

    case 'resize': {
      const q = list.find((item) => item.id === op.id);
      if (!q) return list;
      const slice = q.slices.find((s) => s.page === op.page);
      if (slice) slice.rect = { ...op.rect };
      return normalize(list);
    }

    case 'add': {
      list.push({ ...op.question, slices: op.question.slices.map((s) => ({ ...s, rect: { ...s.rect } })) });
      return normalize(list);
    }

    case 'delete':
      return normalize(list.filter((q) => q.id !== op.id));

    case 'merge': {
      const index = list.findIndex((q) => q.id === op.id);
      if (index <= 0) return list;
      const current = list[index];
      const previous = list[index - 1];
      previous.slices = mergeSlices([...previous.slices, ...current.slices]);
      previous.stem = [previous.stem, current.stem].filter(Boolean).join('\n');
      return normalize(list.filter((q) => q.id !== op.id));
    }

    case 'split': {
      const index = list.findIndex((q) => q.id === op.id);
      if (index < 0) return list;
      const q = list[index];
      const slice = q.slices.find((s) => s.page === op.page);
      if (!slice) return list;
      const top = slice.rect.top;
      const bottom = slice.rect.top + slice.rect.height;
      if (op.y - top < 8 || bottom - op.y < 8) return list; // 太贴边不切，避免碎片框

      const upper: Rect = { ...slice.rect, height: op.y - top };
      const lower: Rect = { ...slice.rect, top: op.y, height: bottom - op.y };
      slice.rect = upper;

      const created: Question = {
        id: op.newId,
        ordinal: 0,
        label: op.label,
        level: 2,
        kind: q.kind,
        stem: '',
        slices: [{ page: op.page, rect: lower }],
        confidence: 0.5,
        fontSize: q.fontSize,
        number: null,
        parentOrdinal: q.parentOrdinal,
        source: 'manual',
      };
      list.splice(index + 1, 0, created);
      return normalize(list);
    }

    case 'rename': {
      const q = list.find((item) => item.id === op.id);
      if (q) q.label = op.label;
      return list;
    }

    case 'lock': {
      const q = list.find((item) => item.id === op.id);
      if (q) q.locked = !q.locked;
      return list;
    }

    default:
      return list;
  }
}

export function replayCorrections(auto: Question[], ops: Correction[]): Question[] {
  let result = auto;
  for (const op of ops) result = applyCorrection(result, op);
  return result;
}

/** 排序 + 重排序号。顺序 = 首个分段的页 → y。 */
export function normalize(questions: Question[]): Question[] {
  const list = [...questions];
  list.sort((a, b) => {
    const pa = a.slices[0];
    const pb = b.slices[0];
    if (!pa || !pb) return 0;
    return pa.page - pb.page || pa.rect.top - pb.rect.top;
  });
  list.forEach((q, index) => {
    q.ordinal = index + 1;
    if (!q.label) q.label = String(index + 1);
  });
  return list;
}

/** 同页的多段合并成一段（并集），避免合并两题后一个框套一个框。 */
function mergeSlices(slices: Question['slices']): Question['slices'] {
  const byPage = new Map<number, Rect>();
  for (const slice of slices) {
    const existing = byPage.get(slice.page);
    if (!existing) {
      byPage.set(slice.page, { ...slice.rect });
      continue;
    }
    const left = Math.min(existing.left, slice.rect.left);
    const top = Math.min(existing.top, slice.rect.top);
    const right = Math.max(existing.left + existing.width, slice.rect.left + slice.rect.width);
    const bottom = Math.max(existing.top + existing.height, slice.rect.top + slice.rect.height);
    byPage.set(slice.page, { left, top, width: right - left, height: bottom - top });
  }
  return [...byPage.entries()]
    .sort(([a], [b]) => a - b)
    .map(([page, rect]) => ({ page, rect }));
}

export function makeManualQuestion(page: number, rect: Rect, label: string): Question {
  return {
    id: `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    ordinal: 0,
    label,
    level: 2,
    kind: 'essay',
    stem: '',
    slices: [{ page, rect }],
    confidence: 0.5,
    fontSize: 0,
    number: null,
    parentOrdinal: null,
    source: 'manual',
  };
}
