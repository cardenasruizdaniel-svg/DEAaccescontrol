import { db } from "./db";
import type { SyncQueueItem } from "@/types";

export async function enqueue(action: SyncQueueItem["action"], store: string, data: Record<string, unknown>): Promise<void> {
  const item: SyncQueueItem = {
    id: crypto.randomUUID(),
    action,
    store,
    data,
    timestamp: Date.now(),
    status: "pending",
    retries: 0,
  };
  await db.put("sync_queue", item as unknown as Record<string, unknown>);
}

export async function getQueueStats(): Promise<{ pending: number; failed: number; completed: number; inProgress: number }> {
  const all = await db.getAll<SyncQueueItem>("sync_queue");
  return {
    pending: all.filter((i) => i.status === "pending").length,
    failed: all.filter((i) => i.status === "failed").length,
    completed: all.filter((i) => i.status === "completed").length,
    inProgress: all.filter((i) => i.status === "in_progress").length,
  };
}

let _apiCallback: ((item: SyncQueueItem) => Promise<boolean>) | null = null;

export function setSyncCallback(cb: (item: SyncQueueItem) => Promise<boolean>): void {
  _apiCallback = cb;
}

async function processItem(item: SyncQueueItem): Promise<void> {
  if (!_apiCallback) return;
  await db.put("sync_queue", { ...item, status: "in_progress" } as unknown as Record<string, unknown>);
  try {
    const success = await _apiCallback(item);
    if (success) {
      await db.put("sync_queue", { ...item, status: "completed" } as unknown as Record<string, unknown>);
    } else {
      throw new Error("API callback returned false");
    }
  } catch {
    const retries = item.retries + 1;
    const status = retries >= 3 ? "failed" : "pending";
    await db.put("sync_queue", { ...item, status, retries, error: String(retries) } as unknown as Record<string, unknown>);
  }
}

export async function processQueue(callback?: (item: SyncQueueItem) => Promise<boolean>): Promise<void> {
  const cb = callback || _apiCallback;
  if (!cb) return;
  const pending = await db.getAll<SyncQueueItem>("sync_queue");
  const toProcess = pending.filter((i) => i.status === "pending" && i.retries < 3);
  for (const item of toProcess) {
    _apiCallback = cb;
    await processItem(item);
  }
}

export async function clearCompleted(): Promise<void> {
  const all = await db.getAll<SyncQueueItem>("sync_queue");
  const completed = all.filter((i) => i.status === "completed");
  for (const item of completed) {
    await db.delete("sync_queue", item.id);
  }
}

let syncInitialized = false;

export function initAutoSync(callback?: (item: SyncQueueItem) => Promise<boolean>): void {
  if (syncInitialized) return;
  syncInitialized = true;
  if (callback) setSyncCallback(callback);
  window.addEventListener("online", () => {
    processQueue().catch(() => {});
  });
  setInterval(() => {
    if (navigator.onLine) {
      processQueue().catch(() => {});
    }
  }, 30000);
}
