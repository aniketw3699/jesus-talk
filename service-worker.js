const CACHE_VERSION = "1into1-shell-v1";
const PAGE_CACHE = "1into1-pages-v1";
const STATIC_CACHE = "1into1-static-v1";

const APP_SHELL = [
  "/",
  "/index.html",
  "/bible.html",
  "/blogs.html",
  "/privacy.html",
  "/terms.html",
  "/refund.html",
  "/offline.html",
  "/offline-core.js",
  "/manifest.webmanifest",
  "/pwa-icon.svg",
  "/BG1.png",
  "/card-bg.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => ![CACHE_VERSION, PAGE_CACHE, STATIC_CACHE].includes(key))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isNavigation(request) {
  return request.mode === "navigate";
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache API/auth/backend calls.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/__/firebase/") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("firebase") ||
    url.hostname.includes("groq.com")
  ) {
    return;
  }

  if (isNavigation(request)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok && isSameOrigin(url)) {
            const copy = response.clone();
            caches.open(PAGE_CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match("/offline.html");
        })
    );
    return;
  }

  if (isSameOrigin(url)) {
    event.respondWith(
      caches.match(request).then(cached => {
        const network = fetch(request)
          .then(response => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then(cache => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);

        return cached || network;
      })
    );
  }
});