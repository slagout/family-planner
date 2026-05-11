/**
 * Custom hook for offline mode detection and management
 * Provides offline status, sync functionality, and pending changes tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { processSyncQueue } from './services.offline-sync';

export interface OfflineState {
  isOnline: boolean;
  isOffline: boolean;
  lastSyncTime: number | null;
  hasPendingChanges: boolean;
  isSyncing: boolean;
  pendingOperations: number;
}

/**
 * Hook to detect and manage offline status with sync functionality
 * @param apiBaseUrl - Base URL for sync operations (optional)
 */
export function useOfflineMode(apiBaseUrl?: string): OfflineState & {
  sync: () => Promise<void>;
  markPending: () => void;
} {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingOperations, setPendingOperations] = useState(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (apiBaseUrl) {
        sync();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [apiBaseUrl]);

  // Update sync status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      // Periodically check if we have pending operations
      // This is a placeholder - in production, you'd track this via IndexedDB
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const sync = useCallback(async () => {
    if (isOnline && apiBaseUrl && !isSyncing) {
      setIsSyncing(true);
      try {
        await processSyncQueue(apiBaseUrl);
        setLastSyncTime(Date.now());
        setHasPendingChanges(false);
        setPendingOperations(0);
      } catch (error) {
        console.error('Sync failed:', error);
      } finally {
        setIsSyncing(false);
      }
    }
  }, [isOnline, apiBaseUrl, isSyncing]);

  const markPending = useCallback(() => {
    setHasPendingChanges(true);
    setPendingOperations(prev => prev + 1);
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    lastSyncTime,
    hasPendingChanges,
    isSyncing,
    pendingOperations,
    sync,
    markPending,
  };
}
