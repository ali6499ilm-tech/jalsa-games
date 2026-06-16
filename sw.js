const CACHE_NAME = 'jalsa-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './icon.png',
  './icon-192.png',
  './icon-512.png',
  './js/sounds.js',
  './js/words.js',
  './js/games/undercover.js',
  './js/games/bomb.js',
  './js/games/charades.js',
  './js/games/taboo.js',
  './js/games/would_you_rather.js',
  './js/games/truth_or_dare.js',
  './js/games/five_seconds.js',
  './js/main.js'
];

// Install Event - cache all assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
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

// Fetch Event - network falling back to cache (or cache first for assets)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
