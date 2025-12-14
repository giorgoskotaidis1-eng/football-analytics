// Service Worker for Offline Support - Enhanced for iPad
const CACHE_NAME = 'football-analytics-v3';
const STATIC_CACHE = 'football-analytics-static-v3';

// Pages to cache for offline
const urlsToCache = [
  '/',
  '/matches',
  '/players',
  '/teams',
  '/offline',
  '/demo'
];

// Static assets to cache
const staticAssets = [
  '/manifest.json'
  // Note: CSS files are cached dynamically by the fetch handler
  // Don't hardcode CSS paths as they may not exist or have hash-based names in Next.js
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    Promise.all([
      // Cache pages - with error handling
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Caching pages:', urlsToCache);
        // Use Promise.allSettled to continue even if some fail
        return Promise.allSettled(
          urlsToCache.map(url => {
            try {
              return cache.add(new Request(url, { cache: 'reload' })).catch(err => {
                console.warn(`[SW] Failed to cache ${url}:`, err);
                return null;
              });
            } catch (err) {
              console.warn(`[SW] Failed to create request for ${url}:`, err);
              return Promise.resolve(null);
            }
          })
        );
      }),
      // Cache static assets - with error handling
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        return Promise.allSettled(
          staticAssets.map(url => {
            try {
              return cache.add(new Request(url, { cache: 'reload' })).catch(err => {
                console.warn(`[SW] Failed to cache static ${url}:`, err);
                return null;
              });
            } catch (err) {
              console.warn(`[SW] Failed to create request for static ${url}:`, err);
              return Promise.resolve(null);
            }
          })
        ).then(() => {
          // Silently handle failures - don't block installation
          return Promise.resolve();
        });
      }).catch(err => {
        // Silently handle cache open failures
        console.warn('[SW] Failed to open static cache:', err);
        return Promise.resolve();
      })
    ]).then(() => {
      console.log('[SW] ✅ Service worker installed successfully');
      // Force activation
      return self.skipWaiting();
    }).catch((error) => {
      console.error('[SW] ❌ Installation failed:', error);
      // Still activate even if caching fails
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages immediately
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] ✅ Service worker activated');
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // CRITICAL: Don't intercept ANY requests in development
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return; // Let browser handle everything normally in development
  }
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip API routes - always go to network
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  
  // CRITICAL: Skip ALL CSS and JS files - let browser handle them normally
  // This prevents service worker from blocking CSS/JS loading
  if (url.pathname.endsWith('.css') || 
      url.pathname.endsWith('.js') || 
      url.pathname.includes('/_next/static/')) {
    return; // Let browser handle CSS/JS files normally - don't intercept
  }
  
  // Skip Next.js internal routes during development - let them go to network
  if (url.pathname.startsWith('/_next/')) {
    // In development, don't intercept Next.js chunks - let them load normally
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return; // Let Next.js dev server handle it
    }
    
    // In production, cache static Next.js assets
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            try {
              const responseToCache = response.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(event.request, responseToCache).catch(err => {
                  console.warn('[SW] Failed to cache static asset:', err);
                });
              });
            } catch (err) {
              console.warn('[SW] Failed to clone response:', err);
            }
          }
          return response;
        }).catch((err) => {
          console.warn('[SW] Fetch failed for Next.js asset:', err);
          // Don't return offline page for chunks - let them fail naturally
          return new Response('Network error', { status: 503 });
        });
      })
    );
    return;
  }
  
  // Handle page requests - skip in development for localhost
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    // In development, only intercept if it's a known cached route
    if (!urlsToCache.some(cachedUrl => url.pathname === cachedUrl || url.pathname.startsWith(cachedUrl + '/'))) {
      return; // Let Next.js handle it
    }
  }
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return immediately
      if (response) {
        console.log('[SW] ✅ Cache hit:', url.pathname);
        return response;
      }
      
      // Cache miss - fetch from network
      console.log('[SW] 🔄 Cache miss, fetching:', url.pathname);
      return fetch(event.request).then((response) => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Clone the response for caching
        try {
          const responseToCache = response.clone();
          
          // Cache the response
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(err => {
              console.warn('[SW] Failed to cache response:', err);
            });
            console.log('[SW] 💾 Cached:', url.pathname);
          });
        } catch (err) {
          console.warn('[SW] Failed to clone response for caching:', err);
        }
        
        return response;
      }).catch((err) => {
        console.warn('[SW] Network fetch failed:', err);
        // Network failed - return offline page for document requests
        if (event.request.destination === 'document') {
          console.log('[SW] ⚠️ Network failed, returning offline page');
          return caches.match('/offline').then((offlineResponse) => {
            if (offlineResponse) {
              return offlineResponse;
            }
            // Fallback to demo page if offline page not cached
            return caches.match('/demo').then((demoResponse) => {
              if (demoResponse) {
                return demoResponse;
              }
              // Last resort - return a basic offline response
              return new Response('Offline', { 
                status: 503,
                headers: { 'Content-Type': 'text/html' }
              });
            });
          });
        }
        // For other requests, return error
        return new Response('Offline', { 
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    }).catch((err) => {
      console.error('[SW] Cache match failed:', err);
      // Fallback to network
      return fetch(event.request).catch(() => {
        return new Response('Service unavailable', { 
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});
