import { useCallback, useEffect, useState } from 'react';

export interface OfflineStatus {
  isOnline: boolean;
  isSyncing: boolean;
  syncedAt: number | null;
  queueLength: number;
  error: string | null;
}

export function useOfflineMode(): OfflineStatus {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: typeof navigator !== 'undefined' && navigator.onLine,
    isSyncing: false,
    syncedAt: null,
    queueLength: 0,
    error: null,
  });

  useEffect(() => {
    const handleOnline = () => setStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setStatus(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}
