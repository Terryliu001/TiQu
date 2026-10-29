/**
 * 本地存储（IndexedDB）。
 *
 * 只存三类东西：PDF 原件（Blob）、切题与手改结果、AI 配置与对话。
 * 不上传、不联云——换电脑就重新导入，这是"轻量可转发"的代价，也是隐私的保证。
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AiSettings } from './core/ai/providers';
import type { ChatMessage, ProjectMeta, Question } from './types';
import type { Correction } from './core/corrections';
import type { Term } from './core/knowledge/types';

export interface StoredProject {
  meta: ProjectMeta;
  /** 用户看到的结果（= auto + ops 重放）。 */
  questions: Question[];
  ops: Correction[];
  /** 自动切题结果，撤销与重新切题都要用它。老数据没有时退回 questions。 */
  autoQuestions?: Question[];
}

/** 知识树的用户覆盖层：与种子数据分离，刷新不丢、升级不冲突。 */
export interface KnowledgeOverlay {
  /** 用户新建的词条。 */
  custom: Term[];
  /** 对种子词条的字段覆盖（name/summary/body/chapter）。 */
  overrides: Record<string, Partial<Term>>;
  /** 被用户删除的种子词条 id。 */
  hidden: string[];
  /** 用户新增的边（跨词条关联），格式 "a|b"。 */
  edges: string[];
  /** 用户删除的边（覆盖默认生成）。 */
  removedEdges: string[];
}

interface TiquDB extends DBSchema {
  projects: { key: string; value: StoredProject };
  pdfs: { key: string; value: Blob };
  chats: { key: string; value: { projectId: string; questionId: string; messages: ChatMessage[] } };
  settings: { key: string; value: unknown };
  knowledge: { key: string; value: KnowledgeOverlay };
}

/**
 * 取数据库句柄。在 `file://` 等禁用 IndexedDB 的环境下，`openDB` 会抛错，
 * 这里把失败吞掉、缓存为 null，所有读写函数据此降级为「无持久化」——
 * 功能照样可用，只是刷新不保留（单文件离线版可接受）。
 */
let dbPromise: Promise<IDBPDatabase<TiquDB> | null> | null = null;

function db(): Promise<IDBPDatabase<TiquDB> | null> {
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        if (typeof indexedDB === 'undefined') return null;
        return await openDB<TiquDB>('tiqu', 1, {
          upgrade(database) {
            database.createObjectStore('projects', { keyPath: 'meta.id' });
            database.createObjectStore('pdfs');
            database.createObjectStore('chats');
            database.createObjectStore('settings');
            database.createObjectStore('knowledge');
          },
        });
      } catch {
        return null;
      }
    })();
  }
  return dbPromise;
}

export async function saveProject(project: StoredProject): Promise<void> {
  const database = await db();
  if (!database) return;
  await database.put('projects', project);
}

export async function savePdf(id: string, blob: Blob): Promise<void> {
  const database = await db();
  if (!database) return;
  await database.put('pdfs', blob, id);
}

export async function loadPdf(id: string): Promise<Blob | undefined> {
  const database = await db();
  if (!database) return undefined;
  return database.get('pdfs', id);
}

export async function listProjects(): Promise<StoredProject[]> {
  const database = await db();
  if (!database) return [];
  const all = await database.getAll('projects');
  return all.sort((a, b) => b.meta.updatedAt - a.meta.updatedAt);
}

export async function loadProject(id: string): Promise<StoredProject | undefined> {
  const database = await db();
  if (!database) return undefined;
  return database.get('projects', id);
}

export async function deleteProject(id: string): Promise<void> {
  const database = await db();
  if (!database) return;
  await database.delete('projects', id);
  await database.delete('pdfs', id);
  // 清掉该项目的全部对话
  const keys = await database.getAllKeys('chats');
  for (const key of keys) {
    if (String(key).startsWith(`${id}:`)) await database.delete('chats', key);
  }
}

export async function saveChat(projectId: string, questionId: string, messages: ChatMessage[]): Promise<void> {
  const database = await db();
  if (!database) return;
  await database.put('chats', { projectId, questionId, messages }, `${projectId}:${questionId}`);
}

export async function loadChats(projectId: string): Promise<Record<string, ChatMessage[]>> {
  const database = await db();
  if (!database) return {};
  const all = await database.getAll('chats');
  const out: Record<string, ChatMessage[]> = {};
  for (const item of all) {
    if (item.projectId === projectId) out[item.questionId] = item.messages;
  }
  return out;
}

export async function saveSettings(settings: AiSettings): Promise<void> {
  const database = await db();
  if (!database) return;
  await database.put('settings', settings, 'ai');
}

export async function loadSettings(): Promise<AiSettings | undefined> {
  const database = await db();
  if (!database) return undefined;
  return (await database.get('settings', 'ai')) as AiSettings | undefined;
}

export async function savePreference(key: string, value: unknown): Promise<void> {
  const database = await db();
  if (!database) return;
  await database.put('settings', value, `pref:${key}`);
}

export async function loadPreference<T>(key: string): Promise<T | undefined> {
  const database = await db();
  if (!database) return undefined;
  return (await database.get('settings', `pref:${key}`)) as T | undefined;
}

const EMPTY_OVERLAY: KnowledgeOverlay = { custom: [], overrides: {}, hidden: [], edges: [], removedEdges: [] };

export async function saveKnowledge(overlay: KnowledgeOverlay): Promise<void> {
  const database = await db();
  if (!database) return;
  await database.put('knowledge', overlay, 'overlay');
}

export async function loadKnowledge(): Promise<KnowledgeOverlay> {
  const database = await db();
  if (!database) return EMPTY_OVERLAY;
  return (await database.get('knowledge', 'overlay')) ?? EMPTY_OVERLAY;
}
