/**
 * 规则切题：把一页页的文本行切成"一道道题"。
 *
 * 三条硬规则（与刷起同一口径，都是真卷边界打出来的）：
 * 1. 一道题的区域 = 从题号行**顶**，到下一个同级或更高级题号行顶（不含）；
 * 2. 跨页：下一页从"内容顶"延续到下一个题号之前——同一道题写两段；
 * 3. 大题（level 1）只当容器、不占区域；但整卷没有小题时，大题自己就得占区域。
 */
import type { PageLines, PageSlice, Question, QuestionKind, TextLine } from '../../types';
import {
  boundaryScore,
  orderScore,
  regionConfidence,
  styleScore,
  textScore,
} from './confidence';
import { assignLevels } from './leveling';
import {
  columnIndexOf,
  dropMargins,
  rectBottom,
  rectCenterX,
  rectRight,
  sortLines,
} from './lines';
import {
  classifyKind,
  kindFromHeading,
  matchQuestionMark,
} from './pattern';

const PAD_X = 5;
const PAD_Y = 4;
const MIN_SLICE_HEIGHT = 6;
const STEM_LIMIT = 240;

const ANSWER_HEADING_RE = /^(参考答案与解析|参考答案|答案与解析|试题答案|评分标准|答案|解析)/;
const SOLUTION_MARKER_RE = /^(\s*)(解[:：]|证明[:：]|答[:：]|分析[:：]|解析[:：]|【答案】)/;
const SOLUTION_ANYWHERE_RE = /(解[:：]|证明[:：]|答[:：]|分析[:：]|解析[:：]|【答案】)/;

interface LineRef {
  page: number;
  index: number;
  line: TextLine;
}

export interface SplitOptions {
  /** 扫描件：题号是版面猜的，挂在 line.forcedMark 上。 */
  fromScan?: boolean;
}

export interface MarkHit {
  mark: NonNullable<TextLine['forcedMark']>;
  at: number;
}

export function splitQuestions(pages: PageLines[], opts: SplitOptions = {}): {
  questions: Question[];
  markCount: number;
  warnings: string[];
} {
  const fromScan = opts.fromScan ?? false;
  const ordered = pages.map((page) => ({
    ...page,
    // 扫描件的行是像素段，text 为空，走页眉页脚规则会把压在上边界的第一题误删。
    lines: sortLines(fromScan ? page.lines : dropMargins(page.lines, page.height)),
  }));

  const flat: LineRef[] = [];
  ordered.forEach((page, p) => {
    page.lines.forEach((line, i) => flat.push({ page: p, index: i, line }));
  });

  if (flat.length === 0) {
    return {
      questions: [],
      markCount: 0,
      warnings: ['这一页没有文本层（可能是扫描件），需要用版面切题或手动框'],
    };
  }

  // 1) 收题号：跳过文末答案区，跳过题内解答步骤。
  const marks: MarkHit[] = [];
  const markAt: number[] = [];
  let answerStart: number | null = null;
  let inAnswer = false;
  let inSolution = false;

  for (let i = 0; i < flat.length; i++) {
    const line = flat[i].line;
    if (!fromScan) {
      if (!inAnswer && ANSWER_HEADING_RE.test(line.text.trim())) {
        inAnswer = true;
        if (answerStart === null) answerStart = i;
      }
      if (inAnswer) continue;
      if (SOLUTION_MARKER_RE.test(line.text)) inSolution = true;
    }

    const mark = line.forcedMark ?? matchQuestionMark(line.text);
    if (!mark) continue;

    if (!fromScan && inSolution) {
      // `(1)(2)` 是解答步骤，并进当前题的区域，不另起一题。
      if (mark.kind === 'parenArabic' || mark.kind === 'circled') continue;
      inSolution = false;
    }
    marks.push({ mark, at: i });
    markAt.push(i);
  }

  const documentEnd = answerStart ?? flat.length;
  if (marks.length === 0) {
    return {
      questions: [],
      markCount: 0,
      warnings: ['没有命中任何题号，需要手动框题'],
    };
  }

  // 2) 层级（全卷一次判）
  const leveling = assignLevels(
    marks.map((m) => m.mark.kind),
    markAt.map((at) => flat[at].line.fontSize),
    { allowFontFallback: !fromScan },
  );

  // 2b) 每个大题挂了几道小题 —— 决定大题要不要自己占区域。
  const childCount = new Array(marks.length).fill(0);
  const firstChildGap = new Array(marks.length).fill(0);
  let majorIndex: number | null = null;
  for (let m = 0; m < marks.length; m++) {
    if (leveling.levels[m] === 1) {
      majorIndex = m;
    } else if (majorIndex !== null) {
      if (childCount[majorIndex] === 0) {
        firstChildGap[majorIndex] = markAt[m] - markAt[majorIndex] - 1;
      }
      childCount[majorIndex]++;
    }
  }

  // 同层级字号中位数：字号估计有噪声，和"相邻那一行"比会互相放大。
  const levelMedianFont = new Map<number, number>();
  for (const level of new Set(leveling.levels)) {
    const sizes = marks
      .map((m, idx) => ({ m, idx }))
      .filter(({ idx }) => leveling.levels[idx] === level)
      .map(({ idx }) => flat[markAt[idx]].line.fontSize);
    levelMedianFont.set(level, median(sizes));
  }

  const lastNumberByLevel = new Map<number, number | null>();
  const questions: Question[] = [];
  let currentParentOrdinal: number | null = null;
  let currentParentKind: string | null = null;

  for (let m = 0; m < marks.length; m++) {
    const mark = marks[m].mark;
    const startIndex = markAt[m];
    const startRef = flat[startIndex];
    const startLine = startRef.line;
    const level = leveling.levels[m];
    if (level === 1) {
      currentParentOrdinal = m + 1;
      currentParentKind = kindFromHeading(mark.rest);
    }

    // 下一处切点：之后第一个"同级或更高级"的题号。
    let nextMarkIndex: number | null = null;
    for (let n = m + 1; n < marks.length; n++) {
      if (leveling.levels[n] <= level) {
        nextMarkIndex = n;
        break;
      }
    }

    // 大题自己也要区域时（带材料的论述题），下界是第一道小题，不是下一道大题。
    const regionEndMark = level === 1 && childCount[m] > 0 ? m + 1 : nextMarkIndex;
    const endIndex = regionEndMark === null ? documentEnd : markAt[regionEndMark];

    const needsRegion = level === 2 || (level === 1 && (childCount[m] === 0 || firstChildGap[m] >= 1));
    const endColumn =
      regionEndMark === null ? null : flat[markAt[regionEndMark]].line.column;

    const slices = needsRegion
      ? buildSlices({
          ordered,
          flat,
          startIndex,
          endIndex,
          startColumn: startLine.column,
          endColumn,
        })
      : [];

    let stem: string;
    if (level === 1) {
      stem = mark.rest;
    } else {
      stem = buildStem(flat, startIndex, endIndex, mark.rest);
    }

    const ownKind = classifyKind(stem || mark.rest);
    const kind = (ownKind === 'essay' && level === 2 && currentParentKind
      ? currentParentKind
      : ownKind) as QuestionKind;

    const previousNumber = lastNumberByLevel.get(level) ?? null;
    lastNumberByLevel.set(level, mark.number);

    let sameColumn = true;
    let gap = 0;
    if (regionEndMark !== null) {
      const nextRef = flat[markAt[regionEndMark]];
      sameColumn = nextRef.page !== startRef.page || nextRef.line.column === startLine.column;
      const lastRef = flat[Math.max(startIndex, endIndex - 1)];
      gap = nextRef.page === lastRef.page ? nextRef.line.rect.top - rectBottom(lastRef.line.rect) : 0;
    }

    const confidence = regionConfidence({
      boundary: boundaryScore({
        gap,
        fontSize: startLine.fontSize,
        sameColumn,
        hasNext: nextMarkIndex !== null,
      }),
      style: styleScore(startLine.fontSize, levelMedianFont.get(level) ?? 0),
      order: orderScore(mark.number, previousNumber),
      text: textScore(stem),
      fromScan,
    });

    questions.push({
      id: `q_${startRef.page}_${Math.round(startLine.rect.top)}_${m + 1}`,
      ordinal: m + 1,
      // 扫描件没有文字，题号只能按顺序补；label 是给人看的序号，不是卷面原文。
      label: fromScan ? String(m + 1) : mark.label,
      level,
      kind,
      stem: fromScan ? '' : stem,
      slices,
      confidence,
      fontSize: startLine.fontSize,
      number: fromScan ? m + 1 : mark.number,
      parentOrdinal: level === 2 ? currentParentOrdinal : null,
      source: fromScan ? 'scan' : 'rule',
    });
  }

  const warnings: string[] = [];
  if (!questions.some((q) => q.slices.length > 0)) {
    warnings.push(`命中 ${questions.length} 个题号，但没有任何区域（层级判定可能过头）`);
  }

  return { questions, markCount: marks.length, warnings };
}

/** 把 [startIndex, endIndex) 这段行转成"每页一段"的矩形。 */
function buildSlices(args: {
  ordered: PageLines[];
  flat: LineRef[];
  startIndex: number;
  endIndex: number;
  startColumn: number;
  endColumn: number | null;
}): PageSlice[] {
  const { ordered, flat, startIndex, endIndex, startColumn, endColumn } = args;
  if (endIndex <= startIndex) return [];

  const startPage = flat[startIndex].page;
  const endPage = endIndex >= flat.length ? ordered.length - 1 : flat[endIndex].page;
  const startY = flat[startIndex].line.rect.top - PAD_Y;
  const cutY = endIndex >= flat.length ? Infinity : flat[endIndex].line.rect.top - PAD_Y;

  // 切点落在同一页的另一栏：本题下界是"本栏栏底"，不是切点所在栏的栏顶。
  const cutInOtherColumn = endColumn !== null && endColumn !== startColumn && endPage === startPage;

  const slices: PageSlice[] = [];
  for (let p = startPage; p <= endPage && p < ordered.length; p++) {
    const page = ordered[p];
    const { top: contentTop, bottom: contentBottom } = contentBounds(page);
    const y0 = p === startPage ? Math.max(0, startY) : contentTop;
    let y1: number;
    if (cutInOtherColumn) {
      y1 = columnBottom(page, startColumn, contentBottom);
    } else if (p === endPage) {
      y1 = Math.min(contentBottom, cutY);
    } else {
      y1 = contentBottom;
    }
    if (y1 - y0 < MIN_SLICE_HEIGHT) continue;

    let minLeft = Infinity;
    let maxRight = -Infinity;
    for (const line of page.lines) {
      const bottom = rectBottom(line.rect);
      if (bottom < y0 || line.rect.top > y1) continue;
      // 双栏页的框绝不能横跨两栏。
      if (line.column !== startColumn) continue;
      minLeft = Math.min(minLeft, line.rect.left);
      maxRight = Math.max(maxRight, rectRight(line.rect));
    }
    if (!Number.isFinite(minLeft) || !Number.isFinite(maxRight)) continue;

    const left = Math.max(0, minLeft - PAD_X);
    const right = Math.min(page.width, maxRight + PAD_X);
    if (right - left < MIN_SLICE_HEIGHT) continue;

    slices.push({
      page: page.pageIndex,
      rect: { left, top: y0, width: right - left, height: y1 - y0 },
    });
  }
  return slices;
}

function columnBottom(page: PageLines, column: number, fallback: number): number {
  let bottom = 0;
  let found = false;
  for (const line of page.lines) {
    if (line.column !== column) continue;
    found = true;
    bottom = Math.max(bottom, rectBottom(line.rect));
  }
  return found ? Math.min(page.height, bottom) : fallback;
}

function contentBounds(page: PageLines): { top: number; bottom: number } {
  if (page.lines.length === 0) return { top: 0, bottom: 0 };
  let top = Infinity;
  let bottom = 0;
  for (const line of page.lines) {
    top = Math.min(top, line.rect.top);
    bottom = Math.max(bottom, rectBottom(line.rect));
  }
  return { top: Math.max(0, top), bottom: Math.min(page.height, bottom) };
}

/** 题干：题号行剩余部分 + 后续行；遇到 `解：/答案：` 停下（解析不属于题干）。 */
function buildStem(flat: LineRef[], startIndex: number, endIndex: number, rest: string): string {
  let stem = '';
  let inAnswer = false;

  const inline = SOLUTION_ANYWHERE_RE.exec(rest);
  if (inline && inline.index > 0) {
    stem = rest.slice(0, inline.index);
    inAnswer = true;
  } else if (SOLUTION_MARKER_RE.test(rest)) {
    inAnswer = true;
  } else {
    stem = rest;
  }

  for (let i = startIndex + 1; i < endIndex; i++) {
    const text = flat[i].line.text.trim();
    if (!text) continue;
    if (!inAnswer && SOLUTION_MARKER_RE.test(text)) {
      inAnswer = true;
      continue;
    }
    if (inAnswer) continue;
    if (stem.length >= STEM_LIMIT) break;
    if (stem) stem += '\n';
    stem += text;
  }
  return stem.slice(0, STEM_LIMIT);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** 页面上一道题的那一段（渲染用）。 */
export function questionsOnPage(questions: Question[], pageIndex: number) {
  const out: { question: Question; slice: PageSlice; indexInPage: number }[] = [];
  for (const question of questions) {
    let index = 0;
    for (const slice of question.slices) {
      if (slice.page === pageIndex) out.push({ question, slice, indexInPage: index++ });
    }
  }
  return out;
}

export { columnIndexOf, rectCenterX };
