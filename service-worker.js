/* ============================================
   RINKU KIRANA — SERVICE WORKER

   BUG FIX (Info #13): CACHE_VERSION ab auto-bump ke liye ready hai.
   Build step ya Vercel deployment script se ye value inject kar sakte ho.

   OPTION A (Recommended) — Build script se inject karo:
     package.json script mein add karo:
       "prebuild": "node scripts/bump-sw-version.js"
     scripts/bump-sw-version.js mein:
       const fs = require('fs');
       const sw = fs.readFileSync('service-worker.js', 'utf8');
       const ts = Date.now();
       fs.writeFileSync('service-worker.js', sw.replace(/CACHE_VERSION = "v\d+[^"]*"/, `CACHE_VERSION = "v${ts}"`));

   OPTION B — Deploy hook (Vercel):
     Vercel settings > Git > Deploy Hooks se ek webhook banao,
     jo deployment ke baad is file ko rewrite kare.

   OPTION C (Manual — current) — Har deploy par neeche ki line mein
     version number manually badhao. Ye simple hai par bhoolne par
     users purana cached version dekhte rahenge.

   Ab current version:
   ============================================ */
"use strict";

// BUG FIX (Info #13): Version string ab comments mein clearly marked hai.
// Har deploy par yahan ka number badhao agar OPTION C use kar rahe ho.
const CACHE_VERSION = "v7"; // ← deploy par ye badhao (ya build script se auto-inject karo)
const CACHE_NAME = `rk-cache-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.json",
  "/auth.css",
  "/pwa.css",
  "/icons/app-logo.png",
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
  // NOTE: skipWaiting() deliberately NOT called here.
  // pwa.js "Update available" banner user ko control deta hai.
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

// Page se force-activate trigger
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

// ── FETCH ──────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Supabase calls aur non-GET kabhi intercept nahi karo
  if (
    req.method !== "GET" ||
    url.hostname.endsWith("supabase.co") ||
    url.hostname.endsWith("supabase.in")
  ) {
    return;
  }

  // Cross-origin (CDN, fonts) pass through
  if (url.origin !== self.location.origin) return;

  // Page navigations: network-first → cache → offline
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

  // Static assets: stale-while-revalidate
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

// ── PUSH NOTIFICATIONS ─────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); }
  catch (e) { payload = { title: "Rinku Kirana", body: event.data.text() }; }

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

// ── BACKGROUND SYNC ────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-cart") {
    event.waitUntil(
      Promise.resolve() // TODO: IndexedDB se queued cart actions replay karo
    );
  }
});
