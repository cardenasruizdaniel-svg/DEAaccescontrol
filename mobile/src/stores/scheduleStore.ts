import { create } from "zustand";
import SecureStore from "../services/storage";
import api from "../services/api";
import { Shift } from "../types";
import { useAuthStore } from "./authStore";

const CACHE_KEY_PREFIX = "schedule_cache_";

interface ScheduleState {
  shifts: Shift[];
  selectedDate: string;
  isLoading: boolean;
  fetchShifts: (startDate?: string, endDate?: string) => Promise<void>;
  setSelectedDate: (date: string) => void;
}

async function loadCachedShifts(cacheKey: string): Promise<Shift[]> {
  try {
    const raw = await SecureStore.getItemAsync(CACHE_KEY_PREFIX + cacheKey);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function cacheShifts(cacheKey: string, shifts: Shift[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(CACHE_KEY_PREFIX + cacheKey, JSON.stringify(shifts));
  } catch {}
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  shifts: [],
  selectedDate: new Date().toISOString().split("T")[0],
  isLoading: false,

  fetchShifts: async (startDate?: string, endDate?: string) => {
    const cacheKey = `${startDate || "all"}_${endDate || "all"}`;
    set({ isLoading: true });
    try {
      const employeeId = useAuthStore.getState().employeeId;
      if (!employeeId) return;
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const res = await api.get(`/scheduling/employee/${employeeId}/shifts`, { params });
      const data = res.data || [];
      set({ shifts: data });
      await cacheShifts(cacheKey, data);
    } catch {
      const cached = await loadCachedShifts(cacheKey);
      if (cached.length > 0) set({ shifts: cached });
    }
    set({ isLoading: false });
  },

  setSelectedDate: (date: string) => set({ selectedDate: date }),
}));
