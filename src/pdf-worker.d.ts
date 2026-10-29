/**
 * pdf.worker.min.mjs 是运行时动态 import 的模块（离线单文件版走主线程 fake worker）。
 * 官方没有提供它的类型声明，这里补一个最小声明，仅为让 tsc 通过。
 */
declare module 'pdfjs-dist/build/pdf.worker.min.mjs' {
  export const WorkerMessageHandler: unknown;
}
