/**
 * Offline Sync Service
 * Handles synchronization between offline storage and backend API
 * Implements retry logic, queue management, and automatic sync on connectivity changes
 */

import indexedDBService, { SyncQueueItem } from './services.indexeddb';

export interface SyncResult {
  successful: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

const MAX_RETRIES = 3;
const SYNC_INTERVAL = 5000; // 5 seconds
const SYNC_TIMEOUT = 10000; // 10 seconds per request

let syncInProgress = false;
let lastSyncTime = 0;

/**
 * Queue an operation for sync
 */
export async function queueOperation(
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  resource: string,
  data: Record<string, any>
): Promise<string> {
  return indexedDBService.addToSyncQueue(operation, resource, data);
}

/**
 * Process all pending sync operations
 */
export async function processSyncQueue(apiBaseUrl: string): Promise<SyncResult> {
  if (syncInProgress || !navigator.onLine) {
    return { successful: 0, failed: 0, errors: [] };
  }

  syncInProgress = true;
  const result: SyncResult = { successful: 0, failed: 0, errors: [] };

  try {
    const queue = await indexedDBService.getSyncQueue();

    for (const operation of queue) {
      try {
        await syncOperation(operation, apiBaseUrl);
        await indexedDBService.removeFromSyncQueue(operation.id);
        result.successful++;
      } catch (error) {
        const newRetries = operation.retries + 1;
        if (newRetries >= operation.maxRetries) {
          await indexedDBService.removeFromSyncQueue(operation.id);
          result.failed++;
          result.errors.push({
            id: operation.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        } else {
          await indexedDBService.updateSyncQueueRetry(operation.id, newRetries);
        }
      }
    }

    lastSyncTime = Date.now();
    await indexedDBService.setMetadata('lastSyncTime', lastSyncTime);
  } finally {
    syncInProgress = false;
  }

  return result;
}

/**
 * Sync a single operation to the backend
 */
async function syncOperation(operation: SyncQueueItem, apiBaseUrl: string): Promise<void> {
  const url = `${apiBaseUrl}/${operation.resource}`;
  const method = mapOperationToMethod(operation.operation);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SYNC_TIMEOUT);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
      body: method !== 'GET' ? JSON.stringify(operation.data) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Sync failed with status ${response.status}: ${response.statusText}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Map operation type to HTTP method
 */
function mapOperationToMethod(operation: 'CREATE' | 'UPDATE' | 'DELETE'): string {
  const methodMap: Record<string, string> = {
    CREATE: 'POST',
    UPDATE: 'PUT',
    DELETE: 'DELETE',
  };
  return methodMap[operation] || 'POST';
}

/**
 * Start automatic sync interval
 */
export function startAutoSync(apiBaseUrl: string): () => void {
  const interval = setInterval(async () => {
    if (navigator.onLine) {
      try {
        await processSyncQueue(apiBaseUrl);
      } catch (error) {
        console.error('Auto-sync error:', error);
      }
    }
  }, SYNC_INTERVAL);

  return () => clearInterval(interval);
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<{
  isSyncing: boolean;
  pendingOperations: number;
  lastSyncTime: number | null;
}> {
  const queue = await indexedDBService.getSyncQueue();
  const savedLastSyncTime = await indexedDBService.getMetadata('lastSyncTime');

  return {
    isSyncing: syncInProgress,
    pendingOperations: queue.length,
    lastSyncTime: savedLastSyncTime || lastSyncTime || null,
  };
}

/**
 * Clear all pending sync operations
 */
export async function clearSyncQueue(): Promise<void> {
  await indexedDBService.clearSyncQueue();
}
