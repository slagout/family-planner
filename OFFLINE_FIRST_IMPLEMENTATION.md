
# Offline-First Architecture - Complete Implementation Guide

## Overview

This document describes the complete offline-first frontend architecture for the Family Planner app. The implementation includes:

- **IndexedDB Service**: Local data persistence and sync queue management
- **Offline Sync Service**: Synchronization engine with retry logic
- **React Hooks**: `useOfflineMode` for offline state management
- **Touch-Optimized Components**: WCAG-compliant, accessible UI components
- **Progressive Web App (PWA)**: Service Worker with intelligent caching
- **Internationalization**: Multi-language support (English, French)

## Architecture Components

### 1. Core Services

#### IndexedDB Service (`services.indexeddb.ts`)

Manages persistent client-side storage using IndexedDB.

**Key Features:**
- Three object stores: cache, syncQueue, metadata
- Type-safe generic caching
- Promise-based API for all operations
- Automatic database initialization

**Usage Example:**
```typescript
import indexedDBService from '../services.indexeddb';

// Cache data for offline access
await indexedDBService.cacheData('tasks', tasksArray, 1);

// Retrieve cached data
const tasks = await indexedDBService.getCachedData('tasks');

// Queue operations for sync
await indexedDBService.addToSyncQueue('CREATE', 'tasks', taskData);

// Get all pending sync operations
const queue = await indexedDBService.getSyncQueue();
```

#### Offline Sync Service (`services.offline-sync.ts`)

Manages synchronization of queued operations with the backend API.

**Key Features:**
- Automatic queue processing when online
- Exponential retry logic (max 3 retries)
- Timeout handling (10 seconds per request)
- Detailed sync result reporting
- Metadata tracking (last sync time)

**Usage Example:**
```typescript
import { queueOperation, processSyncQueue, startAutoSync } from '../services.offline-sync';

// Queue an offline operation
await queueOperation('CREATE', 'tasks', { name: 'New Task' });

// Manually process sync queue
const result = await processSyncQueue('https://api.example.com');
console.log(`${result.successful} successful, ${result.failed} failed`);

// Start automatic syncing (5-second interval)
const stopAutoSync = startAutoSync('https://api.example.com');
// Later: stopAutoSync();
```

### 2. React Hooks

#### `useOfflineMode` Hook (`useOfflineMode.ts`)

Provides offline status detection and sync management.

**Returns:**
```typescript
{
  isOnline: boolean;           // Current online status
  isOffline: boolean;          // Inverse of isOnline
  lastSyncTime: number | null; // Timestamp of last sync
  hasPendingChanges: boolean;  // Any unsync'd changes
  isSyncing: boolean;          // Sync in progress
  pendingOperations: number;   // Count of pending operations
  sync: () => Promise<void>;   // Manual sync trigger
  markPending: () => void;     // Mark pending changes
}
```

**Usage Example:**
```typescript
function MyComponent() {
  const { isOnline, pendingOperations, sync } = useOfflineMode('https://api.example.com');
  
  return (
    <div>
      <p>Status: {isOnline ? 'Online' : 'Offline'}</p>
      <p>Pending: {pendingOperations}</p>
      <button onClick={sync}>Sync Now</button>
    </div>
  );
}
```

### 3. UI Components

#### OfflineIndicator Component (`components/OfflineIndicator.tsx`)

Banner component showing connectivity and sync status.

**Features:**
- Displays online/offline status
- Shows pending changes count
- Displays last sync time
- Manual sync button when online
- Accessible (ARIA labels, live region)
- Customizable position (top/bottom)

**Usage Example:**
```tsx
<OfflineIndicator 
  apiBaseUrl="https://api.example.com" 
  position="top" 
/>
```

#### Touch-Optimized Components

All touch components follow WCAG 2.5.5 guidelines (44x44px minimum touch targets).

**TouchButton** (`TouchOptimized.TouchButton.tsx`)
```tsx
<TouchButton 
  variant="primary" 
  size="md"
  isLoading={false}
  onClick={handleClick}
>
  Click Me
</TouchButton>
```

**TouchInput** (`TouchOptimized.TouchInput.tsx`)
```tsx
<TouchInput 
  label="Task Name"
  value={value}
  onChange={setValue}
  error={error}
  required
/>
```

**TouchCard** (`TouchOptimized.TouchCard.tsx`)
```tsx
<TouchCard 
  clickable 
  onClick={handleClick}
>
  Card Content
</TouchCard>
```

**GestureHandler** (`TouchOptimized.GestureHandler.tsx`)
```tsx
<GestureHandler
  onSwipeLeft={() => goNext()}
  onSwipeRight={() => goPrev()}
  onLongPress={() => showMenu()}
  onTap={() => select()}
>
  <div>Swipeable Content</div>
</GestureHandler>
```

### 4. Internationalization

#### i18n Configuration (`i18n.config.ts`)

Manages multi-language support with react-i18next.

**Supported Languages:**
- English (en)
- French (fr)

**Usage Example:**
```typescript
import { initI18n, setLanguage } from '../i18n.config';
import { useTranslation } from 'react-i18next';

function Component() {
  const { t } = useTranslation();
  
  return (
    <>
      <h1>{t('app_title')}</h1>
      <p>{t('offline_description')}</p>
      <button onClick={() => setLanguage('fr')}>
        Français
      </button>
    </>
  );
}
```

### 5. PWA Support

#### Service Worker (`service-worker.js`)

Implements intelligent caching strategies.

**Strategies:**
- **Static Assets**: Cache-first (images, fonts, CSS, JS)
- **API Calls**: Network-first with cache fallback
- **Documents**: Network-first with cache fallback
- **Offline Fallback**: Custom HTML response when offline

**Features:**
- Automatic cache cleanup on activation
- Versioned caches for updates
- Excludes non-HTTP(S) requests
- Handles all GET requests

#### Manifest (`manifest.json`)

PWA configuration with shortcuts and share targets.

**Features:**
- App name and icons (192x192, 512x512, maskable)
- Standalone display mode
- Theme and background colors
- Screenshots for app store
- App shortcuts (Add Event, View Schedule)
- Web Share Target support

## Integration Steps

### 1. Install Dependencies

```bash
npm install i18next react-i18next
```

### 2. Update App Component

```tsx
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  return (
    <>
      <OfflineIndicator apiBaseUrl={API_BASE_URL} />
      {/* Your app content */}
    </>
  );
}
```

### 3. Use in Data Operations

```tsx
import { useOfflineMode } from './hooks/useOfflineMode';
import { queueOperation } from './services.offline-sync';

function TaskForm() {
  const { markPending } = useOfflineMode();
  
  async function handleSubmit(taskData) {
    await queueOperation('CREATE', 'tasks', taskData);
    markPending();
  }
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 4. Fetch Data with Caching

```tsx
import indexedDBService from './services.indexeddb';

async function loadTasks() {
  // Try cache first
  let tasks = await indexedDBService.getCachedData('tasks');
  
  if (!tasks && navigator.onLine) {
    // Fetch from API and cache
    const response = await fetch('/api/tasks');
    tasks = await response.json();
    await indexedDBService.cacheData('tasks', tasks);
  }
  
  return tasks;
}
```

## File Structure

```
frontend/
├── src/
│   ├── services/
│   │   ├── indexeddb.ts         # IndexedDB service
│   │   └── offline-sync.ts      # Sync engine
│   ├── hooks/
│   │   └── useOfflineMode.ts    # Offline hook
│   ├── components/
│   │   ├── OfflineIndicator.tsx
│   │   └── TouchOptimized/
│   │       ├── TouchButton.tsx
│   │       ├── TouchInput.tsx
│   │       ├── TouchCard.tsx
│   │       └── GestureHandler.tsx
│   ├── i18n/
│   │   └── config.ts            # i18n configuration
│   ├── locales/
│   │   ├── en/
│   │   │   └── translation.json
│   │   └── fr/
│   │       └── translation.json
│   ├── main.tsx
│   ├── manifest.json
│   └── service-worker.js
├── public/
│   ├── manifest.json
│   ├── service-worker.js
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icons/ (other PWA icons)
└── index.html
```

## Key Features

### Offline-First Data Flow

1. **User Action**: Create/Update/Delete data
2. **Queue Operation**: Add to IndexedDB sync queue
3. **Update Local Cache**: Reflect changes immediately
4. **Update UI**: Show optimistic update
5. **When Online**: Automatically sync with server
6. **Confirm/Retry**: Handle success or retry failed ops

### Touch Optimization

- **Minimum 44px targets** for all interactive elements
- **Keyboard support** for accessibility
- **ARIA labels** for screen readers
- **Focus indicators** for keyboard navigation
- **Gesture recognition** with debouncing

### Accessibility

- **WCAG 2.1 AA compliance**
- **Live regions** for status updates
- **Semantic HTML**
- **Alt text** for icons
- **Error messages** with ARIA labels
- **Keyboard shortcuts** where applicable

## Testing Offline Functionality

### Chrome DevTools

1. Open DevTools (F12)
2. Network tab → Throttling → Offline
3. Perform actions and verify sync queue
4. Go back online and verify sync

### Simulating Sync Queue

```typescript
// In browser console
import indexedDBService from './services.indexeddb';

// Queue a test operation
await indexedDBService.addToSyncQueue('CREATE', 'test', { data: 'test' });

// View queue
const queue = await indexedDBService.getSyncQueue();
console.log(queue);
```

## Performance Considerations

- **IndexedDB Size**: No strict limit, typically 50MB+ available
- **Cache Strategy**: Implement TTL for cached API responses
- **Sync Frequency**: Default 5 seconds, adjust based on needs
- **Retry Logic**: 3 retries with exponential backoff
- **Service Worker**: Lazy loads assets on first request

## Security

- **Authorization**: Include Bearer token in sync requests
- **Data Validation**: Validate all synced data on server
- **HTTPS Only**: Service Worker only works over HTTPS (except localhost)
- **Cache Expiry**: Implement server-side validation of cached responses
- **Sensitive Data**: Consider encryption for sensitive cached data

## Browser Support

- **ServiceWorker**: Chrome 40+, Firefox 44+, Safari 11.1+, Edge 17+
- **IndexedDB**: All modern browsers
- **i18next**: All modern browsers
- **Progressive Enhancement**: App works in older browsers without offline features

## Troubleshooting

### Service Worker not registering
- Verify HTTPS or localhost
- Check manifest path is correct
- Clear browser cache

### Sync queue not processing
- Verify navigator.onLine status
- Check API endpoint is accessible
- Review sync errors in getSyncStatus()

### Cache not updating
- Verify cacheData is being called
- Check IndexedDB storage quota
- Use DevTools Storage tab to inspect

## Future Enhancements

1. **Data Sync Conflicts**: Implement conflict resolution strategy
2. **Selective Sync**: Allow users to choose what to sync
3. **Background Sync API**: Use for reliable sync scheduling
4. **Periodic Background Sync**: Sync data on schedule
5. **Encryption**: Encrypt sensitive cached data
6. **Analytics**: Track offline usage patterns

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Compatibility**: React 18+, TypeScript 4.5+
