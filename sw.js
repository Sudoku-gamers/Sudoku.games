/**
 * Sudoku.game — Service Worker
 * Offline-first, background sync, push notifications
 */

const APP_VERSION   = 'v2.8.0';
const CACHE_STATIC  = `sudoku-static-v2.8.0`;
const CACHE_RUNTIME = `sudoku-runtime-v2.8.0`;

// Files to pre-cache on install (app shell)
const PRECACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// External CDN scripts — cache on first use
const CDN_PATTERNS = [
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// ============================================================
// INSTALL — pre-cache app shell
// ============================================================
self.addEventListener('install', event => {
  console.log('[SW] Installing', APP_VERSION);
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => {
      // Use individual adds so one failure doesn't kill the whole install
      return Promise.allSettled(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(e => console.warn('[SW] Precache skip:', url, e.message))
        )
      );
    }).then(() => {
      console.log('[SW] Install complete');
      return self.skipWaiting();
    })
  );
});

// ============================================================
// ACTIVATE — clean up old caches
// ============================================================
self.addEventListener('activate', event => {
  console.log('[SW] Activating', APP_VERSION);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_RUNTIME)
          .map(k => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())  // Take control immediately
  );
});

// ============================================================
// FETCH — offline-first for app shell, network-first for API
// ============================================================
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // Supabase API — network only (real-time), never cache
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(fetch(request));
    return;
  }

  // CDN scripts — cache-first with network fallback
  if (CDN_PATTERNS.some(p => url.hostname.includes(p))) {
    event.respondWith(
      caches.open(CACHE_RUNTIME).then(async cache => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          // Return a 503 so the browser treats it as a temporary network failure.
          // A fake JS body with the wrong Content-Type would silently break fonts, CSS, etc.
          return new Response(null, {
            status: 503,
            statusText: 'Service Unavailable — CDN offline',
          });
        }
      })
    );
    return;
  }

  // app.js and style.css — NETWORK-FIRST so updates are instant
  // Falls back to cache if offline
  const isVersionedAsset = url.pathname.endsWith('app.js') || url.pathname.endsWith('style.css');
  if (isVersionedAsset) {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_STATIC).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match(request);
        return cached || new Response('/* offline */', { headers: { 'Content-Type': 'text/javascript' } });
      })
    );
    return;
  }

  // index.html and other app shell — cache-first, update in background
  event.respondWith(
    caches.open(CACHE_STATIC).then(async cache => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request).then(response => {
        if (response.ok && response.status < 400) {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(() => null);

      if (cached) {
        event.waitUntil(networkFetch);
        return cached;
      }

      const networkResponse = await networkFetch;
      if (networkResponse) return networkResponse;

      // Offline fallback
      return new Response(getOfflinePage(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    })
  );
});

// ============================================================
// BACKGROUND SYNC — retry failed move pushes
// ============================================================
self.addEventListener('sync', event => {
  if (event.tag === 'sync-moves') {
    event.waitUntil(syncPendingMoves());
  }
});

async function syncPendingMoves() {
  // Read pending moves from IndexedDB and retry
  try {
    const db = await openDB();
    const moves = await getAllPending(db);
    for (const move of moves) {
      try {
        await fetch(move.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...move.headers },
          body: JSON.stringify(move.body)
        });
        await deletePending(db, move.id);
      } catch {
        // Will retry on next sync
      }
    }
  } catch (e) {
    console.log('[SW] Background sync failed:', e);
  }
}

// ============================================================
// PUSH NOTIFICATIONS — opponent joined / game events
// ============================================================
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Sudoku.game';
  const options = {
    body: data.body || 'Your opponent made a move!',
    icon: './icon-192.png',
    badge: './icon-72.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || './' },
    actions: [
      { action: 'play', title: '▶ Resume Game' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    tag: 'game-event',
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'play' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        const url = event.notification.data?.url || './';
        if (clientList.length > 0) {
          clientList[0].focus();
          clientList[0].navigate(url);
        } else {
          clients.openWindow(url);
        }
      })
    );
  }
});

// ============================================================
// MESSAGE — from main thread
// ============================================================
self.addEventListener('message', event => {
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: APP_VERSION });
  }

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, badge, tag, data, actions } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        body, icon, badge, tag,
        data: data || {},
        actions: actions || [],
        vibrate: [100, 50, 100],
        renotify: true,
      })
    );
  }
});

// ============================================================
// HELPERS
// ============================================================

// Build offline fallback once at module level — no need to rebuild the string per request
const OFFLINE_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Sudoku.game — Offline</title>
  <style>
    body { background:#161512; color:#bababa; font-family:-apple-system,sans-serif;
           display:flex; flex-direction:column; align-items:center; justify-content:center;
           height:100vh; margin:0; text-align:center; gap:16px; padding:24px; }
    h1 { color:#d59020; font-size:2rem; margin:0; }
    p  { color:#777; max-width:280px; line-height:1.6; }
    button { background:#d59020; color:#161512; border:none; padding:14px 32px;
             border-radius:8px; font-size:1rem; font-weight:700; cursor:pointer; }
  </style>
</head>
<body>
  <div style="font-size:3rem">🧩</div>
  <h1>You're offline</h1>
  <p>No connection detected. Local games (vs AI, Pass & Play) work offline. Online rooms need a connection.</p>
  <button onclick="location.reload()">Try Again</button>
</body>
</html>`;

function getOfflinePage() {
  return OFFLINE_PAGE_HTML;
}

// Minimal IndexedDB helpers for background sync queue
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('sudoku-sync', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('pending', { keyPath: 'id', autoIncrement: true });
    req.onsuccess  = e => resolve(e.target.result);
    req.onerror    = e => reject(e.target.error);
  });
}

function getAllPending(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending', 'readonly');
    const req = tx.objectStore('pending').getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

function deletePending(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending', 'readwrite');
    const req = tx.objectStore('pending').delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}
