// service-worker.js

const STATIC_CACHE_NAME = 'qran-top-static-v2'; // Version bump to force update
const DATA_CACHE_NAME = 'qran-top-data-v2';

// Core data files that are essential for the app to work offline.
const CORE_DATA_URLS = [
  'https://api.alquran.cloud/v1/quran/quran-simple-clean',
  'https://api.alquran.cloud/v1/quran/quran-uthmani',
];

// The "app shell" - minimal files needed for the UI to render.
const STATIC_FILES_TO_CACHE = [
  './',
  './index.html',
  './index.css',
  './Uthman.ttf',
  './manifest.json',
  './thumbnail.png',
  // Note: aistudio-host.js is not included as it's injected and managed by the environment.
];

// Install event: cache static assets and core data.
self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('[Service Worker] Pre-caching static app shell');
        return cache.addAll(STATIC_FILES_TO_CACHE);
      }),
      caches.open(DATA_CACHE_NAME).then(cache => {
        console.log('[Service Worker] Pre-caching core Quran data');
        return cache.addAll(CORE_DATA_URLS);
      })
    ]).then(() => {
        console.log('[Service Worker] Installation complete. Activating immediately.');
        return self.skipWaiting();
    })
  );
});

// Activate event: clean up old caches.
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate');
  const cacheWhitelist = [STATIC_CACHE_NAME, DATA_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('[Service Worker] Activation complete. Claiming clients.');
        return self.clients.claim();
    })
  );
});

// Fetch event: handle network requests with different strategies.
self.addEventListener('fetch', event => {
  const { request } = event;

  // Defensive check: The URL constructor can fail on non-standard schemes
  // like 'chrome-extension://' or 'about:blank'. We only want to handle http/https requests.
  if (!request.url.startsWith('http')) {
    return;
  }
  
  const url = new URL(request.url);

  // Ignore requests that are not GET.
  if (request.method !== 'GET') {
    return;
  }
  
  // Ignore requests to Firebase, as it has its own offline persistence mechanism.
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis.com')) {
    return;
  }

  // Strategy 1: Stale-While-Revalidate for API calls (data).
  // This serves the cached version immediately for speed, then updates the cache in the background.
  if (url.hostname === 'api.alquran.cloud' || url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'everyayah.com' || url.hostname === 'cdn.islamic.network') {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          const fetchPromise = fetch(request).then(networkResponse => {
            // Check if we received a valid response before caching
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(err => {
            // Network fetch failed, which is expected offline.
            // The cachedResponse will be used if it exists.
            console.warn('[Service Worker] Network fetch failed for:', request.url);
          });

          return cachedResponse || fetchPromise;
        });
      })
    );
    return; // End execution for this strategy
  }

  // Strategy 2: Cache First for static assets (app shell).
  // This is ideal for files that don't change often.
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      // If not in cache, fetch from network.
      // We don't cache these on the fly; they should be part of the initial cache.
      return fetch(request);
    })
  );
});

// Listen for a message from the client to activate the new service worker.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});