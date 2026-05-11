# Frontend Developer Guide

## Getting Started

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

Open http://localhost:3000 - app will hot-reload on file changes.

### 3. Build for Production
```bash
npm run build
npm run preview  # Test production build
```

---

## Project Features

### Offline-First
Data automatically syncs when online using IndexedDB + Service Worker.

**Key files:**
- `src/services/indexeddb.ts` - Local storage
- `src/services/offline-sync.ts` - Sync engine
- `src/hooks/useOfflineMode.ts` - Hook for offline state

**To test offline:**
1. DevTools → Network → Offline
2. Make changes
3. Switch back online → changes sync automatically

### Accessibility (WCAG 2.1 AA)
Touch targets 44px+, ARIA labels, keyboard navigation.

**Touch components in `src/components/TouchOptimized/`:**
- TouchButton (primary, secondary, danger, success variants)
- TouchInput (with labels, error states)
- TouchCard (touch-friendly spacing)
- GestureHandler (swipe, tap, long-press)

### Internationalization (EN/FR)
```tsx
import { useTranslation } from 'react-i18next';

const { t, i18n } = useTranslation();
t('app_title')  // Returns translated string
i18n.changeLanguage('fr')  // Switch language
```

Translation keys: `src/locales_en_translation.json`

### PWA (Progressive Web App)
Works offline, installable on iOS/Android.

**Files:**
- `public/manifest.json` - App metadata
- `public/service-worker.js` - Offline support

---

## File Structure

```
src/
├── components/          # React UI
│   ├── TouchOptimized/  # Touch-optimized components
│   ├── OfflineIndicator.tsx
│   └── [Page components]
├── hooks/              # Custom React hooks
│   ├── useOfflineMode.ts
│   ├── useAuth.ts
│   └── useMenuPlan.ts
├── services/           # Business logic
│   ├── indexeddb.ts
│   └── offline-sync.ts
├── i18n/              # Internationalization
│   └── config.ts
├── context/           # React Context
│   └── AuthContext.tsx
├── api/              # HTTP client
│   └── client.ts
└── types/            # TypeScript types
    └── index.ts
```

---

## Common Tasks

### Adding a Translation Key

1. Add to `src/locales_en_translation.json`:
```json
{
  "my_new_key": "English text"
}
```

2. Add to `src/locales_fr_translation.json`:
```json
{
  "my_new_key": "Texte français"
}
```

3. Use in component:
```tsx
const { t } = useTranslation();
<h1>{t('my_new_key')}</h1>
```

### Creating a Touchscreen Component

1. Use TouchButton or TouchInput for interactive elements
2. Ensure minimum 44px height
3. Add ARIA labels:
```tsx
<TouchButton aria-label="Save recipe">Save</TouchButton>
```

### Testing Offline

1. Open DevTools (F12)
2. Network tab → Throttle dropdown → Offline
3. Try creating/editing data
4. Open Application → IndexedDB → FamilyPlannerDB
5. Switch back online → verify sync

### Debugging Accessibility

1. Install Wave browser extension
2. Or use Chrome DevTools → Lighthouse → Accessibility audit
3. Check focus rings: Tab through all controls
4. Test with screen reader (NVDA for Windows, VoiceOver for Mac)

---

## TypeScript Tips

All services are fully typed:

```typescript
// useOfflineMode
const status: OfflineStatus = useOfflineMode();
// { isOnline: boolean, isSyncing: boolean, syncedAt?: number, ... }

// indexeddb service
await indexedDBService.cacheData<Recipe>('recipe-123', recipeData);
const cached = await indexedDBService.getCachedData<Recipe>('recipe-123');

// offline-sync service
await queueOperation('CREATE', 'recipes', { name: 'Pizza' });
```

---

## Performance Targets

- Lighthouse: > 90
- Bundle size: < 500KB gzipped
- FCP: < 2 seconds
- LCP: < 3 seconds

Check with: `npm run build` → check `dist/` folder size

---

## Deployment

### Build
```bash
npm run build
```
Creates optimized `dist/` folder.

### Deploy Options

**Netlify:**
```bash
npx netlify deploy --prod --dir=dist
```

**Vercel:**
```bash
vercel deploy --prod
```

**AWS S3:**
```bash
aws s3 sync dist/ s3://bucket-name/
```

---

## Troubleshooting

### "Module not found" error
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Service worker not updating
```javascript
// In DevTools console:
navigator.serviceWorker.getRegistrations().then(regs => 
  regs.forEach(reg => reg.unregister())
);
// Refresh page
```

### Offline sync not working
1. Check IndexedDB: DevTools → Application → IndexedDB
2. Verify backend is running on port 4000
3. Check network tab for failed requests
4. Check console for errors

### Translation key missing
- Add key to both en and fr JSON files
- Use exact key name in component
- Reload to see changes

---

## Component Examples

### Using Offline Hook
```tsx
import { useOfflineMode } from './hooks/useOfflineMode';

function MyComponent() {
  const { isOnline, isSyncing } = useOfflineMode();
  
  return (
    <div>
      {!isOnline && <p>You are offline</p>}
      {isSyncing && <p>Syncing...</p>}
    </div>
  );
}
```

### Creating Touch Button
```tsx
import { TouchButton } from './components/TouchOptimized/TouchButton';

<TouchButton 
  variant="primary"
  size="md"
  onClick={handleSave}
  aria-label="Save changes"
>
  Save
</TouchButton>
```

### Detecting Gestures
```tsx
import { GestureHandler } from './components/TouchOptimized/GestureHandler';

<GestureHandler
  onSwipeLeft={() => console.log('Swiped left')}
  onSwipeRight={() => console.log('Swiped right')}
  onLongPress={() => console.log('Long press')}
  threshold={50}
  longPressDuration={500}
>
  <div>Swipe me!</div>
</GestureHandler>
```

### Using i18n
```tsx
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  
  return (
    <>
      <p>{t('app_title')}</p>
      <button onClick={() => i18n.changeLanguage('en')}>
        English
      </button>
      <button onClick={() => i18n.changeLanguage('fr')}>
        Français
      </button>
    </>
  );
}
```

---

## Dependencies

- **React 18.2** - UI framework
- **React Router 6.21** - Routing
- **Vite 5** - Build tool
- **TypeScript 5.3** - Type safety
- **Tailwind CSS 3.4** - Styling
- **Axios 1.6** - HTTP client
- **i18next 23.7** - Internationalization
- **react-i18next 13.5** - React i18n integration

---

## Help & Support

- **Documentation:** See `FRONTEND_ARCHITECTURE.md`
- **Quick start:** See `QUICK_START.md`
- **Full details:** See `DELIVERY_SUMMARY.md`

Check browser console for errors and use DevTools liberally!

Happy coding! 🚀
