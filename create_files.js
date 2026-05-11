#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Define all files to create with their content
const files = {
  'src/services/indexeddb.ts': `/**
 * IndexedDB Service for offline caching and sync queue management
 * Provides persistent storage for app data and queuing of operations during offline periods
 */

export interface CachedItem<T> {
  id: string;
  data: T;
  timestamp: number;
  version: number;
}

export interface SyncQueueItem {
  id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  resource: string;
  data: Record<string, any>;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

const DB_NAME = 'FamilyPlannerDB';
const DB_VERSION = 1;
const STORE_NAMES = {
  CACHE: 'cache',
  SYNC_QUEUE: 'syncQueue',
  METADATA: 'metadata',
};

export class IndexedDBService {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.initializeDB();
  }

  private initializeDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB initialization failed:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAMES.CACHE)) {
          db.createObjectStore(STORE_NAMES.CACHE, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_NAMES.SYNC_QUEUE)) {
          db.createObjectStore(STORE_NAMES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains(STORE_NAMES.METADATA)) {
          db.createObjectStore(STORE_NAMES.METADATA, { keyPath: 'key' });
        }
      };
    });
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return this.dbPromise;
  }

  async cacheData<T>(id: string, data: T, version: number = 1): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction([STORE_NAMES.CACHE], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.CACHE);

    const item: CachedItem<T> = { id, data, timestamp: Date.now(), version };

    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedData<T>(id: string): Promise<T | null> {
    const db = await this.getDB();
    const transaction = db.transaction([STORE_NAMES.CACHE], 'readonly');
    const store = transaction.objectStore(STORE_NAMES.CACHE);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const item = request.result as CachedItem<T> | undefined;
        resolve(item ? item.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllCachedData<T>(prefix: string): Promise<T[]> {
    const db = await this.getDB();
    const transaction = db.transaction([STORE_NAMES.CACHE], 'readonly');
    const store = transaction.objectStore(STORE_NAMES.CACHE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const items = request.result as CachedItem<T>[];
        const filtered = items.filter((item) => item.id.startsWith(prefix)).map((item) => item.data);
        resolve(filtered);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearCachedData(id: string): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction([STORE_NAMES.CACHE], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.CACHE);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllCache(): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction([STORE_NAMES.CACHE], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.CACHE);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addToSyncQueue(operation: 'CREATE' | 'UPDATE' | 'DELETE', resource: string, data: Record<string, any>): Promise<string> {
    const db = await this.getDB();
    const transaction = db.transaction([STORE_NAMES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.SYNC_QUEUE);

    const item: SyncQueueItem = {
      id: \`\${resource}_\${Date.now()}_\${Math.random()}\`,
      operation,
      resource,
      data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3,
    };

    return new Promise((resolve, reject) => {
      const request = store.add(item);
      request.onsuccess = () => resolve(item.id);
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const db = await this.getDB();
    const transaction = db.transaction([STORE_NAMES.SYNC_QUEUE], 'readonly');
    const store = transaction.objectStore(STORE_NAMES.SYNC_QUEUE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeFromSyncQueue(id: string): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction([STORE_NAMES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.SYNC_QUEUE);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateSyncQueueRetry(id: string, retries: number): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction([STORE_NAMES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.SYNC_QUEUE);

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const item = getRequest.result as SyncQueueItem;
        item.retries = retries;
        const updateRequest = store.put(item);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async clearSyncQueue(): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction([STORE_NAMES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.SYNC_QUEUE);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async setMetadata(key: string, value: any): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction([STORE_NAMES.METADATA], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.METADATA);

    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMetadata(key: string): Promise<any | null> {
    const db = await this.getDB();
    const transaction = db.transaction([STORE_NAMES.METADATA], 'readonly');
    const store = transaction.objectStore(STORE_NAMES.METADATA);

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const item = request.result as { key: string; value: any } | undefined;
        resolve(item ? item.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export default new IndexedDBService();
`,
};

const basePath = 'C:\\\\Users\\\\capit\\\\Documents\\\\4391_home_auto\\\\family-planner\\\\frontend';

Object.entries(files).forEach(([filePath, content]) => {
  const fullPath = path.join(basePath, filePath);
  const dir = path.dirname(fullPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(\`Created directory: \${dir}\`);
  }
  
  fs.writeFileSync(fullPath, content);
  console.log(\`Created file: \${fullPath}\`);
});

console.log('All files created successfully!');
