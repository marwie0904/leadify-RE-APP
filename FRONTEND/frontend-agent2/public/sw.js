const CACHE_NAME = 'financial-dashboard-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';
const API_CACHE = 'api-v1';

// URLs to cache on install
const urlsToCache = [
  '/',
  '/dashboard',
  '/auth',
  '/offline.html',
  // Add critical CSS and JS files
  '/_next/static/css/',
  '/_next/static/js/',
];

// API endpoints to cache
const apiEndpoints = [
  '/api/performance/reports/',
  '/api/dashboard/stats',
  '/api/agents/list',
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(urlsToCache);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // API requests - Network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Static assets - Cache first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }
  
  // Images - Cache first with WebP optimization
  if (isImageRequest(url.pathname)) {
    event.respondWith(handleImageRequest(request));
    return;
  }
  
  // HTML pages - Stale while revalidate
  if (isHTMLRequest(request)) {
    event.respondWith(handlePageRequest(request));
    return;
  }
  
  // Default - Network first
  event.respondWith(handleDefaultRequest(request));
});

// Handle API requests - Network first strategy
async function handleApiRequest(request) {
  const cacheName = API_CACHE;
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(cacheName);
      // Clone the response before caching
      cache.put(request, networkResponse.clone());
      
      // Add cache headers
      const response = networkResponse.clone();
      response.headers.set('sw-cache', 'network');
      return response;
    }
    
    // If network fails, try cache
    return await getCachedResponse(request, cacheName);
  } catch (error) {
    console.log('[SW] Network failed for API request:', request.url);
    return await getCachedResponse(request, cacheName);
  }
}

// Handle static assets - Cache first strategy
async function handleStaticAsset(request) {
  const cacheName = STATIC_CACHE;
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Return cached version immediately
    cachedResponse.headers.set('sw-cache', 'hit');
    return cachedResponse;
  }
  
  try {
    // Fetch from network and cache
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    networkResponse.headers.set('sw-cache', 'network');
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch static asset:', request.url);
    return new Response('Asset not available', { status: 404 });
  }
}

// Handle image requests with WebP optimization
async function handleImageRequest(request) {
  const cacheName = DYNAMIC_CACHE;
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Check if browser supports WebP
    const acceptHeader = request.headers.get('Accept') || '';
    const supportsWebP = acceptHeader.includes('image/webp');
    
    let fetchRequest = request;
    
    // Modify request for WebP if supported
    if (supportsWebP && !request.url.includes('.webp')) {
      const url = new URL(request.url);
      // Add WebP parameter if using image optimization service
      url.searchParams.set('format', 'webp');
      fetchRequest = new Request(url.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        mode: request.mode,
        credentials: request.credentials,
        cache: request.cache,
        redirect: request.redirect,
        referrer: request.referrer
      });
    }
    
    const networkResponse = await fetch(fetchRequest);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch image:', request.url);
    return new Response('Image not available', { status: 404 });
  }
}

// Handle page requests - Stale while revalidate
async function handlePageRequest(request) {
  const cacheName = DYNAMIC_CACHE;
  const cachedResponse = await caches.match(request);
  
  // Fetch from network in background
  const networkResponsePromise = fetch(request).then(response => {
    if (response.ok) {
      const cache = caches.open(cacheName);
      cache.then(c => c.put(request, response.clone()));
    }
    return response;
  }).catch(() => null);
  
  // Return cached version immediately if available
  if (cachedResponse) {
    cachedResponse.headers.set('sw-cache', 'stale');
    return cachedResponse;
  }
  
  // If no cache, wait for network
  try {
    const networkResponse = await networkResponsePromise;
    if (networkResponse) {
      networkResponse.headers.set('sw-cache', 'network');
      return networkResponse;
    }
  } catch (error) {
    console.log('[SW] Network failed for page request:', request.url);
  }
  
  // Fallback to offline page
  return await caches.match('/offline.html') || 
         new Response('Page not available offline', { status: 404 });
}

// Handle default requests
async function handleDefaultRequest(request) {
  try {
    const networkResponse = await fetch(request);
    networkResponse.headers.set('sw-cache', 'network');
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      cachedResponse.headers.set('sw-cache', 'fallback');
      return cachedResponse;
    }
    return new Response('Resource not available', { status: 404 });
  }
}

// Helper functions
async function getCachedResponse(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    cachedResponse.headers.set('sw-cache', 'fallback');
    return cachedResponse;
  }
  
  return new Response('Not available offline', { 
    status: 503,
    statusText: 'Service Unavailable'
  });
}

function isStaticAsset(pathname) {
  return pathname.startsWith('/_next/static/') ||
         pathname.startsWith('/static/') ||
         pathname.match(/\.(js|css|woff|woff2|ttf|eot)$/);
}

function isImageRequest(pathname) {
  return pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|avif|ico)$/);
}

function isHTMLRequest(request) {
  const acceptHeader = request.headers.get('Accept') || '';
  return acceptHeader.includes('text/html');
}

// Background sync for performance metrics
self.addEventListener('sync', (event) => {
  if (event.tag === 'performance-metrics') {
    event.waitUntil(syncPerformanceMetrics());
  }
});

async function syncPerformanceMetrics() {
  try {
    // Get stored metrics from IndexedDB
    const metrics = await getStoredMetrics();
    
    if (metrics.length > 0) {
      // Send metrics to server
      const response = await fetch('/api/performance/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics })
      });
      
      if (response.ok) {
        // Clear sent metrics
        await clearStoredMetrics();
        console.log('[SW] Performance metrics synced');
      }
    }
  } catch (error) {
    console.error('[SW] Failed to sync performance metrics:', error);
  }
}

// Placeholder functions for IndexedDB operations
async function getStoredMetrics() {
  // Implementation would use IndexedDB to retrieve stored metrics
  return [];
}

async function clearStoredMetrics() {
  // Implementation would clear metrics from IndexedDB
}

// Handle push notifications for performance alerts
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  if (data.type === 'performance-alert') {
    const options = {
      body: data.message,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'performance-alert',
      actions: [
        {
          action: 'view',
          title: 'View Details'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification('Performance Alert', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/dashboard?tab=performance')
    );
  }
});

console.log('[SW] Service worker loaded');