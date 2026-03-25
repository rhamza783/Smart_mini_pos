// sw.js – Service Worker (Cache-Busted v3)
// Strategy: Network-first for JS/HTML (always fresh), Cache-first for CDN assets only

const CACHE_NAME = 'pos-cache-v3'; // bump this any time you want to force a full refresh

// Only cache slow/external CDN assets — NOT local JS/HTML/CSS
const CDN_ASSETS_TO_CACHE = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css',
  'https://cdn.jsdelivr.net/npm/flatpickr',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.29/jspdf.plugin.autotable.min.js',
  'https://unpkg.com/dexie@3.2.4/dist/dexie.js',
  'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.js'
];

// Install: only pre-cache CDN assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.allSettled(
          CDN_ASSETS_TO_CACHE.map(url =>
            cache.add(url).catch(err => console.warn('SW: failed to cache', url, err))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: delete ALL old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: Network-first for local files, Cache-first for CDN
self.addEventListener('fetch', event => {
  const url = event.request.url;
  const isCDN = CDN_ASSETS_TO_CACHE.some(cdn => url.startsWith(cdn));

  if (isCDN) {
    // Cache-first for CDN assets
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
  } else {
    // Network-first for ALL local files (JS, HTML, CSS, icons)
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});
