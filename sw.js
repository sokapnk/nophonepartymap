const CACHE_NAME = 'nophoneparty-cache-v1';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  // add any other top-level assets you want cached, e.g. CSS/JS files
];

// Install: precache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first, with network fallback; navigation fallback to cached index
self.addEventListener('fetch', event => {
  // only handle GET requests
  if (event.request.method !== 'GET') return;

  // For navigation requests, try network then fallback to cache index
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(res => {
        // update cache with latest index.html
        caches.open(CACHE_NAME).then(cache => cache.put('./', res.clone()));
        return res;
      }).catch(() => caches.match('./'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // optionally cache other GET requests (non-opaque best)
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // nothing cached and network failed — nothing to return
        return;
      });
    })
  );
});
