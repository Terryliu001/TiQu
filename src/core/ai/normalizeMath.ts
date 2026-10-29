/**
 * 把模型常见的 LaTeX 定界符，统一成 remark-math 认识的形式：
 *
 *   \( ... \)  →  $ ... $      （行内；若跨行则按独立公式处理）
 *   \[ ... \]  →  $$ ... $$    （独立公式）
 *
 * 只替换「没有被反斜杠转义」的定界符：
 *   - 已经是 $...$ / $$...$$ 的原样保留；
 *   - 不误伤公式内的 LaTeX 换行 `\\[2pt]`（它前面有两个反斜杠）。
 *
 * 很多模型（DeepSeek / Qwen / GPT 等）习惯用 \( \) 写行内公式、用 \[ \] 写独立公式，
 * 而 remark-math 只认美元符号，这就会导致公式被当成普通文字显示——本函数专门修这个。
 */
export function normalizeMath(input: string): string {
  if (!input || !input.includes('\\')) return input;

  let s = input;

  // 独立公式：\[ ... \]
  s = s.replace(/(?<!\\)\\\[([\s\S]*?)(?<!\\)\\\]/g, (match, body: string) => {
    const b = body.trim();
    return b ? `\n$$\n${b}\n$$\n` : match;
  });

  // 行内公式：\( ... \)
  s = s.replace(/(?<!\\)\\\(([\s\S]*?)(?<!\\)\\\)/g, (match, body: string) => {
    const b = body.trim();
    if (!b) return match;
    // 跨行内容用独立公式，避免行内间距/换行规则出问题
    return b.includes('\n') ? `\n$$\n${b}\n$$\n` : `$${b}$`;
  });

  return s;
}
