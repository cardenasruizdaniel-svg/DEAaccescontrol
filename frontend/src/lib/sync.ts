import { db } from "./db";

export type SyncOperation = "create" | "update" | "delete";
export type SyncStatus = "pending" | "in_progress" | "completed" | "failed";
export type SyncEntity = "shift" | "attendance" | "visit" | "photo" | "profile";

export interface SyncQueueItem {
  id: string;
  entity: SyncEntity;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  status: SyncStatus;
  createdAt: string;
  retryCount: number;
  error?: string;
}

export async function enqueue(entity: SyncEntity, operation: SyncOperation, payload: Record<string, unknown>): Promise<void> {
  const item: SyncQueueItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    entity,
    operation,
    payload,
    status: "pending",
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
  await db.put("sync_queue", item as unknown as Record<string, unknown>);
}

export async function getPendingItems(): Promise<SyncQueueItem[]> {
  return db.getAllByIndex<SyncQueueItem>("sync_queue", "status", "pending");
}

export async function processQueue(apiCall: (item: SyncQueueItem) => Promise<void>): Promise<{ completed: number; failed: number }> {
  const items = await getPendingItems();
  let completed = 0;
  let failed = 0;

  for (const item of items) {
    await db.put("sync_queue", { ...item, status: "in_progress" } as unknown as Record<string, unknown>);
    try {
      await apiCall(item);
      await db.put("sync_queue", { ...item, status: "completed" } as unknown as Record<string, unknown>);
      completed++;
    } catch (err) {
      const retryCount = (item.retryCount || 0) + 1;
      const status: SyncStatus = retryCount >= 3 ? "failed" : "pending";
      await db.put("sync_queue", {
        ...item,
        status,
        retryCount,
        error: err instanceof Error ? err.message : "Unknown error",
      } as unknown as Record<string, unknown>);
      failed++;
    }
  }
  return { completed, failed };
}

export async function clearCompleted(): Promise<void> {
  const items = await db.getAll<SyncQueueItem>("sync_queue");
  const completed = items.filter((i) => i.status === "completed" || i.status === "failed");
  for (const item of completed) {
    await db.delete("sync_queue", item.id);
  }
}

export async function getQueueStats(): Promise<{ pending: number; inProgress: number; failed: number; completed: number }> {
  const items = await db.getAll<SyncQueueItem>("sync_queue");
  return {
    pending: items.filter((i) => i.status === "pending").length,
    inProgress: items.filter((i) => i.status === "in_progress").length,
    failed: items.filter((i) => i.status === "failed").length,
    completed: items.filter((i) => i.status === "completed").length,
  };
}
