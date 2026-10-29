/**
 * PDF 层：打开、渲染、抽文本层、裁题面。
 *
 * 只在这里 import pdfjs-dist——切题算法保持纯函数（可用 Node 跑单测）。
 */
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PageLines, PageSize, Rect, TextLine } from '../types';
import {
  clusterLines,
  detectColumns,
  groupByColumn,
  piecesFromTextItems,
  type PdfTextItemLike,
} from './cut/lines';

// 离线单文件版（file:// 双击打开）无法加载独立 worker 文件：把 worker 模块挂到
// globalThis.pdfjsWorker，pdf.js 会据此走主线程 fake worker 路径，解析照常工作。
// 正常部署（http/https）仍用独立 worker，性能更好。
let workerReady: Promise<void> | null = null;
function ensureWorker(): Promise<void> {
  if (workerReady) return workerReady;
  const isFile = typeof window !== 'undefined' && window.location.protocol === 'file:';
  if (isFile) {
    workerReady = import('pdfjs-dist/build/pdf.worker.min.mjs')
      .then((mod) => {
        (globalThis as unknown as { pdfjsWorker?: unknown }).pdfjsWorker = mod;
      })
      .catch(() => {
        /* 失败则回退到 pdf.js 默认 fake worker */
      });
  } else {
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    workerReady = Promise.resolve();
  }
  return workerReady;
}

export class PdfDoc {
  private constructor(
    readonly file: File,
    private readonly doc: pdfjs.PDFDocumentProxy,
    private readonly pageSizes: PageSize[],
  ) {}

  private static cache = new Map<number, HTMLCanvasElement>();
  private static cacheOrder: number[] = [];

  static async open(file: File): Promise<PdfDoc> {
    await ensureWorker();
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
    const sizes: PageSize[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      sizes.push({ index: i - 1, width: viewport.width, height: viewport.height });
    }
    return new PdfDoc(file, doc, sizes);
  }

  get pageCount(): number {
    return this.doc.numPages;
  }

  getPageSize(index: number): PageSize {
    return this.pageSizes[Math.max(0, Math.min(index, this.pageSizes.length - 1))];
  }

  getPageSizes(): PageSize[] {
    return this.pageSizes;
  }

  /** 抽一页的文本行（含分栏与聚行）。扫描件会返回空数组。 */
  async getPageLines(index: number): Promise<PageLines> {
    const page = await this.doc.getPage(index + 1);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items = content.items.filter(
      (item) => typeof (item as unknown as PdfTextItemLike).str === 'string',
    ) as unknown as PdfTextItemLike[];
    const pieces = piecesFromTextItems(items, viewport.transform, viewport.height);

    let lines: TextLine[] = [];
    if (pieces.length > 0) {
      const columns = detectColumns(
        pieces.map((p) => p.rect),
        viewport.width,
      );
      const groups = groupByColumn(pieces, columns);
      groups.forEach((group, column) => {
        lines.push(...clusterLines(group, { column }));
      });
    }
    return { pageIndex: index, width: viewport.width, height: viewport.height, lines };
  }

  /** 把整页渲染到给定 canvas。位图按 dpr 放大，CSS 尺寸由调用方控制。 */
  async renderPage(index: number, canvas: HTMLCanvasElement, renderScale = 1.6): Promise<void> {
    const page = await this.doc.getPage(index + 1);
    const viewport = page.getViewport({ scale: renderScale });
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.width * ratio);
    canvas.height = Math.floor(viewport.height * ratio);
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('无法创建 canvas 上下文');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    await page.render({ canvasContext: ctx, viewport }).promise;
  }

  /**
   * 渲染整页到离屏 canvas（带 LRU 缓存），供扫描件分析与题面裁切共用。
   * scale 建议 1.6–2.2：太大浪费内存，太小裁出来的题面发虚。
   */
  async getPageBitmap(index: number, scale = 2): Promise<HTMLCanvasElement> {
    const key = index;
    const cached = PdfDoc.cache.get(key);
    if (cached && cached.dataset.scale === String(scale)) {
      PdfDoc.cacheOrder = PdfDoc.cacheOrder.filter((k) => k !== key);
      PdfDoc.cacheOrder.push(key);
      return cached;
    }

    const page = await this.doc.getPage(index + 1);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.dataset.scale = String(scale);
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('无法创建 canvas 上下文');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;

    PdfDoc.cache.set(key, canvas);
    PdfDoc.cacheOrder.push(key);
    while (PdfDoc.cacheOrder.length > 6) {
      const oldest = PdfDoc.cacheOrder.shift();
      if (oldest !== undefined) PdfDoc.cache.delete(oldest);
    }
    return canvas;
  }

  /** 裁出一块题面，返回 dataURL（给 AI 用）。 */
  async cropRegion(index: number, rect: Rect, scale = 2, maxEdge = 1600): Promise<string> {
    const bitmap = await this.getPageBitmap(index, scale);
    const sx = Math.max(0, rect.left * scale);
    const sy = Math.max(0, rect.top * scale);
    const sw = Math.min(bitmap.width - sx, rect.width * scale);
    const sh = Math.min(bitmap.height - sy, rect.height * scale);

    const out = document.createElement('canvas');
    const shrink = Math.min(1, maxEdge / Math.max(sw, sh));
    out.width = Math.max(1, Math.round(sw * shrink));
    out.height = Math.max(1, Math.round(sh * shrink));
    const ctx = out.getContext('2d');
    if (!ctx) throw new Error('无法创建 canvas 上下文');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, out.width, out.height);
    return out.toDataURL('image/png');
  }

  destroy() {
    void this.doc.destroy();
  }
}

/** 判断一份 PDF 是否"基本没有文字层"（扫描件）。抽前 3 页即可。 */
export async function looksLikeScan(pdf: PdfDoc): Promise<boolean> {
  const pages = Math.min(3, pdf.pageCount);
  let chars = 0;
  for (let i = 0; i < pages; i++) {
    const lines = await pdf.getPageLines(i);
    chars += lines.lines.reduce((sum, line) => sum + line.text.length, 0);
    if (chars > 120) return false;
  }
  return chars < 120;
}
