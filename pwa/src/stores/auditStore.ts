import { db } from "@/lib/db";
import type { AuditLog } from "@/types";

export const auditStore = {
  async log(event: Omit<AuditLog, "id" | "timestamp" | "synced">): Promise<string> {
    const id = crypto.randomUUID();
    const entry: AuditLog = {
      ...event,
      id,
      timestamp: new Date().toISOString(),
      synced: false,
    };
    await db.put("audit_log", entry as unknown as Record<string, unknown>);
    return id;
  },

  async getByShift(shiftId: string): Promise<AuditLog[]> {
    return db.getAllByIndex<AuditLog>("audit_log", "shift_id", shiftId);
  },

  async getUnsynced(): Promise<AuditLog[]> {
    return db.getAllByIndex<AuditLog>("audit_log", "synced", "false");
  },

  async markSynced(id: string): Promise<void> {
    const item = await db.get<AuditLog>("audit_log", id);
    if (item) {
      await db.put("audit_log", { ...item, synced: true } as unknown as Record<string, unknown>);
    }
  },

  async getAll(): Promise<AuditLog[]> {
    return db.getAll<AuditLog>("audit_log");
  },
};
