import { create } from "zustand";
import { Platform } from "react-native";
import api from "../services/api";
import { offlineDb } from "../services/offlineDb";

const isWeb = Platform.OS === "web";

let NetInfo: any = null;
if (!isWeb) {
  try { NetInfo = require("@react-native-community/netinfo"); } catch {}
}

const WEB_STORAGE_KEY = "dla_offline_records";
const MAX_SYNC_ATTEMPTS = 5;

interface OfflineState {
  records: any[];
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  pendingLocationCount: number;
  lastSyncResult: { synced: number; failed: number; locationsSynced: number } | null;
  addRecord: (record: { type: string; data: Record<string, unknown>; timestamp: string }) => Promise<void>;
  loadRecords: () => Promise<void>;
  syncPending: () => Promise<{ synced: number; failed: number; locationsSynced: number }>;
  startNetworkListener: () => Promise<void>;
  initialize: () => Promise<void>;
}

let netUnsubscribe: (() => void) | null = null;

export const useOfflineStore = create<OfflineState>((set, get) => ({
  records: [],
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  pendingLocationCount: 0,
  lastSyncResult: null,

  initialize: async () => {
    if (!isWeb) {
      await offlineDb.initialize();
      await get().loadRecords();
      const pendingCount = await offlineDb.getPendingCount();
      const pendingLocationCount = await offlineDb.getPendingLocationCount();
      set({ pendingCount, pendingLocationCount });
    }
  },

  addRecord: async (record) => {
    const id = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const newRecord = { ...record, id, synced: false, sync_attempts: 0 };

    if (isWeb) {
      const records = [...get().records, newRecord];
      set({ records, pendingCount: records.filter((r: any) => !r.synced).length });
      localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(records));
    } else {
      await offlineDb.addRecord({ id, type: record.type, data: record.data, timestamp: record.timestamp });
      const pendingCount = await offlineDb.getPendingCount();
      set((s) => ({ records: [...s.records, newRecord], pendingCount }));
    }
  },

  loadRecords: async () => {
    try {
      if (isWeb) {
        const content = localStorage.getItem(WEB_STORAGE_KEY);
        if (content) {
          const records = JSON.parse(content);
          set({ records, pendingCount: records.filter((r: any) => !r.synced).length });
        }
      } else {
        const rows = await offlineDb.getPendingRecords();
        const records = rows.map((r) => ({
          ...r,
          data: JSON.parse(r.data),
          synced: r.synced === 1,
        }));
        const locationCount = await offlineDb.getPendingLocationCount();
        set({ records, pendingCount: records.length, pendingLocationCount: locationCount });
      }
    } catch {}
  },

  syncPending: async () => {
    const state = get();
    if (state.isSyncing || !state.isOnline) return { synced: 0, failed: 0, locationsSynced: 0 };
    set({ isSyncing: true });

    if (isWeb) {
      const pending = state.records.filter((r: any) => !r.synced);
      let synced = 0;
      let failed = 0;

      for (const record of pending) {
        try {
          if (record.type === "entry") await api.post("/access/entry", record.data);
          else if (record.type === "exit") await api.post("/access/exit", record.data);
          else if (record.type === "location") await api.post("/geolocation/location", record.data);
          record.synced = true;
          synced++;
        } catch (e: any) {
          record.sync_attempts++;
          record.last_error = e?.message || "Sync failed";
          failed++;
        }
      }

      set({ records: state.records, isSyncing: false, pendingCount: state.records.filter((r: any) => !r.synced).length });
      localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(state.records));
      const result = { synced, failed, locationsSynced: 0 };
      set({ lastSyncResult: result });
      return result;
    }

    let synced = 0;
    let failed = 0;
    let locationsSynced = 0;

    const pending = await offlineDb.getPendingRecords();
    for (const record of pending) {
      const attempts = record.sync_attempts + 1;
      const backoffMs = Math.min(1000 * Math.pow(2, attempts - 1), 60000);

      try {
        const data = JSON.parse(record.data);
        if (record.type === "entry") await api.post("/access/entry", data);
        else if (record.type === "exit") await api.post("/access/exit", data);
        else if (record.type === "location") await api.post("/geolocation/location", data);
        await offlineDb.markSynced(record.id);
        synced++;
      } catch (e: any) {
        if (attempts >= MAX_SYNC_ATTEMPTS) {
          await offlineDb.markFailed(record.id, attempts, e?.message || "Max attempts reached");
        } else {
          await offlineDb.markFailed(record.id, attempts, e?.message || "Sync failed");
        }
        failed++;
      }

      if (backoffMs > 0 && attempts < MAX_SYNC_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, Math.min(backoffMs, 2000)));
      }
    }

    const pendingLocations = await offlineDb.getPendingLocations();
    for (const loc of pendingLocations) {
      try {
        await api.post("/geolocation/location", {
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          speed: loc.speed,
          heading: loc.heading,
          timestamp: loc.timestamp,
          activity_type: "tracking",
        });
        await offlineDb.markLocationSynced(loc.id);
        locationsSynced++;
      } catch {}
    }

    await offlineDb.cleanSynced(7);
    await offlineDb.cleanSyncedLocations(3);

    const pendingCount = await offlineDb.getPendingCount();
    const pendingLocationCount = await offlineDb.getPendingLocationCount();
    set({ isSyncing: false, pendingCount, pendingLocationCount });

    const result = { synced, failed, locationsSynced };
    set({ lastSyncResult: result });
    return result;
  },

  startNetworkListener: async () => {
    if (netUnsubscribe) return;

    if (isWeb) {
      const handler = () => {
        const isOnline = navigator.onLine;
        const wasOffline = !get().isOnline;
        set({ isOnline });
        if (isOnline && wasOffline) get().syncPending();
      };
      window.addEventListener("online", handler);
      window.addEventListener("offline", handler);
      netUnsubscribe = () => {
        window.removeEventListener("online", handler);
        window.removeEventListener("offline", handler);
      };
    } else if (NetInfo) {
      netUnsubscribe = NetInfo.addEventListener((state: any) => {
        const isOnline = state.isConnected ?? false;
        const wasOffline = !get().isOnline;
        set({ isOnline });
        if (isOnline && wasOffline) {
          setTimeout(() => get().syncPending(), 1500);
        }
      });
    }
  },
}));
