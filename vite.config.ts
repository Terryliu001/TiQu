import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 纯静态站点：base 用相对路径，既能跑在 GitHub Pages 子路径，也能丢到任意静态托管。
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    target: 'es2020',
    // pdf.js 自身体积就大，单独切一个 chunk，别让主包陪着一起变慢。
    rollupOptions: {
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
});
