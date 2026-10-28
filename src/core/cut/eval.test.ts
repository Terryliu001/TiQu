/**
 * 切题回归：用刷起项目的 5 份评测卷跑端到端（PDF → 文本层 → 行 → 题）。
 *
 * 这不是单元测试的补充，而是**唯一能证明切题还活着**的东西：
 * 改一个阈值就可能让双栏卷少切 4 道题，而单测全绿。
 *
 * 期望值来自刷起的评测基线（见 `日志/032` §8.1）：
 * 合成卷 4/4 全中，真卷 24/25。
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { PageLines } from '../../types';
import { clusterLines, detectColumns, groupByColumn, piecesFromTextItems } from './lines';
import { splitQuestions } from './split';

const SAMPLES = path.resolve(process.cwd(), 'public/samples');

interface Case {
  file: string;
  expectMarks: number;
  expectRegions: number;
}

const CASES: Case[] = [
  { file: 'eval-single-column.pdf', expectMarks: 11, expectRegions: 10 },
  { file: 'eval-double-column.pdf', expectMarks: 9, expectRegions: 8 },
  { file: 'eval-paren-sub.pdf', expectMarks: 20, expectRegions: 16 },
  { file: 'eval-example-crosspage.pdf', expectMarks: 38, expectRegions: 34 },
  { file: 'math-midterm.pdf', expectMarks: 18, expectRegions: 16 },
];

async function cutPdf(file: string) {
  const data = new Uint8Array(fs.readFileSync(path.join(SAMPLES, file)));
  const doc = await getDocument({ data, disableFontFace: true, useSystemFonts: false }).promise;
  const pages: PageLines[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items = content.items.filter(
      (item) => typeof (item as { str?: string }).str === 'string',
    ) as unknown as { str: string; width: number; height: number; transform: number[] }[];

    const pieces = piecesFromTextItems(items, viewport.transform, viewport.height);
    const columns = detectColumns(
      pieces.map((p) => p.rect),
      viewport.width,
    );
    const groups = groupByColumn(pieces, columns);
    const lines = groups.flatMap((group, column) => clusterLines(group, { column }));

    pages.push({ pageIndex: i - 1, width: viewport.width, height: viewport.height, lines });
  }

  const result = splitQuestions(pages);
  await doc.destroy();
  return { result, pages };
}

describe('切题回归（真实 PDF）', () => {
  for (const testCase of CASES) {
    it(`${testCase.file} 应切出 ${testCase.expectMarks} 个题号`, async () => {
      const { result } = await cutPdf(testCase.file);
      const withRegion = result.questions.filter((q) => q.slices.length > 0);

      // 把实际值打出来，方便判断是算法退化还是语料换了
      console.log(
        `[${testCase.file}] 题号 ${result.markCount}（期望 ${testCase.expectMarks}），有区域 ${withRegion.length}`,
      );

      expect(result.markCount).toBe(testCase.expectMarks);
      expect(withRegion.length).toBeGreaterThanOrEqual(testCase.expectRegions - 1);
      expect(withRegion.length).toBeLessThanOrEqual(testCase.expectRegions + 2);
      expect(result.warnings).not.toContain('没有命中任何题号，需要手动框题');
    });
  }

  it('双栏卷不能切出横跨两栏的巨框', async () => {
    const { result, pages } = await cutPdf('eval-double-column.pdf');
    const widths = pages.map((p) => p.width);
    for (const question of result.questions) {
      for (const slice of question.slices) {
        const pageWidth = widths[slice.page] ?? 0;
        expect(slice.rect.width).toBeLessThan(pageWidth * 0.72);
      }
    }
  });

  it('题目区域不能越出页面', async () => {
    const { result, pages } = await cutPdf('math-midterm.pdf');
    for (const question of result.questions) {
      for (const slice of question.slices) {
        const page = pages[slice.page];
        if (!page) continue;
        expect(slice.rect.left).toBeGreaterThanOrEqual(-1);
        expect(slice.rect.top).toBeGreaterThanOrEqual(-1);
        expect(slice.rect.left + slice.rect.width).toBeLessThanOrEqual(page.width + 1);
        expect(slice.rect.top + slice.rect.height).toBeLessThanOrEqual(page.height + 1);
      }
    }
  });
});
