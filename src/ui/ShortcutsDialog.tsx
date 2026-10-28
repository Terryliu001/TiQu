/** 快捷键面板。工具类应用，键盘路径必须可发现。 */
import { useApp } from '../store';
import { Icon } from './icons';

const KEYS: { keys: string[]; name: string }[] = [
  { keys: ['⌘', 'O'], name: '打开 PDF' },
  { keys: ['↑', '↓'], name: '上一题 / 下一题' },
  { keys: ['J', 'K'], name: '下一题 / 上一题（同 ↑↓）' },
  { keys: ['E'], name: '切换编辑模式' },
  { keys: ['N'], name: '在卷面中央新增一个框' },
  { keys: ['M'], name: '并入上一题' },
  { keys: ['S'], name: '从中间拆分选中题' },
  { keys: ['Del'], name: '删除选中框' },
  { keys: ['⌘', 'Z'], name: '撤销' },
  { keys: ['⌘', '⇧', 'Z'], name: '重做' },
  { keys: ['+', '-'], name: '放大 / 缩小' },
  { keys: ['0'], name: '适应宽度' },
  { keys: ['['], name: '折叠题目栏' },
  { keys: [']'], name: '折叠 AI 面板' },
  { keys: ['Enter'], name: '聚焦 AI 输入框' },
  { keys: ['⌘', 'Enter'], name: '发送' },
  { keys: ['?'], name: '打开这个面板' },
  { keys: ['Esc'], name: '取消选中 / 关闭弹窗' },
];

export function ShortcutsDialog() {
  const open = useApp((s) => s.shortcutsOpen);
  const setOpen = useApp((s) => s.setShortcutsOpen);
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={() => setOpen(false)}>
      <div className="modal" style={{ width: 'min(560px, 100%)' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>快捷键</h3>
          <span className="spacer" />
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="关闭">
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="modal-body">
          <div className="keys">
            {KEYS.map((item) => (
              <div className="key-row" key={item.name}>
                <span className="name">{item.name}</span>
                {item.keys.map((key) => (
                  <span className="kbd" key={key}>
                    {key}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <p style={{ marginTop: 16, fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.7 }}>
            在输入框里打字时，除了 ⌘Enter，其余单键快捷键都不会触发。
          </p>
        </div>
      </div>
    </div>
  );
}
