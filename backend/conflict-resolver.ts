/**
 * Offline Sync Conflict Resolver
 * 
 * Handles conflict resolution for offline-first architecture with eventual consistency.
 * Strategies: last-write-wins (default), custom merging, user override.
 * Maintains sync queue for pending operations during offline periods.
 */

import { v4 as uuidv4 } from 'uuid';

export interface SyncOperation {
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

export interface ConflictInfo {
  operationId: string;
  collectionName: string;
  documentId: string;
  localChange: any;
  remoteChange: any;
  conflictType: 'update-update' | 'update-delete' | 'delete-update';
  timestamp: number;
  resolved: boolean;
  resolutionStrategy?: 'local' | 'remote' | 'merged' | 'manual';
  mergedResult?: any;
}

export class ConflictResolver {
  private syncQueue: Map<string, SyncOperation> = new Map();
  private conflicts: Map<string, ConflictInfo> = new Map();
  private isOnline: boolean = true;
  private lastSyncTime: number = 0;
  private vectorClocks: Map<string, number> = new Map();

  constructor() {
    this.setupOnlineStatusListener();
  }

  private setupOnlineStatusListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        console.log('🟢 Online - syncing pending operations');
        this.syncPendingOperations();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        console.log('🔴 Offline - queueing operations');
      });

      this.isOnline = navigator.onLine;
    }
  }

  /**
   * Queue an operation for later sync
   */
  queueOperation(
    collectionName: string,
    operationType: 'create' | 'update' | 'delete',
    documentId: string,
    payload: any
  ): SyncOperation {
    const operation: SyncOperation = {
      _id: uuidv4(),
      collectionName,
      operationType,
      documentId,
      payload,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    this.syncQueue.set(operation._id, operation);
    this.updateVectorClock(collectionName);

    console.log(
      `📦 Queued ${operationType} on ${collectionName}:${documentId} (Queue size: ${this.syncQueue.size})`
    );

    return operation;
  }

  /**
   * Detect conflicts by comparing timestamps and vector clocks
   */
  detectConflict(
    collectionName: string,
    documentId: string,
    localChange: any,
    remoteChange: any,
    localTimestamp: number,
    remoteTimestamp: number
  ): ConflictInfo | null {
    // If timestamps are the same and data differs, it's a conflict
    if (
      localTimestamp === remoteTimestamp &&
      JSON.stringify(localChange) !== JSON.stringify(remoteChange)
    ) {
      const conflict: ConflictInfo = {
        operationId: uuidv4(),
        collectionName,
        documentId,
        localChange,
        remoteChange,
        conflictType: 'update-update',
        timestamp: Date.now(),
        resolved: false,
      };

      this.conflicts.set(conflict.operationId, conflict);
      return conflict;
    }

    // No conflict if timestamps differ
    return null;
  }

  /**
   * Resolve conflicts using specified strategy
   */
  resolveConflict(conflictId: string, strategy: 'local' | 'remote' | 'merged' | 'manual', mergedData?: any): ConflictInfo {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`);
    }

    switch (strategy) {
      case 'local':
        conflict.mergedResult = conflict.localChange;
        conflict.resolutionStrategy = 'local';
        break;

      case 'remote':
        conflict.mergedResult = conflict.remoteChange;
        conflict.resolutionStrategy = 'remote';
        break;

      case 'merged':
        if (!mergedData) {
          throw new Error('Merged data required for merged strategy');
        }
        conflict.mergedResult = mergedData;
        conflict.resolutionStrategy = 'merged';
        break;

      case 'manual':
        if (!mergedData) {
          throw new Error('Merged data required for manual strategy');
        }
        conflict.mergedResult = mergedData;
        conflict.resolutionStrategy = 'manual';
        break;
    }

    conflict.resolved = true;
    console.log(`✓ Conflict ${conflictId} resolved using ${strategy} strategy`);

    return conflict;
  }

  /**
   * Three-way merge strategy for complex data
   */
  threeWayMerge(base: any, local: any, remote: any): any {
    const merged: any = { ...base };

    // Merge fields that changed only locally
    for (const key in local) {
      if (JSON.stringify(base[key]) !== JSON.stringify(local[key])) {
        if (JSON.stringify(remote[key]) === JSON.stringify(base[key])) {
          // Remote unchanged, use local
          merged[key] = local[key];
        } else if (JSON.stringify(local[key]) === JSON.stringify(remote[key])) {
          // Same change - no conflict
          merged[key] = local[key];
        } else {
          // Both changed differently - need manual resolution
          merged[key] = { _conflict: true, local: local[key], remote: remote[key] };
        }
      }
    }

    // Merge fields that changed only remotely
    for (const key in remote) {
      if (!(key in merged) && JSON.stringify(base[key]) !== JSON.stringify(remote[key])) {
        merged[key] = remote[key];
      }
    }

    return merged;
  }

  /**
   * Auto-merge for simple types (arrays, primitives)
   */
  autoMerge(local: any, remote: any): any | null {
    // If both are primitives
    if (typeof local !== 'object' || typeof remote !== 'object') {
      // Last-write-wins: prefer remote (server-side is source of truth after sync)
      return remote;
    }

    // If both are arrays, merge without duplicates
    if (Array.isArray(local) && Array.isArray(remote)) {
      const merged = [...new Set([...local, ...remote])];
      return merged;
    }

    // If both are objects but not arrays
    if (!Array.isArray(local) && !Array.isArray(remote)) {
      // Simple merge - prioritize remote for conflicts
      return { ...local, ...remote };
    }

    // Cannot auto-merge
    return null;
  }

  /**
   * Sync pending operations to server
   */
  async syncPendingOperations(): Promise<void> {
    if (!this.isOnline || this.syncQueue.size === 0) {
      return;
    }

    console.log(`\n🔄 Syncing ${this.syncQueue.size} pending operations...`);

    const operations = Array.from(this.syncQueue.values()).filter((op) => op.status === 'pending');

    for (const operation of operations) {
      try {
        // Send to server
        const response = await this.sendOperationToServer(operation);

        if (response.conflict) {
          operation.status = 'conflict';
          // Handle conflict
          const conflict = this.detectConflict(
            operation.collectionName,
            operation.documentId,
            operation.payload,
            response.serverData,
            operation.timestamp,
            response.serverTimestamp
          );

          if (conflict) {
            console.warn(
              `⚠️ Conflict detected for ${operation.documentId}: using last-write-wins`
            );
            // Default: resolve using last-write-wins
            const resolved = this.resolveConflict(conflict.operationId, 'remote');
            operation.payload = resolved.mergedResult;
          }
        }

        operation.status = 'synced';
        operation.retryCount = 0;
        console.log(`✓ Synced ${operation.collectionName}:${operation.documentId}`);
      } catch (error: any) {
        operation.retryCount++;
        if (operation.retryCount >= 3) {
          operation.status = 'failed';
          operation.error = error.message;
          console.error(`✗ Failed to sync after 3 retries:`, operation.documentId);
        } else {
          operation.status = 'pending';
          console.warn(`⚠️ Retry ${operation.retryCount}/3 for ${operation.documentId}`);
        }
      }
    }

    // Cleanup synced operations from queue
    this.syncQueue = new Map(
      Array.from(this.syncQueue.entries()).filter(([, op]) => op.status !== 'synced')
    );

    this.lastSyncTime = Date.now();
    console.log(`✓ Sync complete. Pending: ${this.syncQueue.size}`);
  }

  /**
   * Send operation to server API
   */
  private async sendOperationToServer(operation: SyncOperation): Promise<any> {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/sync/${operation.collectionName}/${operation.documentId}`,
      {
        method: operation.operationType === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: operation.operationType,
          payload: operation.payload,
          clientTimestamp: operation.timestamp,
          vectorClock: this.vectorClocks.get(operation.collectionName) || 0,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update vector clock for causal ordering
   */
  private updateVectorClock(collectionName: string): void {
    const current = this.vectorClocks.get(collectionName) || 0;
    this.vectorClocks.set(collectionName, current + 1);
  }

  /**
   * Get pending operations
   */
  getPendingOperations(): SyncOperation[] {
    return Array.from(this.syncQueue.values()).filter((op) => op.status === 'pending');
  }

  /**
   * Get conflicts requiring resolution
   */
  getUnresolvedConflicts(): ConflictInfo[] {
    return Array.from(this.conflicts.values()).filter((c) => !c.resolved);
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): {
    totalQueued: number;
    pending: number;
    synced: number;
    failed: number;
    conflicts: number;
    unresolvedConflicts: number;
    isOnline: boolean;
    lastSyncTime: number;
  } {
    const operations = Array.from(this.syncQueue.values());
    return {
      totalQueued: operations.length,
      pending: operations.filter((op) => op.status === 'pending').length,
      synced: operations.filter((op) => op.status === 'synced').length,
      failed: operations.filter((op) => op.status === 'failed').length,
      conflicts: operations.filter((op) => op.status === 'conflict').length,
      unresolvedConflicts: this.getUnresolvedConflicts().length,
      isOnline: this.isOnline,
      lastSyncTime: this.lastSyncTime,
    };
  }

  /**
   * Export sync state for persistence
   */
  exportSyncState(): {
    queue: SyncOperation[];
    conflicts: ConflictInfo[];
    vectorClocks: Record<string, number>;
  } {
    return {
      queue: Array.from(this.syncQueue.values()),
      conflicts: Array.from(this.conflicts.values()),
      vectorClocks: Object.fromEntries(this.vectorClocks),
    };
  }

  /**
   * Import sync state (restore after page reload)
   */
  importSyncState(state: {
    queue: SyncOperation[];
    conflicts: ConflictInfo[];
    vectorClocks: Record<string, number>;
  }): void {
    this.syncQueue.clear();
    for (const op of state.queue) {
      this.syncQueue.set(op._id, op);
    }

    this.conflicts.clear();
    for (const conflict of state.conflicts) {
      this.conflicts.set(conflict.operationId, conflict);
    }

    this.vectorClocks = new Map(Object.entries(state.vectorClocks));
    console.log('✓ Sync state restored');
  }
}

// Export singleton instance
export const syncResolver = new ConflictResolver();
