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

export interface StoredProject {
  meta: ProjectMeta;
  /** 用户看到的结果（= auto + ops 重放）。 */
  questions: Question[];
  ops: Correction[];
  /** 自动切题结果，撤销与重新切题都要用它。老数据没有时退回 questions。 */
  autoQuestions?: Question[];
}

interface TiquDB extends DBSchema {
  projects: { key: string; value: StoredProject };
  pdfs: { key: string; value: Blob };
  chats: { key: string; value: { projectId: string; questionId: string; messages: ChatMessage[] } };
  settings: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<TiquDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<TiquDB>('tiqu', 1, {
      upgrade(database) {
        database.createObjectStore('projects', { keyPath: 'meta.id' });
        database.createObjectStore('pdfs');
        database.createObjectStore('chats');
        database.createObjectStore('settings');
      },
    });
  }
  return dbPromise;
}

export async function saveProject(project: StoredProject): Promise<void> {
  const database = await db();
  await database.put('projects', project);
}

export async function savePdf(id: string, blob: Blob): Promise<void> {
  const database = await db();
  await database.put('pdfs', blob, id);
}

export async function loadPdf(id: string): Promise<Blob | undefined> {
  const database = await db();
  return database.get('pdfs', id);
}

export async function listProjects(): Promise<StoredProject[]> {
  const database = await db();
  const all = await database.getAll('projects');
  return all.sort((a, b) => b.meta.updatedAt - a.meta.updatedAt);
}

export async function loadProject(id: string): Promise<StoredProject | undefined> {
  const database = await db();
  return database.get('projects', id);
}

export async function deleteProject(id: string): Promise<void> {
  const database = await db();
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
  await database.put('chats', { projectId, questionId, messages }, `${projectId}:${questionId}`);
}

export async function loadChats(projectId: string): Promise<Record<string, ChatMessage[]>> {
  const database = await db();
  const all = await database.getAll('chats');
  const out: Record<string, ChatMessage[]> = {};
  for (const item of all) {
    if (item.projectId === projectId) out[item.questionId] = item.messages;
  }
  return out;
}

export async function saveSettings(settings: AiSettings): Promise<void> {
  const database = await db();
  await database.put('settings', settings, 'ai');
}

export async function loadSettings(): Promise<AiSettings | undefined> {
  const database = await db();
  return (await database.get('settings', 'ai')) as AiSettings | undefined;
}

export async function savePreference(key: string, value: unknown): Promise<void> {
  const database = await db();
  await database.put('settings', value, `pref:${key}`);
}

export async function loadPreference<T>(key: string): Promise<T | undefined> {
  const database = await db();
  return (await database.get('settings', `pref:${key}`)) as T | undefined;
}
