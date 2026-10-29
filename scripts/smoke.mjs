/**
 * 知识树冒烟测试（可选，需要本机有 Edge/Chrome + puppeteer-core）。
 *
 *   node scripts/smoke.mjs [目标 index.html]
 *
 * 默认测试单文件离线版 ../宣传呈现/tiqu-1.1/index.html。
 * 以 file:// 打开，切到「知识树」，验证：图谱渲染、节点 hover 出词条、
 * KaTeX 公式渲染、无 console 报错。
 */
import puppeteer from 'puppeteer-core';
import { pathToFileURL } from 'url';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const target = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(root, '../宣传呈现/tiqu-1.1/index.html');

const exe = [
  process.env.EDGE_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].filter(Boolean).find((p) => existsSync(p));

if (!exe) {
  console.error('未找到 Edge/Chrome，可用环境变量 EDGE_PATH 指定可执行文件路径。');
  process.exit(2);
}
if (!existsSync(target)) {
  console.error('找不到目标 HTML：' + target + '\n先执行 SINGLE_FILE=1 npx vite build');
  process.exit(2);
}

const errors = [];
const warnings = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: exe,
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-web-security', '--window-size=1440,900'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on('console', (m) => (m.type() === 'error' ? errors : m.type() === 'warning' ? warnings : []).push(m.text()));
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

  await page.goto(pathToFileURL(target).href, { waitUntil: 'load', timeout: 60000 });
  await sleep(800);

  const hasTopbar = !!(await page.$('.topbar'));
  const switched = await page.evaluate(() => {
    const t = [...document.querySelectorAll('.view-switch .vs')].find((b) => b.textContent.includes('知识树'));
    if (t) { t.click(); return true; }
    return false;
  });
  console.log('topbar:', hasTopbar, '| switch to 知识树:', switched);
  await sleep(1800);

  const rect = await page.evaluate(() => {
    const c = document.querySelector('.kg-canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: Math.round(r.width), h: Math.round(r.height) };
  });
  console.log('kg-canvas:', JSON.stringify(rect));

  let found = null;
  if (rect) {
    outer: for (let gx = 0.2; gx <= 0.8; gx += 0.06) {
      for (let gy = 0.2; gy <= 0.8; gy += 0.06) {
        const px = rect.x + rect.w * gx;
        const py = rect.y + rect.h * gy;
        await page.mouse.move(px, py);
        await sleep(35);
        const name = await page.$eval('.kpanel .kp-name', (el) => el.textContent).catch(() => null);
        if (name) { found = { px, py, name }; break outer; }
      }
    }
  }
  console.log('hover found term:', found ? found.name : '(none)');

  if (found) {
    await page.mouse.click(found.px, found.py);
    await sleep(500);
  }
  const math = await page.evaluate(() => ({
    katex: document.querySelectorAll('.kpanel .katex').length,
    name: document.querySelector('.kpanel .kp-name')?.textContent ?? null,
    status: document.querySelector('.statusbar')?.textContent ?? '',
  }));
  console.log('term:', math.name, '| katex:', math.katex, '| status:', math.status);

  await page.screenshot({ path: resolve(__dirname, 'smoke-screenshot.png') });
  console.log('screenshot:', resolve(__dirname, 'smoke-screenshot.png'));

  console.log(`\nconsole errors: ${errors.length}, warnings: ${warnings.length}`);
  errors.slice(0, 20).forEach((e) => console.log('  • ' + e));

  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch((e) => {
  console.error('SMOKE FAILED:', e);
  process.exit(1);
});
