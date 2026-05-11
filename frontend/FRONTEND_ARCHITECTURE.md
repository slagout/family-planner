# Family Planner Frontend - Production Documentation

## Overview

The Family Planner frontend is a **React + Vite + TypeScript** application optimized for touchscreen devices (1920×1080 landscape) with comprehensive offline-first support, accessibility features, and internationalization (EN/FR).

## Architecture

### Core Technologies
- **React 18.2**: UI framework with hooks
- **Vite 5**: Build tool with hot module replacement
- **TypeScript 5.3**: Type safety
- **Tailwind CSS 3.4**: Utility-first styling
- **React Router 6.21**: Client-side routing
- **Axios 1.6**: HTTP client with interceptors
- **i18next 23.7 + react-i18next 13.5**: Internationalization

### Feature Modules

#### 1. **Offline-First Architecture**

**Location:** `src/services/` & `src/hooks/`

**Components:**
- `services.indexeddb.ts`: IndexedDB persistence layer
  - Caches recipes, pantry items, meal plans
  - Manages sync queue for offline operations
  - 3 object stores: cache, syncQueue, metadata

- `services.offline-sync.ts`: Sync engine
  - Queues operations when offline
  - Processes queue when online with 3-retry backoff
  - HTTP timeout: 10 seconds per request
  - Auto-sync interval: 5 seconds

- `hooks/useOfflineMode.ts`: React hook
  - Tracks online/offline status
  - Exposes sync trigger
  - Monitors pending operations

**Usage:**
```tsx
import { useOfflineMode } from './hooks/useOfflineMode';

function MyComponent() {
  const { isOnline, isSyncing, syncedAt } = useOfflineMode();
  
  return (
    <div>
      Status: {isOnline ? 'Online' : 'Offline'}
      {isSyncing && 'Syncing...'}
    </div>
  );
}
```

#### 2. **Accessibility (WCAG 2.1 AA)**

**Features:**
- 44px × 44px minimum touch targets (WCAG 2.5.5)
- ARIA labels on all interactive elements
- Keyboard navigation support (Tab, Enter, Escape)
- Focus indicators visible on all controls
- Color-blind safe palette with high contrast
- Screen reader support via live regions

**Touch Components:** `src/components/TouchOptimized/`
- `TouchButton.tsx`: Accessible button with 4 variants
- `TouchInput.tsx`: Input field with 48px height
- `TouchCard.tsx`: Card component optimized for touch
- `GestureHandler.tsx`: Gesture detection

#### 3. **Internationalization (i18n)**

**Configuration:** `src/i18n/config.ts`

**Languages:**
- English (en)
- French (fr)

**Translation Files:**
- `src/locales_en_translation.json`
- `src/locales_fr_translation.json`

#### 4. **PWA (Progressive Web App)**

**Service Worker:** `src/service-worker.js`
- Cache-first strategy for static assets
- Network-first strategy for API calls

**PWA Manifest:** `src/manifest.json`
- App name, icons, screenshots
- Display mode: standalone

#### 5. **UI Components**

**Standard Components:** `src/components/`
- Navigation, authentication, meal planning, recipes, pantry, shopping list
- Offline indicator banner with status information

## Development

### Setup

```bash
cd frontend
npm install
npm run dev
```

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Deployment

```bash
npm run build
# Deploy dist/ to server
```

## Performance Targets

- **Lighthouse Score:** > 90
- **Bundle Size:** < 500KB gzipped
- **FCP:** < 2s
- **LCP:** < 3s

## Accessibility Compliance

✅ WCAG 2.1 AA - 44×44px touch targets, ARIA labels, keyboard navigation, screen reader support

## File Structure

- `src/components/` - React components (UI, OfflineIndicator)
- `src/hooks/` - Custom hooks (useAuth, useMenuPlan, useOfflineMode)
- `src/services/` - Business logic (IndexedDB, offline sync)
- `src/i18n/` - Internationalization config
- `src/locales/` - Translation files
- `public/` - Static assets, PWA manifest, service worker
