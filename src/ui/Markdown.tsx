/** Markdown + LaTeX 渲染。做题场景里公式是刚需，不能只显示原始 $..$。 */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false, output: 'html' }]]}
      components={{
        a: ({ children: text, href }) => (
          <a href={href} target="_blank" rel="noreferrer noopener">
            {text}
          </a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
