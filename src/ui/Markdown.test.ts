import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Markdown } from './Markdown';

const render = (s: string) => renderToStaticMarkup(createElement(Markdown, null, s));

describe('Markdown 公式渲染', () => {
  it('$...$ 渲染为 KaTeX', () => {
    expect(render('$x^2$')).toContain('katex');
  });

  it('\\(...\\) 渲染为 KaTeX（不再显示原始定界符）', () => {
    const html = render('设 \\(x^2\\) 成立');
    expect(html).toContain('katex');
    expect(html).not.toContain('\\(');
  });

  it('\\[...\\] 渲染为独立公式', () => {
    const html = render('\\[a^2+b^2=c^2\\]');
    expect(html).toContain('katex-display');
  });
});
