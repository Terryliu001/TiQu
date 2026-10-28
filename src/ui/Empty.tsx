/** 首屏：拖入 PDF 或从最近打开。空态要能解释产品是干什么的。 */
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { listProjects, type StoredProject } from '../db';
import { Icon } from './icons';

export function Empty({ hot }: { hot: boolean }) {
  const openFile = useApp((s) => s.openFile);
  const openStored = useApp((s) => s.openStoredProject);
  const [recent, setRecent] = useState<StoredProject[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void listProjects().then((list) => setRecent(list.slice(0, 5)));
  }, []);

  return (
    <div className="empty">
      <div className="empty-inner">
        <svg className="mark" viewBox="0 0 24 24" aria-hidden="true">
          <use href="#i-logo" />
        </svg>
        <h1>题取</h1>
        <p>
          把一份 PDF 试卷拖进来，自动框出每一道题。选中任意一题，题面会以截图形式交给你的 AI
          ——公式和图形不会被文字转写弄乱。
        </p>

        <div className={`drop${hot ? ' hot' : ''}`} onClick={() => inputRef.current?.click()}>
          <div className="big">把 PDF 拖到这里</div>
          <div className="small">或者点下面的按钮选择文件 · 支持文字版与扫描版</div>
          <button className="btn primary">
            <Icon name="file" size={15} />
            选择 PDF
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void openFile(file);
            e.target.value = '';
          }}
        />

        {recent.length > 0 && (
          <div className="recent">
            <h4>最近打开</h4>
            {recent.map((item) => (
              <button
                key={item.meta.id}
                className="recent-item"
                onClick={() => void openStored(item.meta.id)}
              >
                <Icon name="file" size={14} />
                <span className="rname">{item.meta.name}</span>
                <span className="rmeta">
                  {item.meta.pageCount} 页 · {item.questions.length} 题
                </span>
              </button>
            ))}
          </div>
        )}

        <p style={{ marginTop: 22, fontSize: 11.5, color: 'var(--ink-3)' }}>
          没有现成的卷子？
          <button
            style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 3 }}
            onClick={async () => {
              const response = await fetch('./samples/math-midterm.pdf');
              const blob = await response.blob();
              void openFile(new File([blob], '数学分析（上）期中试卷.pdf', { type: 'application/pdf' }));
            }}
          >
            打开示例试卷
          </button>
        </p>

        <p style={{ marginTop: 14, fontSize: 11, color: 'var(--ink-3)' }}>
          所有文件都在你自己的浏览器里处理，不上传任何服务器。
        </p>
      </div>
    </div>
  );
}
