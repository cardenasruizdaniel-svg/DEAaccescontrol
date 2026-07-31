const DB_NAME = "dla-offline";
const DB_VERSION = 1;

type StoreSchema = {
  name: string;
  keyPath: string;
  indexes?: { name: string; keyPath: string; unique?: boolean }[];
};

const STORES: StoreSchema[] = [
  { name: "sync_queue", keyPath: "id", indexes: [{ name: "status", keyPath: "status" }] },
  { name: "shifts", keyPath: "id", indexes: [{ name: "status", keyPath: "status" }, { name: "employee_id", keyPath: "employee_id" }] },
  { name: "schedules", keyPath: "id", indexes: [{ name: "employee_id", keyPath: "employee_id" }, { name: "date", keyPath: "shift_date" }] },
  { name: "visits", keyPath: "id", indexes: [{ name: "status", keyPath: "status" }, { name: "employee_id", keyPath: "employee_id" }] },
  { name: "photos", keyPath: "id" },
  { name: "payroll", keyPath: "id", indexes: [{ name: "employee_id", keyPath: "employee_id" }] },
  { name: "profile", keyPath: "id" },
  { name: "config", keyPath: "key" },
  { name: "attendance", keyPath: "id", indexes: [{ name: "employee_id", keyPath: "employee_id" }, { name: "date", keyPath: "date" }] },
  { name: "pending_photos", keyPath: "id" },
];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      STORES.forEach((store) => {
        if (!db.objectStoreNames.contains(store.name)) {
          const os = db.createObjectStore(store.name, { keyPath: store.keyPath });
          store.indexes?.forEach((idx) => os.createIndex(idx.name, idx.keyPath, { unique: idx.unique }));
        }
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const db = {
  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  },

  async get<T>(storeName: string, key: string): Promise<T | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  },

  async getAllByIndex<T>(storeName: string, indexName: string, value: string): Promise<T[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).index(indexName).getAll(value);
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  },

  async put(storeName: string, data: Record<string, unknown>): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const req = tx.objectStore(storeName).put(data);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  },

  async delete(storeName: string, key: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const req = tx.objectStore(storeName).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  },

  async clear(storeName: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const req = tx.objectStore(storeName).clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  },

  async count(storeName: string): Promise<number> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  },
};
