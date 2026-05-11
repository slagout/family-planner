# Family Planner Frontend - Quick Start Guide

## Installation

```bash
cd frontend
npm install
```

This installs all dependencies including:
- React, React Router, React DOM
- Vite (build tool)
- TypeScript
- Tailwind CSS
- i18next & react-i18next
- Axios

## Running Locally

### Development Server
```bash
npm run dev
```
Opens at http://localhost:3000 with hot reload

### Production Build
```bash
npm run build
```
Creates optimized `dist/` folder

### Preview Production Build
```bash
npm run preview
```
Test the production build locally

## Key Features Implemented

### ✅ Offline-First Architecture
- **IndexedDB**: Local data persistence (recipes, pantry, meal plans)
- **Sync Queue**: Queues operations when offline, syncs when online
- **Auto-Sync**: Runs every 5 seconds when online
- **Retry Logic**: 3 retries with exponential backoff

**Files:**
- `src/services/indexeddb.ts` - IndexedDB management
- `src/services/offline-sync.ts` - Sync engine
- `src/hooks/useOfflineMode.ts` - Offline detection hook

### ✅ Accessibility (WCAG 2.1 AA)
- **Touch Targets**: 44px × 44px minimum (WCAG 2.5.5)
- **ARIA Labels**: All interactive elements labeled
- **Keyboard Navigation**: Tab, Enter, Escape support
- **Focus Indicators**: Visible on all controls
- **Screen Reader**: Live regions for status updates

**Files:**
- `src/components/TouchOptimized/` - Touch-optimized components
  - TouchButton.tsx (44px+ minimum)
  - TouchInput.tsx (48px height)
  - TouchCard.tsx
  - GestureHandler.tsx (swipe, tap, long-press)

### ✅ Internationalization (i18n)
- **Languages**: English, French
- **Dynamic Switching**: Via UI selector
- **Fallback**: English if language not supported
- **Persistent**: Stored in localStorage

**Files:**
- `src/i18n/config.ts` - i18next setup
- `src/locales_en_translation.json` - English strings
- `src/locales_fr_translation.json` - French strings

**Usage:**
```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t, i18n } = useTranslation();
  return <h1>{t('app_title')}</h1>;
}
```

### ✅ PWA (Offline Web App)
- **Service Worker**: Cache-first for assets, network-first for API
- **Manifest**: App installation on iOS/Android
- **Icons**: Multiple sizes for home screen

**Files:**
- `public/manifest.json` - PWA configuration
- `public/service-worker.js` - Cache strategies

### ✅ Offline Indicator UI
- Shows online/offline status
- Displays sync progress
- Live region updates for accessibility

**Component:** `src/components/OfflineIndicator.tsx`

## Component Usage

### Offline Detection Hook
```tsx
import { useOfflineMode } from './hooks/useOfflineMode';

function MyComponent() {
  const { isOnline, isSyncing, syncedAt } = useOfflineMode();
  
  if (!isOnline) return <div>You are offline</div>;
  return <div>Online ✓</div>;
}
```

### Touch-Optimized Button
```tsx
import { TouchButton } from './components/TouchOptimized/TouchButton';

<TouchButton 
  variant="primary" 
  size="md"
  onClick={handleClick}
  aria-label="Generate meal plan"
>
  Generate Plan
</TouchButton>
```

### Offline Indicator Banner
```tsx
import { OfflineIndicator } from './components/OfflineIndicator';

// In App.tsx
<div>
  <OfflineIndicator position="top" />
  {/* Rest of app */}
</div>
```

## API Integration

### Authentication
- Token stored in `localStorage.fp_token`
- User stored in `localStorage.fp_user`
- Automatic 401 redirect to login on expired token

### API Client
```typescript
import client from './api/client';

// GET request
const recipes = await client.get('/recipes');

// POST request
const newRecipe = await client.post('/recipes', { name: 'Pizza' });

// Token automatically added to all requests
```

## Testing Accessibility

### Keyboard Navigation
1. Press Tab to navigate
2. Shift+Tab to go back
3. Enter to activate
4. Escape to close menus

### Screen Reader (NVDA - Windows)
1. Download NVDA from nvaccess.org
2. Start NVDA
3. Use app normally - NVDA reads all elements

### Touch Testing (DevTools)
1. Open DevTools → Device Toolbar
2. Select mobile device (e.g., iPhone 12)
3. Test touch interactions

### Contrast Check
Use WAVE tool: webdev.accessibility.com

## Testing Offline Mode

### Simulate Offline
1. DevTools → Network tab → Throttle dropdown → Offline
2. Try creating/editing data
3. Switch back online - changes should sync

### Check IndexedDB
1. DevTools → Application → IndexedDB
2. Look for `FamilyPlannerDB` database
3. Check sync queue and cache stores

## Deployment

### Build for Production
```bash
npm run build
```

Creates optimized bundle in `dist/`:
- Code splitting by route
- CSS/JS minification
- Service worker included
- Total: < 500KB gzipped

### Deploy Options

**Netlify:**
```bash
npx netlify deploy --prod --dir=dist
```

**Vercel:**
```bash
vercel deploy --prod
```

**AWS S3 + CloudFront:**
```bash
aws s3 sync dist/ s3://your-bucket/
```

## Environment Variables

Create `.env.production`:
```
VITE_API_BASE_URL=https://api.family-planner.com
VITE_APP_VERSION=1.0.0
```

## Performance Targets

| Metric | Target | Tool |
|--------|--------|------|
| Lighthouse | > 90 | Chrome DevTools |
| Bundle Size | < 500KB gzipped | npm run build → check dist/ |
| FCP | < 2s | Lighthouse |
| LCP | < 3s | Lighthouse |

Run Lighthouse: Chrome DevTools → Lighthouse tab → Generate report

## Troubleshooting

### Service Worker Not Caching
```typescript
// In DevTools Console
navigator.serviceWorker.getRegistrations().then(regs => 
  regs.forEach(reg => reg.unregister())
);
// Then refresh page
```

### Offline Sync Not Working
1. Check IndexedDB: DevTools → Application → IndexedDB
2. Verify API endpoint in `services/offline-sync.ts`
3. Check browser console for errors
4. Ensure token is set before going offline

### i18n Not Switching Languages
```typescript
// In DevTools Console
localStorage.getItem('language')
localStorage.setItem('language', 'fr')
window.location.reload()
```

### Touch Targets Too Small
- Verify min-height: 44px in component
- Check Tailwind classes: `min-h-[44px]`
- Test on actual touch device

## File Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── TouchOptimized/
│   │   │   ├── TouchButton.tsx
│   │   │   ├── TouchInput.tsx
│   │   │   ├── TouchCard.tsx
│   │   │   └── GestureHandler.tsx
│   │   └── OfflineIndicator.tsx
│   ├── hooks/
│   │   ├── useOfflineMode.ts
│   │   ├── useAuth.ts
│   │   └── useMenuPlan.ts
│   ├── services/
│   │   ├── indexeddb.ts
│   │   └── offline-sync.ts
│   ├── i18n/
│   │   └── config.ts
│   ├── locales_*.json
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
│   ├── manifest.json
│   └── service-worker.js
└── package.json
```

## Next Steps

1. Run development server: `npm run dev`
2. Test offline mode: DevTools Network → Offline
3. Try language switching
4. Test keyboard navigation
5. Verify touch target sizes on mobile
6. Build: `npm run build`
7. Deploy to production

## Support

- **Docs**: See `FRONTEND_ARCHITECTURE.md`
- **Issues**: Check browser console and DevTools
- **Performance**: Run Lighthouse audit
- **Accessibility**: Use WAVE tool for validation

Enjoy building! 🚀
