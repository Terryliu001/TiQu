/**
 * 全局状态。只有一个 store：项目、切题、选中、AI、界面开关。
 *
 * 一条纪律：**自动结果（autoQuestions）永远不改**。
 * 用户的每次编辑都记成一条 Correction，当前 questions = auto + ops 重放。
 * 这样"重新切题"不会丢手改，撤销也只是弹一条重放。
 */
import { create } from 'zustand';
import { PdfDoc } from './core/pdf';
import { cutDocument, type CutProgress } from './core/cut';
import {
  applyCorrection,
  replayCorrections,
  type Correction,
} from './core/corrections';
import { AiError, streamChat } from './core/ai/client';
import { buildTurns, payloadFor, PRESETS } from './core/ai/prompt';
import { defaultSettings, providerOf, type AiSettings } from './core/ai/providers';
import type { ChatMessage, ProjectMeta, Question } from './types';
import * as db from './db';

export type Theme = 'light' | 'dark';

interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error' | 'success';
}

interface AppState {
  // 项目
  project: ProjectMeta | null;
  pdf: PdfDoc | null;
  pageSizes: { index: number; width: number; height: number }[];
  autoQuestions: Question[];
  questions: Question[];
  ops: Correction[];
  cutSource: 'none' | 'text' | 'scan';
  warnings: string[];
  cutting: CutProgress | null;
  cutElapsed: number;

  // 界面
  selectedId: string | null;
  currentPage: number;
  zoom: number;
  theme: Theme;
  railOpen: boolean;
  inspectorOpen: boolean;
  editing: boolean;
  settingsOpen: boolean;
  shortcutsOpen: boolean;
  view: 'workbench' | 'knowledge';
  toast: Toast | null;

  // AI
  settings: AiSettings;
  chats: Record<string, ChatMessage[]>;
  streaming: boolean;

  // 动作
  init: () => Promise<void>;
  openFile: (file: File) => Promise<void>;
  openStoredProject: (id: string) => Promise<void>;
  recut: () => Promise<void>;
  select: (id: string | null) => void;
  setPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  toggleTheme: () => void;
  toggleRail: () => void;
  toggleInspector: () => void;
  toggleEditing: () => void;
  setSettingsOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setView: (view: 'workbench' | 'knowledge') => void;
  showToast: (text: string, kind?: Toast['kind']) => void;

  commit: (op: Correction) => void;
  undo: () => void;
  redo: () => void;

  updateSettings: (patch: Partial<AiSettings>) => void;
  ask: (question: Question, askText: string) => Promise<void>;
  stop: () => void;
  clearChat: (questionId: string) => void;
}

let abortController: AbortController | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let redoStack: Correction[] = [];

const PRESET_ASK = PRESETS[0].ask;

export const useApp = create<AppState>((set, get) => ({
  project: null,
  pdf: null,
  pageSizes: [],
  autoQuestions: [],
  questions: [],
  ops: [],
  cutSource: 'none',
  warnings: [],
  cutting: null,
  cutElapsed: 0,

  selectedId: null,
  currentPage: 0,
  zoom: 1,
  theme: (localStorage.getItem('tiqu.theme') as Theme) || 'light',
  railOpen: true,
  inspectorOpen: true,
  editing: false,
  settingsOpen: false,
  shortcutsOpen: false,
  view: 'workbench',
  toast: null,

  settings: defaultSettings(),
  chats: {},
  streaming: false,

  async init() {
    applyTheme(get().theme);
    const saved = await db.loadSettings();
    if (saved) set({ settings: { ...defaultSettings(), ...saved } });
  },

  async openFile(file) {
    try {
      const previous = get().pdf;
      const pdf = await PdfDoc.open(file);
      previous?.destroy();

      const id = `p_${Date.now().toString(36)}`;
      const now = Date.now();
      const meta: ProjectMeta = {
        id,
        name: file.name.replace(/\.pdf$/i, ''),
        fileName: file.name,
        pageCount: pdf.pageCount,
        sizeBytes: file.size,
        createdAt: now,
        updatedAt: now,
        cutSource: 'none',
      };

      set({
        project: meta,
        pdf,
        pageSizes: pdf.getPageSizes(),
        autoQuestions: [],
        questions: [],
        ops: [],
        selectedId: null,
        currentPage: 0,
        zoom: 1,
        warnings: [],
        chats: {},
        cutSource: 'none',
      });

      await db.savePdf(id, file);
      await get().recut();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      get().showToast(
        /password|encrypt|Password/i.test(message) ? '这份 PDF 有密码，暂不支持打开' : `打开失败：${message}`,
        'error',
      );
    }
  },

  async openStoredProject(id) {
    const stored = await db.loadProject(id);
    const blob = await db.loadPdf(id);
    if (!stored || !blob) {
      get().showToast('找不到这份试卷的本地数据', 'error');
      return;
    }
    const file = new File([blob], stored.meta.fileName, { type: 'application/pdf' });
    const previous = get().pdf;
    const pdf = await PdfDoc.open(file);
    previous?.destroy();
    const chats = await db.loadChats(id);
    const auto = stored.autoQuestions ?? stored.questions;
    set({
      project: stored.meta,
      pdf,
      pageSizes: pdf.getPageSizes(),
      autoQuestions: auto,
      // 直接落"用户看到的结果"，不要再重放一遍 ops（会双重应用）
      questions: stored.questions,
      ops: stored.ops,
      chats,
      cutSource: stored.meta.cutSource,
      selectedId: stored.questions[0]?.id ?? null,
      currentPage: stored.questions[0]?.slices[0]?.page ?? 0,
      warnings: [],
    });
  },

  async recut() {
    const pdf = get().pdf;
    if (!pdf) return;
    set({ cutting: { page: 0, total: pdf.pageCount, phase: 'probing' }, warnings: [] });
    try {
      const result = await cutDocument(pdf, (progress) => set({ cutting: progress }));
      const ops = get().ops;
      const questions = replayCorrections(result.questions, ops);
      const first = questions.find((q) => q.slices.length > 0) ?? questions[0] ?? null;

      set({
        autoQuestions: result.questions,
        questions,
        warnings: result.warnings,
        cutElapsed: result.elapsed,
        cutSource: result.questions[0]?.source === 'scan' ? 'scan' : 'text',
        cutting: null,
        selectedId: first?.id ?? null,
        currentPage: first?.slices[0]?.page ?? 0,
      });
      persist();
      get().showToast(`已切出 ${questions.length} 道题 · ${result.elapsed}ms`, 'success');
    } catch (error) {
      set({ cutting: null });
      get().showToast(`切题失败：${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  },

  select(id) {
    const question = get().questions.find((q) => q.id === id);
    set({ selectedId: id, inspectorOpen: true });
    if (question?.slices[0]) set({ currentPage: question.slices[0].page });
  },

  setPage(page) {
    const total = get().pageSizes.length;
    set({ currentPage: Math.max(0, Math.min(total - 1, page)) });
  },

  setZoom(zoom) {
    set({ zoom: Math.max(0.4, Math.min(3, zoom)) });
  },

  toggleTheme() {
    const theme: Theme = get().theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('tiqu.theme', theme);
    applyTheme(theme);
    set({ theme });
  },

  toggleRail: () => set({ railOpen: !get().railOpen }),
  toggleInspector: () => set({ inspectorOpen: !get().inspectorOpen }),
  toggleEditing: () => set({ editing: !get().editing }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  setView: (view) => set({ view }),

  showToast(text, kind = 'info') {
    const toast = { id: Date.now(), text, kind };
    set({ toast });
    setTimeout(() => {
      if (get().toast?.id === toast.id) set({ toast: null });
    }, 3200);
  },

  commit(op) {
    const questions = applyCorrection(get().questions, op);
    redoStack = [];
    set({ questions, ops: [...get().ops, op] });
    persist();
  },

  undo() {
    const ops = get().ops;
    if (ops.length === 0) {
      get().showToast('没有可撤销的修改');
      return;
    }
    const last = ops[ops.length - 1];
    redoStack.push(last);
    const next = ops.slice(0, -1);
    set({ ops: next, questions: replayCorrections(get().autoQuestions, next) });
    persist();
  },

  redo() {
    if (redoStack.length === 0) {
      get().showToast('没有可重做的修改');
      return;
    }
    const op = redoStack.pop()!;
    const ops = [...get().ops, op];
    set({ ops, questions: replayCorrections(get().autoQuestions, ops) });
    persist();
  },

  updateSettings(patch) {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    void db.saveSettings(settings);
  },

  async ask(question, askText) {
    const { pdf, settings, chats, streaming } = get();
    if (streaming) return;
    if (!pdf) return;

    if (!settings.apiKey.trim()) {
      set({ settingsOpen: true });
      get().showToast('先配置一个 AI 服务，密钥只存在本机');
      return;
    }

    const provider = providerOf(settings.providerId);
    const slice = question.slices[0];
    let image: string | null = null;
    if (settings.sendImage && slice) {
      try {
        image = await pdf.cropRegion(slice.page, slice.rect, 2, 1600);
      } catch {
        image = null;
      }
    }
    const payload = payloadFor(question, image, settings.sendText ? question.stem : null);

    const history = (chats[question.id] ?? []).filter((m) => !m.error);
    const userMessage: ChatMessage = {
      id: `m${Date.now()}`,
      role: 'user',
      content: askText || PRESET_ASK,
      at: Date.now(),
      attachLabel: question.label,
    };
    const assistantId = `a${Date.now()}`;
    const assistant: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      at: Date.now(),
      streaming: true,
    };

    const nextChats = {
      ...chats,
      [question.id]: [...(chats[question.id] ?? []), userMessage, assistant],
    };
    set({ chats: nextChats, streaming: true });

    const turns = buildTurns(
      settings.systemPrompt,
      payload,
      history.map((m) => ({ role: m.role, content: m.content })),
      askText,
    );

    abortController = new AbortController();
    let content = '';
    let reasoning = '';

    const patchAssistant = (patch: Partial<ChatMessage>) => {
      const list = (get().chats[question.id] ?? []).map((m) =>
        m.id === assistantId ? { ...m, ...patch } : m,
      );
      set({ chats: { ...get().chats, [question.id]: list } });
    };

    try {
      await streamChat(
        settings,
        turns,
        {
          onDelta: (text) => {
            content += text;
            patchAssistant({ content });
          },
          onReasoning: (text) => {
            reasoning += text;
            patchAssistant({ reasoning });
          },
        },
        abortController.signal,
      );
      patchAssistant({ streaming: false });
    } catch (error) {
      const aiError = error as AiError;
      if (aiError.kind === 'aborted') {
        patchAssistant({ streaming: false, content: content || '（已取消）' });
      } else {
        patchAssistant({ streaming: false, error: aiError.message ?? '请求失败' });
        get().showToast(aiError.message ?? '请求失败', 'error');
      }
    } finally {
      set({ streaming: false });
      abortController = null;
      const finalMessages = get().chats[question.id] ?? [];
      const projectId = get().project?.id;
      if (projectId && !provider.vision) {
        // 纯文本模型：题面图没发出去，界面上已经有提示，这里只在状态栏体现。
      }
      if (projectId) void db.saveChat(projectId, question.id, finalMessages);
    }
  },

  stop() {
    abortController?.abort();
  },

  clearChat(questionId) {
    const chats = { ...get().chats, [questionId]: [] };
    set({ chats });
    const projectId = get().project?.id;
    if (projectId) void db.saveChat(projectId, questionId, []);
  },
}));

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0C1013' : '#EDE8DF');
}

/** 落盘防抖：连续拖框不会写几十次。 */
function persist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const { project, questions, ops, cutSource, autoQuestions } = useApp.getState();
    if (!project) return;
    void db.saveProject({
      meta: { ...project, updatedAt: Date.now(), cutSource },
      questions,
      ops,
      autoQuestions,
    });
  }, 400);
}
