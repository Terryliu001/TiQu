/**
 * 本地转发代理（可选）。
 *
 * 只为一件事存在：有些 AI 厂商不允许浏览器直接调用（CORS）。
 * 起一条 `TARGET=... node tools/proxy.mjs`，把设置里的接口地址改成
 * http://127.0.0.1:8787/v1 即可。不做密钥托管、不做缓存、不落盘。
 */
import http from 'node:http';
import { Readable } from 'node:stream';

const PORT = Number(process.env.PORT || 8787);
const TARGET = (process.env.TARGET || 'https://api.deepseek.com/v1').replace(/\/+$/, '');

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }

  const path = req.url || '/';
  const targetUrl = path.startsWith('http') ? path : `${TARGET}${path}`;

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      },
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
    });

    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
    });

    if (upstream.body) {
      // 原样转发流：SSE 才能边收边吐。
      Readable.fromWeb(upstream.body).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: String(error) } }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`题取本地代理已启动：http://127.0.0.1:${PORT}/v1  →  ${TARGET}`);
  console.log('把「接口地址」改成上面的地址即可。用完 Ctrl+C 关掉。');
});
