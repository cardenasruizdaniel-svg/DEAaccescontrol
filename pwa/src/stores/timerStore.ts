import { db } from "@/lib/db";
import type { ActiveTimer } from "@/types";

const TIMER_ID = "current_visit_timer";

export const timerStore = {
  async start(shiftId: string): Promise<void> {
    const now = new Date().toISOString();
    const timer: ActiveTimer = {
      id: TIMER_ID,
      shift_id: shiftId,
      started_at: now,
      elapsed_before: 0,
      status: "running",
      last_updated: now,
    };
    await db.put("active_timer", timer as unknown as Record<string, unknown>);
  },

  async pause(): Promise<void> {
    const timer = await db.get<ActiveTimer>("active_timer", TIMER_ID);
    if (timer && timer.status === "running") {
      const elapsed = timer.elapsed_before + (Date.now() - new Date(timer.last_updated).getTime());
      timer.elapsed_before = elapsed;
      timer.paused_at = new Date().toISOString();
      timer.status = "paused";
      timer.last_updated = new Date().toISOString();
      await db.put("active_timer", timer as unknown as Record<string, unknown>);
    }
  },

  async resume(): Promise<boolean> {
    const timer = await db.get<ActiveTimer>("active_timer", TIMER_ID);
    if (timer && timer.status === "paused") {
      timer.status = "running";
      timer.last_updated = new Date().toISOString();
      await db.put("active_timer", timer as unknown as Record<string, unknown>);
      return true;
    }
    return false;
  },

  async complete(): Promise<{ shiftId: string; totalMs: number } | null> {
    const timer = await db.get<ActiveTimer>("active_timer", TIMER_ID);
    if (!timer) return null;
    const totalMs = timer.elapsed_before + (Date.now() - new Date(timer.last_updated).getTime());
    await db.delete("active_timer", TIMER_ID);
    return { shiftId: timer.shift_id, totalMs };
  },

  async getCurrent(): Promise<ActiveTimer | null> {
    return (await db.get<ActiveTimer>("active_timer", TIMER_ID)) ?? null;
  },

  async getElapsedMs(): Promise<number> {
    const timer = await db.get<ActiveTimer>("active_timer", TIMER_ID);
    if (!timer) return 0;
    if (timer.status === "completed" || timer.status === "paused") {
      return timer.elapsed_before;
    }
    return timer.elapsed_before + (Date.now() - new Date(timer.last_updated).getTime());
  },
};
