/**
 * 切题编排：决定走文本层还是版面算法，然后交给同一套切分内核。
 *
 * 判定用"前 3 页的字符数"而不是"有没有文本层"：
 * 有些影印件带一层 OCR 残留文字（几十个字），按"有文本层"处理会切出
 * 一堆错位的框；只有字符量达到正常试卷的量级才认为文本层可用。
 */
import type { CutResult, PageLines } from '../../types';
import { PdfDoc } from '../pdf';
import { analyzeScanPage } from './scan';
import { splitQuestions } from './split';

export interface CutProgress {
  page: number;
  total: number;
  phase: 'probing' | 'text' | 'scan' | 'splitting';
}

const TEXT_PROBE_PAGES = 3;
/** 一页正常试卷至少这么多字；低于它按扫描件处理。 */
const MIN_CHARS_PER_PAGE = 80;

export async function cutDocument(
  pdf: PdfDoc,
  onProgress?: (progress: CutProgress) => void,
): Promise<CutResult> {
  const started = performance.now();
  const total = pdf.pageCount;

  // 1) 探针：前几页有多少字
  const probePages = Math.min(TEXT_PROBE_PAGES, total);
  let probeChars = 0;
  const probeLines: PageLines[] = [];
  for (let i = 0; i < probePages; i++) {
    onProgress?.({ page: i, total, phase: 'probing' });
    const lines = await pdf.getPageLines(i);
    probeLines.push(lines);
    probeChars += lines.lines.reduce((sum, line) => sum + line.text.length, 0);
  }

  const useText = probeChars >= probePages * MIN_CHARS_PER_PAGE;

  // 2) 逐页收集
  const pages: PageLines[] = [];
  for (let i = 0; i < total; i++) {
    onProgress?.({ page: i, total, phase: useText ? 'text' : 'scan' });
    if (useText) {
      pages.push(i < probePages ? probeLines[i] : await pdf.getPageLines(i));
    } else {
      pages.push(await analyzeScan(pdf, i));
    }
    // 每页让一帧，长文档不至于把主线程按住不放。
    if (i % 4 === 3) await nextFrame();
  }

  // 3) 切分
  onProgress?.({ page: total, total, phase: 'splitting' });
  const result = splitQuestions(pages, { fromScan: !useText });

  return {
    ...result,
    elapsed: Math.round(performance.now() - started),
  };
}

/** 单独切一页（扫描件用，UI 可以在滚动到时按需补切）。 */
export async function analyzeScan(pdf: PdfDoc, pageIndex: number): Promise<PageLines> {
  const size = pdf.getPageSize(pageIndex);
  const scale = Math.min(2.2, Math.max(1.2, 1400 / Math.max(size.width, size.height)));
  const bitmap = await pdf.getPageBitmap(pageIndex, scale);
  return analyzeScanPage(bitmap, pageIndex, scale);
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
