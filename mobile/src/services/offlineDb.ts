import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

let SQLite: any = null;
if (!isWeb) {
  try { SQLite = require("expo-sqlite"); } catch {}
}

const DB_NAME = "dla_offline.db";

let dbInstance: any = null;

async function getDb(): Promise<any> {
  if (isWeb || !SQLite) return null;
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  await dbInstance.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = OFF;

    CREATE TABLE IF NOT EXISTS offline_records (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(type, timestamp, data)
    );

    CREATE TABLE IF NOT EXISTS location_buffer (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL,
      speed REAL,
      heading REAL,
      timestamp TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_offline_synced ON offline_records(synced);
    CREATE INDEX IF NOT EXISTS idx_location_synced ON location_buffer(synced);
    CREATE INDEX IF NOT EXISTS idx_offline_type ON offline_records(type);
  `);
  return dbInstance;
}

export interface OfflineRecordRow {
  id: string;
  type: string;
  data: string;
  timestamp: string;
  synced: number;
  sync_attempts: number;
  last_error: string | null;
  created_at: string;
}

export interface LocationBufferRow {
  id: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: string;
  synced: number;
  created_at: string;
}

export const offlineDb = {
  async addRecord(record: {
    id: string;
    type: string;
    data: Record<string, unknown>;
    timestamp: string;
  }): Promise<void> {
    const db = await getDb();
    if (!db) return;
    try {
      await db.runAsync(
        `INSERT OR IGNORE INTO offline_records (id, type, data, timestamp) VALUES (?, ?, ?, ?)`,
        [record.id, record.type, JSON.stringify(record.data), record.timestamp]
      );
    } catch {}
  },

  async getPendingRecords(): Promise<OfflineRecordRow[]> {
    const db = await getDb();
    if (!db) return [];
    try {
      return await db.getAllAsync(
        `SELECT * FROM offline_records WHERE synced = 0 ORDER BY created_at ASC`
      );
    } catch {
      return [];
    }
  },

  async markSynced(id: string): Promise<void> {
    const db = await getDb();
    if (!db) return;
    try {
      await db.runAsync(`UPDATE offline_records SET synced = 1 WHERE id = ?`, [id]);
    } catch {}
  },

  async markFailed(id: string, attempts: number, error: string): Promise<void> {
    const db = await getDb();
    if (!db) return;
    try {
      await db.runAsync(
        `UPDATE offline_records SET sync_attempts = ?, last_error = ? WHERE id = ?`,
        [attempts, error, id]
      );
    } catch {}
  },

  async getPendingCount(): Promise<number> {
    const db = await getDb();
    if (!db) return 0;
    try {
      const result = await db.getFirstAsync(
        `SELECT COUNT(*) as count FROM offline_records WHERE synced = 0`
      );
      return result?.count ?? 0;
    } catch {
      return 0;
    }
  },

  async cleanSynced(olderThanDays: number = 7): Promise<void> {
    const db = await getDb();
    if (!db) return;
    try {
      await db.runAsync(
        `DELETE FROM offline_records WHERE synced = 1 AND created_at < datetime('now', ?)`,
        [`-${olderThanDays} days`]
      );
    } catch {}
  },

  async addLocation(loc: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    speed?: number | null;
    heading?: number | null;
    timestamp: string;
  }): Promise<void> {
    const db = await getDb();
    if (!db) return;
    try {
      await db.runAsync(
        `INSERT INTO location_buffer (latitude, longitude, accuracy, speed, heading, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
        [loc.latitude, loc.longitude, loc.accuracy ?? null, loc.speed ?? null, loc.heading ?? null, loc.timestamp]
      );
    } catch {}
  },

  async getPendingLocations(): Promise<LocationBufferRow[]> {
    const db = await getDb();
    if (!db) return [];
    try {
      return await db.getAllAsync(
        `SELECT * FROM location_buffer WHERE synced = 0 ORDER BY created_at ASC LIMIT 100`
      );
    } catch {
      return [];
    }
  },

  async markLocationSynced(id: number): Promise<void> {
    const db = await getDb();
    if (!db) return;
    try {
      await db.runAsync(`UPDATE location_buffer SET synced = 1 WHERE id = ?`, [id]);
    } catch {}
  },

  async getPendingLocationCount(): Promise<number> {
    const db = await getDb();
    if (!db) return 0;
    try {
      const result = await db.getFirstAsync(
        `SELECT COUNT(*) as count FROM location_buffer WHERE synced = 0`
      );
      return result?.count ?? 0;
    } catch {
      return 0;
    }
  },

  async cleanSyncedLocations(olderThanDays: number = 3): Promise<void> {
    const db = await getDb();
    if (!db) return;
    try {
      await db.runAsync(
        `DELETE FROM location_buffer WHERE synced = 1 AND created_at < datetime('now', ?)`,
        [`-${olderThanDays} days`]
      );
    } catch {}
  },

  async initialize(): Promise<void> {
    await getDb();
  },
};
