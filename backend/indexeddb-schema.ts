/**
 * IndexedDB Schema for Offline-First Frontend
 * 
 * Mirrors MongoDB collections in browser for offline capability.
 * Syncs with MongoDB when online, resolves conflicts automatically.
 * 
 * Usage:
 *   import { IndexedDBManager } from '@/db/indexeddb-schema';
 *   const db = new IndexedDBManager();
 *   await db.init();
 */

export interface MongoUser {
  _id: string;
  email: string;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Recipe {
  _id: string;
  name: string;
  description?: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  tags: string[];
  ingredients: RecipeIngredient[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit?: string;
  krogerUpc?: string;
}

export interface PantryItem {
  _id: string;
  userId: string;
  name: string;
  quantity: number;
  unit?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeeklyMenu {
  _id: string;
  userId: string;
  weekNumber: number;
  year: number;
  meals: MealEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MealEntry {
  dayOfWeek: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  recipeId: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings?: number;
}

export interface Child {
  _id: string;
  userId: string;
  name: string;
  dateOfBirth: Date;
  allergies: string[];
  dietaryRestrictions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncQueueItem {
  _id: string;
  collectionName: string;
  operationType: 'create' | 'update' | 'delete';
  documentId: string;
  payload: any;
  timestamp: number;
  status: 'pending' | 'synced' | 'failed' | 'conflict';
  retryCount: number;
  error?: string;
}

export interface SyncMetadata {
  lastSyncTime: number;
  syncInProgress: boolean;
  isOnline: boolean;
  totalPending: number;
}

export class IndexedDBManager {
  private dbName = 'family_planner';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✓ IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores (tables)
        this.createObjectStores(db);
      };
    });
  }

  private createObjectStores(db: IDBDatabase): void {
    // Users store
    if (!db.objectStoreNames.contains('users')) {
      const userStore = db.createObjectStore('users', { keyPath: '_id' });
      userStore.createIndex('email', 'email', { unique: true });
      userStore.createIndex('createdAt', 'createdAt');
    }

    // Recipes store
    if (!db.objectStoreNames.contains('recipes')) {
      const recipeStore = db.createObjectStore('recipes', { keyPath: '_id' });
      recipeStore.createIndex('name', 'name');
      recipeStore.createIndex('tags', 'tags', { multiEntry: true });
      recipeStore.createIndex('createdAt', 'createdAt');
    }

    // Pantry items store
    if (!db.objectStoreNames.contains('pantry_items')) {
      const pantryStore = db.createObjectStore('pantry_items', { keyPath: '_id' });
      pantryStore.createIndex('userId', 'userId');
      pantryStore.createIndex('userIdName', ['userId', 'name'], { unique: true });
      pantryStore.createIndex('expiresAt', 'expiresAt');
    }

    // Weekly menus store
    if (!db.objectStoreNames.contains('weekly_menus')) {
      const menuStore = db.createObjectStore('weekly_menus', { keyPath: '_id' });
      menuStore.createIndex('userId', 'userId');
      menuStore.createIndex('userIdWeek', ['userId', 'weekNumber', 'year'], { unique: true });
    }

    // Children store
    if (!db.objectStoreNames.contains('children')) {
      const childStore = db.createObjectStore('children', { keyPath: '_id' });
      childStore.createIndex('userId', 'userId');
    }

    // Sync queue store
    if (!db.objectStoreNames.contains('sync_queue')) {
      const syncStore = db.createObjectStore('sync_queue', { keyPath: '_id' });
      syncStore.createIndex('status', 'status');
      syncStore.createIndex('collectionName', 'collectionName');
      syncStore.createIndex('timestamp', 'timestamp');
    }

    // Sync metadata store
    if (!db.objectStoreNames.contains('sync_metadata')) {
      db.createObjectStore('sync_metadata', { keyPath: 'key' });
    }

    console.log('✓ Object stores created');
  }

  // ============================================================================
  // Generic Methods
  // ============================================================================

  private async get<T>(storeName: string, key: string): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  private async getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  private async put<T>(storeName: string, item: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async delete(storeName: string, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async query<T>(
    storeName: string,
    indexName: string,
    value: any
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  // ============================================================================
  // Collection-Specific Methods
  // ============================================================================

  async getUser(userId: string): Promise<MongoUser | undefined> {
    return this.get<MongoUser>('users', userId);
  }

  async getUserByEmail(email: string): Promise<MongoUser | undefined> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('users', 'readonly');
      const store = transaction.objectStore('users');
      const index = store.index('email');
      const request = index.get(email);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async saveUser(user: MongoUser): Promise<void> {
    return this.put('users', user);
  }

  // Recipes
  async getRecipe(recipeId: string): Promise<Recipe | undefined> {
    return this.get<Recipe>('recipes', recipeId);
  }

  async getRecipesByTag(tag: string): Promise<Recipe[]> {
    return this.query<Recipe>('recipes', 'tags', tag);
  }

  async searchRecipes(searchTerm: string): Promise<Recipe[]> {
    const all = await this.getAll<Recipe>('recipes');
    return all.filter(
      (r) =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  async saveRecipe(recipe: Recipe): Promise<void> {
    return this.put('recipes', recipe);
  }

  async getAllRecipes(): Promise<Recipe[]> {
    return this.getAll<Recipe>('recipes');
  }

  // Pantry Items
  async getPantryItem(itemId: string): Promise<PantryItem | undefined> {
    return this.get<PantryItem>('pantry_items', itemId);
  }

  async getUserPantry(userId: string): Promise<PantryItem[]> {
    return this.query<PantryItem>('pantry_items', 'userId', userId);
  }

  async savePantryItem(item: PantryItem): Promise<void> {
    return this.put('pantry_items', item);
  }

  async deletePantryItem(itemId: string): Promise<void> {
    return this.delete('pantry_items', itemId);
  }

  // Weekly Menus
  async getWeeklyMenu(menuId: string): Promise<WeeklyMenu | undefined> {
    return this.get<WeeklyMenu>('weekly_menus', menuId);
  }

  async getUserWeeklyMenus(userId: string): Promise<WeeklyMenu[]> {
    return this.query<WeeklyMenu>('weekly_menus', 'userId', userId);
  }

  async saveWeeklyMenu(menu: WeeklyMenu): Promise<void> {
    return this.put('weekly_menus', menu);
  }

  // Children
  async getChild(childId: string): Promise<Child | undefined> {
    return this.get<Child>('children', childId);
  }

  async getUserChildren(userId: string): Promise<Child[]> {
    return this.query<Child>('children', 'userId', userId);
  }

  async saveChild(child: Child): Promise<void> {
    return this.put('children', child);
  }

  // ============================================================================
  // Sync Queue Management
  // ============================================================================

  async queueOperation(operation: SyncQueueItem): Promise<void> {
    return this.put('sync_queue', operation);
  }

  async getPendingOperations(): Promise<SyncQueueItem[]> {
    return this.query<SyncQueueItem>('sync_queue', 'status', 'pending');
  }

  async getFailedOperations(): Promise<SyncQueueItem[]> {
    return this.query<SyncQueueItem>('sync_queue', 'status', 'failed');
  }

  async updateOperationStatus(
    operationId: string,
    status: 'synced' | 'failed' | 'conflict'
  ): Promise<void> {
    const operation = await this.get<SyncQueueItem>('sync_queue', operationId);
    if (operation) {
      operation.status = status;
      await this.put('sync_queue', operation);
    }
  }

  async clearSyncQueue(): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('sync_queue', 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // ============================================================================
  // Sync Metadata
  // ============================================================================

  async getSyncMetadata(): Promise<SyncMetadata> {
    const meta = await this.get<SyncMetadata>('sync_metadata', 'sync_state');
    return meta || {
      lastSyncTime: 0,
      syncInProgress: false,
      isOnline: navigator.onLine,
      totalPending: 0,
    };
  }

  async updateSyncMetadata(partial: Partial<SyncMetadata>): Promise<void> {
    const current = await this.getSyncMetadata();
    const updated = { ...current, ...partial, key: 'sync_state' };
    return this.put('sync_metadata', updated);
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  async importFromServer(data: {
    users?: MongoUser[];
    recipes?: Recipe[];
    pantry_items?: PantryItem[];
    weekly_menus?: WeeklyMenu[];
    children?: Child[];
  }): Promise<void> {
    if (data.users) {
      for (const user of data.users) await this.saveUser(user);
    }
    if (data.recipes) {
      for (const recipe of data.recipes) await this.saveRecipe(recipe);
    }
    if (data.pantry_items) {
      for (const item of data.pantry_items) await this.savePantryItem(item);
    }
    if (data.weekly_menus) {
      for (const menu of data.weekly_menus) await this.saveWeeklyMenu(menu);
    }
    if (data.children) {
      for (const child of data.children) await this.saveChild(child);
    }
    await this.updateSyncMetadata({ lastSyncTime: Date.now() });
  }

  async clearAllData(): Promise<void> {
    for (const storeName of [
      'users',
      'recipes',
      'pantry_items',
      'weekly_menus',
      'children',
    ]) {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }
  }

  // ============================================================================
  // Storage Statistics
  // ============================================================================

  async getStorageStats(): Promise<{
    users: number;
    recipes: number;
    pantry_items: number;
    weekly_menus: number;
    children: number;
    pendingSync: number;
  }> {
    return {
      users: (await this.getAll<MongoUser>('users')).length,
      recipes: (await this.getAll<Recipe>('recipes')).length,
      pantry_items: (await this.getAll<PantryItem>('pantry_items')).length,
      weekly_menus: (await this.getAll<WeeklyMenu>('weekly_menus')).length,
      children: (await this.getAll<Child>('children')).length,
      pendingSync: (await this.getPendingOperations()).length,
    };
  }
}

// Export singleton
export const indexedDB_Manager = new IndexedDBManager();
