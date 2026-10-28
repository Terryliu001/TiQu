/** 顶栏：品牌、文件、重新切题、主题、设置、问 AI。 */
import { useRef } from 'react';
import { useApp } from '../store';
import { Icon } from './icons';

export function TopBar() {
  const project = useApp((s) => s.project);
  const pdf = useApp((s) => s.pdf);
  const theme = useApp((s) => s.theme);
  const toggleTheme = useApp((s) => s.toggleTheme);
  const toggleEditing = useApp((s) => s.toggleEditing);
  const editing = useApp((s) => s.editing);
  const toggleInspector = useApp((s) => s.toggleInspector);
  const inspectorOpen = useApp((s) => s.inspectorOpen);
  const railOpen = useApp((s) => s.railOpen);
  const toggleRail = useApp((s) => s.toggleRail);
  const setSettingsOpen = useApp((s) => s.setSettingsOpen);
  const setShortcutsOpen = useApp((s) => s.setShortcutsOpen);
  const recut = useApp((s) => s.recut);
  const openFile = useApp((s) => s.openFile);
  const cutting = useApp((s) => s.cutting);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = () => inputRef.current?.click();

  return (
    <header className="topbar">
      <div className="brand">
        <svg className="mark" viewBox="0 0 24 24" aria-hidden="true">
          <use href="#i-logo" />
        </svg>
        <div>
          <div className="name">题取</div>
          <div className="en">PDF QUESTION ASSISTANT</div>
        </div>
      </div>

      <div className="vsep" />

      <button className="file-chip" onClick={pick} title="打开另一份 PDF">
        <Icon name="file" size={15} />
        <span className="fname">{project?.fileName ?? '打开 PDF'}</span>
        {project && <span className="meta">{project.pageCount} 页</span>}
        <Icon name="chev" size={14} />
      </button>

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

      <div className="top-right">
        <button
          className={`btn${editing ? ' primary' : ''}`}
          onClick={toggleEditing}
          title="编辑模式（E）：在卷面上画新框"
        >
          <Icon name="edit" size={15} />
          <span>{editing ? '正在编辑' : '编辑框'}</span>
        </button>

        <button className="btn" onClick={() => void recut()} disabled={!pdf || Boolean(cutting)} title="重新切题（保留手改）">
          <Icon name="rescan" size={15} />
          <span>重新切题</span>
        </button>

        <button className="icon-btn" onClick={toggleRail} title="折叠题目栏（[）">
          <Icon name={railOpen ? 'chev' : 'chev'} size={16} style={{ transform: railOpen ? 'rotate(90deg)' : 'rotate(-90deg)' }} />
        </button>

        <button
          className="icon-btn"
          onClick={toggleTheme}
          title={theme === 'light' ? '切到深色（暗处看卷更舒服）' : '切到浅色'}
        >
          <Icon name={theme === 'light' ? 'sun' : 'moon'} size={16} />
        </button>

        <button className="icon-btn" onClick={() => setShortcutsOpen(true)} title="快捷键（?）">
          <Icon name="keyboard" size={16} />
        </button>

        <button className="icon-btn" onClick={() => setSettingsOpen(true)} title="AI 设置">
          <Icon name="gear" size={16} />
        </button>

        <div className="vsep" style={{ margin: '0 4px' }} />

        <button className={`btn primary`} onClick={toggleInspector} title="AI 面板（]）">
          <Icon name="ai" size={15} />
          <span>{inspectorOpen ? '收起 AI' : '问 AI'}</span>
        </button>
      </div>
    </header>
  );
}
