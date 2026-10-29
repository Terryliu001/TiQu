/**
 * 知识树状态仓库（独立于 PDF 工作台）。
 *
 * 数据 = 种子（src/core/knowledge/seed.ts）+ 用户覆盖层（IndexedDB）。
 * 覆盖层只记差异：custom（新建）/ overrides（改种子）/ hidden（删种子）/
 * edges（加边）/ removedEdges（删边）。这样刷新不丢、种子升级不冲突。
 *
 * AI 对话复用主仓库的 settings 与 core/ai 的 streamChat，上下文是选中词条的正文。
 */
import { create } from 'zustand';
import { TERMS, getChapter } from '../core/knowledge/seed';
import { baseEdges } from '../core/knowledge/graph';
import type { GraphLink, Term } from '../core/knowledge/types';
import type { ChatMessage } from '../types';
import * as db from '../db';
import { streamChat, AiError } from '../core/ai/client';
import { buildTermTurns } from '../core/ai/prompt';
import { useApp } from '../store';

const keyOf = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

interface Overlay {
  custom: Term[];
  overrides: Record<string, Partial<Term>>;
  hidden: string[];
  edges: string[];
  removedEdges: string[];
}

const EMPTY: Overlay = { custom: [], overrides: {}, hidden: [], edges: [], removedEdges: [] };

function mergeTerms(ov: Overlay): Term[] {
  const base = TERMS.filter((t) => !ov.hidden.includes(t.id)).map((t) =>
    ov.overrides[t.id] ? { ...t, ...ov.overrides[t.id] } : t,
  );
  return [...base, ...ov.custom];
}

function mergeLinks(ov: Overlay): GraphLink[] {
  const removed = new Set(ov.removedEdges);
  const links = baseEdges().filter((l) => !removed.has(keyOf(l.source, l.target)));
  const existing = new Set(links.map((l) => keyOf(l.source, l.target)));
  const termIds = new Set(mergeTerms(ov).map((t) => t.id));
  for (const e of ov.edges) {
    const [a, b] = e.split('|');
    if (a && b && termIds.has(a) && termIds.has(b)) {
      const k = keyOf(a, b);
      if (!existing.has(k)) {
        existing.add(k);
        links.push({ source: a, target: b });
      }
    }
  }
  return links;
}

interface KnowledgeState {
  loaded: boolean;
  terms: Term[];
  links: GraphLink[];
  selectedId: string | null;
  hoverId: string | null;
  editId: string | null;
  creating: boolean;
  chats: Record<string, ChatMessage[]>;
  streaming: boolean;

  load: () => Promise<void>;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  startEdit: (id: string) => void;
  startCreate: () => void;
  stopEdit: () => void;

  addTerm: (term: Omit<Term, 'id'>) => void;
  updateTerm: (id: string, patch: Partial<Term>) => void;
  removeTerm: (id: string) => void;
  addEdge: (a: string, b: string) => void;
  removeEdge: (a: string, b: string) => void;

  ask: (termId: string, text: string) => Promise<void>;
  stop: () => void;
  clearChat: (termId: string) => void;
}

let overlay: Overlay = EMPTY;
let abortController: AbortController | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function persist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void db.saveKnowledge(overlay);
  }, 400);
}

function recompute(set: (p: Partial<KnowledgeState>) => void) {
  set({ terms: mergeTerms(overlay), links: mergeLinks(overlay) });
  persist();
}

export const useKnowledge = create<KnowledgeState>((set, get) => ({
  loaded: false,
  terms: TERMS,
  links: baseEdges(),
  selectedId: null,
  hoverId: null,
  editId: null,
  creating: false,
  chats: {},
  streaming: false,

  async load() {
    if (get().loaded) return;
    overlay = await db.loadKnowledge();
    set({
      loaded: true,
      terms: mergeTerms(overlay),
      links: mergeLinks(overlay),
    });
  },

  select(id) {
    set({ selectedId: id, editId: null, creating: false });
  },
  hover(id) {
    set({ hoverId: id });
  },
  startEdit(id) {
    set({ editId: id, creating: false, selectedId: id });
  },
  startCreate() {
    set({ creating: true, editId: null });
  },
  stopEdit() {
    set({ editId: null, creating: false });
  },

  addTerm(data) {
    const id = `u_${Date.now().toString(36)}`;
    const term: Term = { id, ...data };
    overlay = { ...overlay, custom: [...overlay.custom, term] };
    recompute(set);
    set({ selectedId: id, creating: false, editId: null });
  },

  updateTerm(id, patch) {
    const isCustom = overlay.custom.some((t) => t.id === id);
    if (isCustom) {
      overlay = {
        ...overlay,
        custom: overlay.custom.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      };
    } else {
      overlay = {
        ...overlay,
        overrides: { ...overlay.overrides, [id]: { ...overlay.overrides[id], ...patch } },
      };
    }
    recompute(set);
  },

  removeTerm(id) {
    const isCustom = overlay.custom.some((t) => t.id === id);
    if (isCustom) {
      overlay = { ...overlay, custom: overlay.custom.filter((t) => t.id !== id) };
    } else if (!overlay.hidden.includes(id)) {
      overlay = { ...overlay, hidden: [...overlay.hidden, id] };
    }
    recompute(set);
    if (get().selectedId === id) set({ selectedId: null });
  },

  addEdge(a, b) {
    if (a === b) return;
    const k = keyOf(a, b);
    if (overlay.edges.includes(k)) return;
    if (mergeLinks(overlay).some((l) => keyOf(l.source, l.target) === k)) return;
    overlay = { ...overlay, edges: [...overlay.edges, k] };
    recompute(set);
  },

  removeEdge(a, b) {
    const k = keyOf(a, b);
    if (overlay.edges.includes(k)) {
      overlay = { ...overlay, edges: overlay.edges.filter((e) => e !== k) };
    } else if (!overlay.removedEdges.includes(k)) {
      overlay = { ...overlay, removedEdges: [...overlay.removedEdges, k] };
    }
    recompute(set);
  },

  async ask(termId, askText) {
    const { chats, streaming } = get();
    if (streaming) return;
    const settings = useApp.getState().settings;
    if (!settings.apiKey.trim() || !settings.model.trim()) {
      useApp.getState().setSettingsOpen(true);
      return;
    }
    const term = get().terms.find((t) => t.id === termId);
    if (!term) return;

    const history = (chats[termId] ?? []).filter((m) => !m.error);
    const userMessage: ChatMessage = {
      id: `m${Date.now()}`,
      role: 'user',
      content: askText || '请讲解这个词条。',
      at: Date.now(),
      attachLabel: term.name,
    };
    const assistantId = `a${Date.now()}`;
    const assistant: ChatMessage = { id: assistantId, role: 'assistant', content: '', at: Date.now(), streaming: true };

    set({ chats: { ...chats, [termId]: [...(chats[termId] ?? []), userMessage, assistant] }, streaming: true });

    const turns = buildTermTurns(
      settings.systemPrompt,
      { name: term.name, chapterName: getChapter(term.chapter).name, body: term.body },
      history.map((m) => ({ role: m.role, content: m.content })),
      askText,
    );

    abortController = new AbortController();
    let content = '';
    let reasoning = '';
    const patch = (p: Partial<ChatMessage>) => {
      const list = (get().chats[termId] ?? []).map((m) => (m.id === assistantId ? { ...m, ...p } : m));
      set({ chats: { ...get().chats, [termId]: list } });
    };

    try {
      await streamChat(
        settings,
        turns,
        {
          onDelta: (text) => {
            content += text;
            patch({ content });
          },
          onReasoning: (text) => {
            reasoning += text;
            patch({ reasoning });
          },
        },
        abortController.signal,
      );
      patch({ streaming: false });
    } catch (error) {
      const aiError = error as AiError;
      patch({
        streaming: false,
        error: aiError.kind === 'aborted' ? content || '（已取消）' : aiError.message ?? '请求失败',
      });
    } finally {
      set({ streaming: false });
      abortController = null;
      const finalMessages = get().chats[termId] ?? [];
      const projectId = useApp.getState().project?.id;
      if (projectId) void db.saveChat(projectId, `term:${termId}`, finalMessages);
    }
  },

  stop() {
    abortController?.abort();
  },

  clearChat(termId) {
    set({ chats: { ...get().chats, [termId]: [] } });
    const projectId = useApp.getState().project?.id;
    if (projectId) void db.saveChat(projectId, `term:${termId}`, []);
  },
}));
