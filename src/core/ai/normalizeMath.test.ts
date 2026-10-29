import { describe, it, expect } from 'vitest';
import { normalizeMath } from './normalizeMath';

describe('normalizeMath', () => {
  it('把行内 \\( \\) 转成 $...$', () => {
    expect(normalizeMath('设 \\(x^2\\) 成立')).toBe('设 $x^2$ 成立');
  });

  it('行内公式里的空格被去掉（避免 remark-math 不认）', () => {
    expect(normalizeMath('\\( a+b \\)')).toBe('$a+b$');
  });

  it('把独立 \\[ \\] 转成 $$ 块', () => {
    const out = normalizeMath('\\[a^2+b^2=c^2\\]');
    expect(out).toContain('$$');
    expect(out).toContain('a^2+b^2=c^2');
    expect(out).not.toContain('\\[');
  });

  it('保留已是 $..$ / $$..$$ 的内容', () => {
    const s = '已知 $a$ 与 $$b$$';
    expect(normalizeMath(s)).toBe(s);
  });

  it('不破坏公式内的换行 \\\\[2pt]', () => {
    const s = '$$\\begin{matrix}a\\\\[2pt]b\\end{matrix}$$';
    expect(normalizeMath(s)).toBe(s);
  });

  it('跨行的 \\( \\) 按独立公式处理', () => {
    const out = normalizeMath('\\(a+b\nc\\)');
    expect(out.trim().startsWith('$$')).toBe(true);
  });
});
