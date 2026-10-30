/**
 * 应用外壳：三栏 + 状态栏 + 全局快捷键 + 拖入。
 *
 * 快捷键的边界：输入框里打字时只放行 ⌘Enter / Esc / ⌘Z，
 * 其余单键一律不拦——否则用户在追问框里打 "s" 会被吃掉。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from './store';
import { Canvas } from './ui/Canvas';
import { Empty } from './ui/Empty';
import { Icon, IconSprite } from './ui/icons';
import { Inspector } from './ui/Inspector';
import { Rail } from './ui/Rail';
import { SettingsDialog } from './ui/SettingsDialog';
import { ShortcutsDialog } from './ui/ShortcutsDialog';
import { TopBar } from './ui/TopBar';
import { KnowledgeTree } from './ui/KnowledgeTree';
import { QBank } from './ui/QBank';
import { useKnowledge } from './store/knowledge';
import { BANK_STATS } from './core/qbank/seed';
import { makeManualQuestion } from './core/corrections';
import { providerOf } from './core/ai/providers';

/** StrictMode 会把 effect 跑两遍，示例卷只开一次。 */
let sampleOpened = false;

export function App() {
  const project = useApp((s) => s.project);
  const questions = useApp((s) => s.questions);
  const selectedId = useApp((s) => s.selectedId);
  const select = useApp((s) => s.select);
  const ops = useApp((s) => s.ops);
  const cutSource = useApp((s) => s.cutSource);
  const cutElapsed = useApp((s) => s.cutElapsed);
  const cutting = useApp((s) => s.cutting);
  const currentPage = useApp((s) => s.currentPage);
  const pageSizes = useApp((s) => s.pageSizes);
  const zoom = useApp((s) => s.zoom);
  const setZoom = useApp((s) => s.setZoom);
  const settings = useApp((s) => s.settings);
  const toast = useApp((s) => s.toast);
  const streaming = useApp((s) => s.streaming);
  const view = useApp((s) => s.view);
  const init = useApp((s) => s.init);
  const openFile = useApp((s) => s.openFile);
  const undo = useApp((s) => s.undo);
  const redo = useApp((s) => s.redo);
  const toggleEditing = useApp((s) => s.toggleEditing);
  const toggleRail = useApp((s) => s.toggleRail);
  const toggleInspector = useApp((s) => s.toggleInspector);
  const setShortcutsOpen = useApp((s) => s.setShortcutsOpen);
  const setSettingsOpen = useApp((s) => s.setSettingsOpen);
  const showToast = useApp((s) => s.showToast);
  const commit = useApp((s) => s.commit);

  const kTerms = useKnowledge((s) => s.terms);
  const kLinks = useKnowledge((s) => s.links);
  const kSelected = useKnowledge((s) => s.selectedId);

  const [hot, setHot] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void init();
  }, [init]);

  // 示例卷：`?sample=math-midterm` 直接打开内置试卷（也用于自动化截图与回归）
  useEffect(() => {
    const sample = new URLSearchParams(window.location.search).get('sample');
    if (!sample || sampleOpened) return;
    sampleOpened = true;
    void (async () => {
      try {
        const response = await fetch(`./samples/${sample}.pdf`);
        if (!response.ok) return;
        const blob = await response.blob();
        await openFile(new File([blob], `${sample}.pdf`, { type: 'application/pdf' }));
        // 清掉 query，否则刷新会重复导入一份示例
        window.history.replaceState({}, '', window.location.pathname);
      } catch {
        // 示例读不到就算了，不影响正常使用
      }
    })();
  }, [openFile]);

  const stepSelection = useCallback(
    (delta: number) => {
      const list = useApp.getState().questions;
      if (list.length === 0) return;
      const index = list.findIndex((q) => q.id === useApp.getState().selectedId);
      const next = index < 0 ? (delta > 0 ? 0 : list.length - 1) : (index + delta + list.length) % list.length;
      select(list[next].id);
    },
    [select],
  );

  // 全局快捷键
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key;

      if (mod && key.toLowerCase() === 'o') {
        event.preventDefault();
        fileInputRef.current?.click();
        return;
      }
      if (mod && key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (key === 'Escape') {
        if (useApp.getState().settingsOpen) setSettingsOpen(false);
        else if (useApp.getState().shortcutsOpen) setShortcutsOpen(false);
        else select(null);
        return;
      }
      if (typing) return;

      const state = useApp.getState();
      if (!state.pdf) return;

      switch (key) {
        case 'j':
        case 'ArrowDown':
          event.preventDefault();
          stepSelection(1);
          break;
        case 'k':
        case 'ArrowUp':
          event.preventDefault();
          stepSelection(-1);
          break;
        case 'e':
          toggleEditing();
          break;
        case 'n': {
          const size = state.pageSizes[state.currentPage];
          if (!size) break;
          const rect = {
            left: size.width * 0.12,
            top: size.height * 0.32,
            width: size.width * 0.72,
            height: size.height * 0.16,
          };
          const question = makeManualQuestion(state.currentPage, rect, `新 ${state.questions.length + 1}`);
          commit({ t: 'add', question });
          select(question.id);
          showToast('已加一个题目框，拖角调整范围');
          break;
        }
        case 'm': {
          const id = state.selectedId;
          if (!id) break;
          const index = state.questions.findIndex((q) => q.id === id);
          if (index <= 0) {
            showToast('已经是第一题');
            break;
          }
          commit({ t: 'merge', id });
          break;
        }
        case 's': {
          const q = state.questions.find((item) => item.id === state.selectedId);
          const slice = q?.slices.find((item) => item.page === state.currentPage) ?? q?.slices[0];
          if (!q || !slice) break;
          commit({
            t: 'split',
            id: q.id,
            page: slice.page,
            y: slice.rect.top + slice.rect.height / 2,
            newId: `m_${Date.now().toString(36)}`,
            label: `${q.label}′`,
          });
          break;
        }
        case 'Delete':
        case 'Backspace': {
          const id = state.selectedId;
          if (!id) break;
          commit({ t: 'delete', id });
          select(null);
          break;
        }
        case '+':
        case '=':
          setZoom(state.zoom + 0.1);
          break;
        case '-':
          setZoom(state.zoom - 0.1);
          break;
        case '0':
          setZoom(1);
          break;
        case '[':
          toggleRail();
          break;
        case ']':
          toggleInspector();
          break;
        case '?':
          setShortcutsOpen(true);
          break;
        case 'Enter': {
          const textarea = document.querySelector('.composer-box textarea') as HTMLTextAreaElement | null;
          textarea?.focus();
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    commit,
    redo,
    select,
    setSettingsOpen,
    setShortcutsOpen,
    setZoom,
    showToast,
    stepSelection,
    toggleEditing,
    toggleInspector,
    toggleRail,
    undo,
  ]);

  const provider = providerOf(settings.providerId);
  const configured = Boolean(settings.apiKey.trim() && settings.model.trim());
  const manualCount = ops.length;

  return (
    <div
      className="app"
      onDragOver={(event) => {
        event.preventDefault();
        setHot(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setHot(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setHot(false);
        const file = event.dataTransfer.files?.[0];
        if (file && /\.pdf$/i.test(file.name)) void openFile(file);
        else if (file) showToast('只支持 PDF 文件', 'error');
      }}
    >
      <IconSprite />
      <TopBar />

      {view === 'qbank' ? (
        <>
          <QBank />
          <footer className="statusbar">
            <span className="s">
              <Icon name="shelf" size={12} />
              题库 · {BANK_STATS.books} 册 · {BANK_STATS.questions} 题
            </span>
            <span className="grow" />
            <span className="s">
              <span className={`pip${configured ? '' : ' off'}`} />
              {configured ? `${provider.name} · ${settings.model}` : 'AI 未配置'}
            </span>
          </footer>
        </>
      ) : view === 'knowledge' ? (
        <>
          <KnowledgeTree />
          <footer className="statusbar">
            <span className="s">
              <Icon name="graph" size={12} />
              知识树 · {kTerms.length} 词条 · {kLinks.length} 关联
            </span>
            <span className="grow" />
            {kSelected && (
              <span className="s">已选：{kTerms.find((t) => t.id === kSelected)?.name ?? ''}</span>
            )}
            {streaming && <span className="s">AI 正在回答…</span>}
            <span className="s">
              <span className={`pip${configured ? '' : ' off'}`} />
              {configured ? `${provider.name} · ${settings.model}` : 'AI 未配置'}
            </span>
          </footer>
        </>
      ) : project ? (
        <>
          <div className="workspace">
            <Rail />
            <Canvas />
            <Inspector />
          </div>

          <footer className="statusbar">
            <span className="s">
              <Icon name="bolt" size={12} />
              {cutSource === 'scan' ? '版面切题' : cutSource === 'text' ? '文本层切题' : '未切题'}
              {questions.length > 0 && ` · ${questions.length} 道`}
              {cutElapsed > 0 && ` · ${cutElapsed}ms`}
            </span>
            <span className="s">
              第 {currentPage + 1} / {pageSizes.length} 页 · {Math.round(zoom * 100)}%
            </span>
            {manualCount > 0 && <span className="s">已手改 {manualCount} 处</span>}
            {cutting && <span className="s">切题中…</span>}
            <span className="grow" />
            {streaming && <span className="s">AI 正在回答…</span>}
            <span className="s">
              <span className={`pip${configured ? '' : ' off'}`} />
              {configured ? `${provider.name} · ${settings.model}` : 'AI 未配置'}
            </span>
          </footer>
        </>
      ) : (
        <>
          <Empty hot={hot} />
          <footer className="statusbar">
            <span className="s">
              <Icon name="bolt" size={12} />
              纯本地处理 · 不上传文件
            </span>
            <span className="grow" />
            <span className="s">
              <span className={`pip${configured ? '' : ' off'}`} />
              {configured ? `${provider.name} · ${settings.model}` : 'AI 未配置'}
            </span>
          </footer>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void openFile(file);
          event.target.value = '';
        }}
      />

      <SettingsDialog />
      <ShortcutsDialog />

      {toast && (
        <div className={`toast ${toast.kind}`} role="status">
          {toast.kind === 'error' ? <Icon name="close" size={13} /> : <Icon name="check" size={13} />}
          {toast.text}
        </div>
      )}
    </div>
  );
}
