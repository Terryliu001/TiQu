import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'path';

// 单文件离线版通过 `vite build --mode singlefile`（或环境变量 SINGLE_FILE=1）触发：
// 把所有 JS/CSS/字体/PDF worker 内联进一个 index.html，产物放到「宣传呈现/tiqu-1.1」，
// 双击即可离线打开。用 --mode 是为了在 Windows 的 npm 脚本里也能跨平台工作。
export default defineConfig(({ mode }) => {
  const singleFile = process.env.SINGLE_FILE === '1' || mode === 'singlefile';

  // 纯静态站点：base 用相对路径，既能跑在 GitHub Pages 子路径，也能丢到任意静态托管。
  return {
    base: './',
    plugins: [react(), ...(singleFile ? [viteSingleFile()] : [])],
    server: {
      port: 5173,
      strictPort: false,
    },
    build: {
      target: 'es2020',
      outDir: singleFile ? resolve(process.cwd(), '../宣传呈现/tiqu-1.1') : 'dist',
      // 单文件：把所有资源（含 KaTeX 字体、PDF worker）都内联成 data URI
      assetsInlineLimit: singleFile ? 100_000_000 : 4096,
      cssCodeSplit: !singleFile,
      modulePreload: singleFile ? false : { polyfill: true },
      rollupOptions: singleFile
        ? undefined
        : {
            output: {
              manualChunks: {
                pdfjs: ['pdfjs-dist'],
                math: ['katex'],
              },
            },
          },
      chunkSizeWarningLimit: 2000,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
