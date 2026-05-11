/**
 * Service Worker for offline-first PWA
 * Handles caching strategies and offline functionality
 * - Cache-first for static assets
 * - Network-first for API calls with offline fallback
 */

const CACHE_NAME = 'family-planner-v1';
const API_CACHE_NAME = 'family-planner-api-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
];

const STATIC_ASSETS_PATTERNS = [
  /\.js$/,
  /\.css$/,
  /\.woff2?$/,
  /\.ttf$/,
  /\.eot$/,
  /\.svg$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.webp$/,
];

/**
 * Check if URL is a static asset
 */
function isStaticAsset(url) {
  return STATIC_ASSETS_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Install event - cache essential assets
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE)
          .catch(err => {
            console.warn('Failed to cache some assets during install:', err);
          });
      })
  );
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== API_CACHE_NAME)
            .map(name => caches.delete(name))
        );
      })
  );
  self.clients.claim();
});

/**
 * Fetch event - implement caching strategies
 * - Static assets: cache-first
 * - API calls: network-first with cache fallback
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API requests: network-first strategy
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }

          // Clone the response for caching
          const responseToCache = response.clone();
          caches.open(API_CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseToCache);
            })
            .catch(err => console.warn('Cache put error:', err));

          return response;
        })
        .catch(() => {
          // Fall back to cache on network error
          return caches.match(request)
            .then(cached => cached || createOfflineResponse());
        })
    );
    return;
  }

  // Static assets: cache-first strategy
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }

          return fetch(request)
            .then((response) => {
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                })
                .catch(err => console.warn('Cache put error:', err));

              return response;
            })
            .catch(() => createOfflineResponse());
        })
    );
    return;
  }

  // Documents: network-first strategy
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request)
          .then(cached => cached || createOfflineResponse());
      })
  );
});

/**
 * Create offline fallback response
 */
function createOfflineResponse() {
  return new Response(
    '<html><body><h1>Offline</h1><p>You appear to be offline. Please try again when you have a connection.</p></body></html>',
    {
      headers: { 'Content-Type': 'text/html' },
      status: 503,
      statusText: 'Service Unavailable',
    }
  );
}

/**
 * Message event - handle messages from clients
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    Promise.all([
      caches.delete(CACHE_NAME),
      caches.delete(API_CACHE_NAME),
    ]);
  }
});
