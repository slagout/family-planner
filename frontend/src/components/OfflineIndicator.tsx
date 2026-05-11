/**
 * Offline Indicator Component
 * Displays the current online/offline status and sync status
 * Features: Accessible, ARIA labels, keyboard navigation
 */

import React, { useEffect, useState } from 'react';
import { useOfflineMode } from '../hooks/useOfflineMode';

interface OfflineIndicatorProps {
  apiBaseUrl?: string;
  position?: 'top' | 'bottom';
  className?: string;
}

/**
 * Offline indicator banner component
 * Shows connectivity status and sync information
 * ARIA: Uses live region for status updates
 */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  apiBaseUrl,
  position = 'top',
  className = '',
}) => {
  const { isOnline, isSyncing, syncedAt } = useOfflineMode();
  const [showBanner, setShowBanner] = useState(!isOnline);

  useEffect(() => {
    setShowBanner(!isOnline || isSyncing);
  }, [isOnline, isSyncing]);

  if (showBanner === false) return null;

  const positionClasses = {
    top: 'top-0',
    bottom: 'bottom-0',
  };

  const statusColor = isOnline ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300';
  const textColor = isOnline ? 'text-green-800' : 'text-red-800';
  const iconColor = isOnline ? 'text-green-600' : 'text-red-600';

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const statusText = isOnline ? 'Online' : 'Offline Mode';
  const syncStatusText = isSyncing ? 'Syncing...' : 'All synced';

  return (
    <div
      className={`fixed ${positionClasses[position]} left-0 right-0 z-50 border-b ${statusColor} ${textColor} px-4 py-3 shadow-md ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`Connection status: ${statusText}. ${syncStatusText}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`flex-shrink-0 w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}
            aria-hidden="true"
          />
          <span className="text-sm font-semibold">{statusText}</span>
        </div>

        {/* Sync status */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isSyncing && (
            <div
              className={`flex-shrink-0 w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin ${iconColor}`}
              aria-hidden="true"
            />
          )}
          <span className="text-sm truncate">{syncStatusText}</span>
        </div>

        {/* Last sync time and actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {syncedAt && (
            <span className="text-xs opacity-75">Last sync: {formatTime(syncedAt)}</span>
          )}

          <button
            onClick={() => setShowBanner(false)}
            className="px-2 py-1 text-xs hover:opacity-75 transition-opacity"
            aria-label="Close offline indicator"
            title="Close banner"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Additional info for offline state */}
      {!isOnline && (
        <div className="mt-2 text-xs opacity-75" aria-label="Offline mode information">
          You are in offline mode. Changes will be synced automatically when you're back online.
        </div>
      )}
    </div>
  );
};
