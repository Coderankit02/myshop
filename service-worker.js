/* ============================================
   RINKU KIRANA — SERVICE WORKER
   ============================================
   IMPORTANT: bump CACHE_VERSION on every deploy
   that changes cached files (html/css/js/icons).
   That single string change is what makes the
   "auto update" flow below actually fire for
   returning users.
*/
"use strict";

const CACHE_VERSION = "v5";
const CACHE_NAME = `rk-cache-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

// Core "app shell" — small, safe list. Add more static, same-origin files
// here if you want them available offline (extra CSS/JS, key icons).
// addAll() is intentionally NOT used because a single missing file would
// fail the whole install; allSettled keeps install resilient.
const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.json",
  "/auth.css",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── INSTALL ───────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
    )
  );
  // NOTE: we deliberately do NOT call self.skipWaiting() here. The new
  // worker waits until the page explicitly tells it to activate (see the
  // SKIP_WAITING message handler below), which is what lets pwa.js show
  // an "Update available" banner instead of yanking the page out from
  // under someone mid-checkout.
});

// ── ACTIVATE — clean up old cache versions ────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("rk-cache-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Let the page force this worker to activate immediately (called from the
// "Refresh" button in the update-available banner).
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ── FETCH ──────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) NEVER intercept Supabase calls (auth, db, storage) or any non-GET
  //    request (login/signup/forgot-password/cart POSTs etc.). These must
  //    always hit the real network untouched, full stop.
  if (
    req.method !== "GET" ||
    url.hostname.endsWith("supabase.co") ||
    url.hostname.endsWith("supabase.in")
  ) {
    return; // not calling event.respondWith() = browser handles it normally
  }

  // 2) Only handle same-origin requests ourselves; let cross-origin
  //    (fonts, CDNs like jsdelivr) pass straight through to the network.
  if (url.origin !== self.location.origin) {
    return;
  }

  // 3) Page navigations: network-first, falling back to cache, then to
  //    the offline page if there's no network and nothing cached.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // 4) Static assets (css/js/png/svg/woff etc): stale-while-revalidate —
  //    serve cached copy instantly if we have one, refresh it in the
  //    background for next time.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

/* ============================================
   ADVANCED — READY-MADE SCAFFOLDS (inactive
   until you wire up the matching backend piece).
   ============================================ */

// PUSH NOTIFICATIONS — to activate: generate VAPID keys, collect each
// user's PushSubscription via pwa.js (Notification + PushManager API),
// store it against their account in Supabase, then send pushes from a
// small Vercel serverless function (or Supabase Edge Function) using
// those keys. The two listeners below just render whatever payload
// arrives once that pipeline exists.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); } catch (e) { payload = { title: "Rinku Kirana", body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Rinku Kirana", {
      body: payload.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-96.png",
      data: payload.url || "/index.html",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data || "/index.html";
  event.waitUntil(self.clients.openWindow(url));
});

// BACKGROUND SYNC — to activate: in pwa.js, when a cart/order action fails
// while offline, store it (e.g. in IndexedDB) and call
// navigator.serviceWorker.ready.then(r => r.sync.register('sync-cart')).
// This handler then retries it once connectivity returns.
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-cart") {
    event.waitUntil(
      Promise.resolve() // TODO: read queued cart actions from IndexedDB and replay them
    );
  }
});
