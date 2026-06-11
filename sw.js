// Herbert HQ service worker — versioned cache-first so the app works offline.
// Bump CACHE_VERSION whenever any precached file changes.
const CACHE_VERSION = 'herbert-hq-v2';

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tokens.css',
  './css/app.css',
  './js/app.js',
  './js/db.js',
  './js/seed.js',
  './js/store.js',
  './js/router.js',
  './js/engine/grades.js',
  './js/engine/gpa.js',
  './js/engine/whatif.js',
  './js/engine/priority.js',
  './js/engine/studyplan.js',
  './js/components/icons.js',
  './js/components/ui.js',
  './js/components/itemRow.js',
  './js/components/itemEditor.js',
  './js/components/classEditor.js',
  './js/views/dashboard.js',
  './js/views/classDetail.js',
  './js/views/whatif.js',
  './js/views/gpa.js',
  './js/views/calendar.js',
  './js/views/todos.js',
  './js/views/settings.js',
  './js/views/more.js',
  './js/import/syllabus.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/dexie@4.0.11/dist/dexie.min.mjs',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first; successful network GETs (e.g. Google Fonts) get cached on the way through.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: e.request.url.includes('index.html') }).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        if (res.ok && (res.type === 'basic' || res.type === 'cors')) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => {
        // offline navigation falls back to the app shell
        if (e.request.mode === 'navigate') return caches.match('./index.html');
        throw new Error('offline');
      });
    })
  );
});
