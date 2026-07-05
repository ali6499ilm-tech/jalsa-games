const CACHE_NAME = 'jalsa-cache-v16';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './icon.png',
  './icon-192.png',
  './icon-512.png',
  './logo.png',
  './screenshot-mobile.png',
  './screenshot-desktop.png',
  './js/sounds.js',
  './js/words.js',
  './js/custom_creator.js',
  './js/games/undercover.js',
  './js/games/bomb.js',
  './js/games/charades.js',
  './js/games/taboo.js',
  './js/games/would_you_rather.js',
  './js/games/truth_or_dare.js',
  './js/games/five_seconds.js',
  './js/games/wolvesville.js',
  './js/games/pictionary.js',
  './js/main.js'
];

// Install Event - cache all assets with cache-busting reload
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const cachePromises = ASSETS.map((url) => {
        // Force network request bypassing browser HTTP cache
        return fetch(url, { cache: 'reload' })
          .then((response) => {
            if (response.ok) {
              return cache.put(url, response);
            }
            throw new Error(`Failed to fetch ${url}`);
          })
          .catch((err) => console.error('Cache put error:', err));
      });
      return Promise.all(cachePromises);
    })
  );
  self.skipWaiting();
});

// Activate Event - clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network First falling back to Cache
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Cache the newly fetched resource if valid and same-origin
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(e.request);
      })
  );
});
