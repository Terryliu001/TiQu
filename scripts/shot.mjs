/**
 * 截图脚本（开发用，不进产物）。
 *
 * 用法：node scripts/shot.mjs <url> <out.png> [waitSelector]
 * 默认等待 `.qbox` 出现，确认切题真的跑完了再截图。
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const url = process.argv[2] ?? 'http://127.0.0.1:4173/?sample=math-midterm';
const out = process.argv[3] ?? '.shot.png';
const waitFor = process.argv[4] ?? '.qbox';

const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find((p) => fs.existsSync(p));

if (!EDGE) {
  console.error('找不到 Edge/Chrome');
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
const logs = [];
page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));
page.on('requestfailed', (req) => logs.push(`[requestfailed] ${req.url()} ${req.failure()?.errorText}`));

await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

let ok = false;
if (waitFor) {
  try {
    await page.waitForSelector(waitFor, { timeout: 25000 });
    ok = true;
  } catch {
    ok = false;
  }
}

await new Promise((resolve) => setTimeout(resolve, 600));
await page.screenshot({ path: out });

console.log(ok ? 'wait-selector-ok' : 'wait-selector-timeout');
console.log(logs.slice(-20).join('\n'));
await browser.close();
