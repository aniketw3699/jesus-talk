const CACHE_VERSION = "1into1-shell-v4";
const PAGE_CACHE = "1into1-pages-v4";
const STATIC_CACHE = "1into1-static-v4";
const BIBLE_CACHE = "1into1-bible-web-v1";

const BIBLE_SOURCE_BASE = "https://raw.githubusercontent.com/TehShrike/world-english-bible/master/json/";
const BIBLE_SLUGS = [
  "genesis","exodus","leviticus","numbers","deuteronomy","joshua","judges","ruth","1samuel","2samuel",
  "1kings","2kings","1chronicles","2chronicles","ezra","nehemiah","esther","job","psalms","proverbs",
  "ecclesiastes","songofsolomon","isaiah","jeremiah","lamentations","ezekiel","daniel","hosea","joel","amos",
  "obadiah","jonah","micah","nahum","habakkuk","zephaniah","haggai","zechariah","malachi",
  "matthew","mark","luke","john","acts","romans","1corinthians","2corinthians","galatians","ephesians",
  "philippians","colossians","1thessalonians","2thessalonians","1timothy","2timothy","titus","philemon","hebrews",
  "james","1peter","2peter","1john","2john","3john","jude","revelation"
];
const BIBLE_URLS = BIBLE_SLUGS.map(slug => BIBLE_SOURCE_BASE + slug + ".json");

const APP_SHELL = [
  "/",
  "/index.html",
  "/bible.html",
  "/blogs.html",
  "/privacy.html",
  "/terms.html",
  "/refund.html",
  "/offline.html",
  "/local-scripture-data.js",
  "/offline-core.js",
  "/local-experiences.js",
  "/bible-manifest.js",
  "/local-bible-engine.js",
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
          .filter(key => ![CACHE_VERSION, PAGE_CACHE, STATIC_CACHE, BIBLE_CACHE].includes(key))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function bibleCacheCount() {
  const cache = await caches.open(BIBLE_CACHE);
  const keys = await cache.keys();
  return keys.filter(request => {
    try {
      return new URL(request.url).href.startsWith(BIBLE_SOURCE_BASE);
    } catch (_) {
      return false;
    }
  }).length;
}

async function broadcastBibleProgress(done, total, state) {
  const clientsList = await self.clients.matchAll({ includeUncontrolled:true, type:"window" });
  clientsList.forEach(client => client.postMessage({
    type:"BIBLE_CACHE_PROGRESS",
    done:done,
    total:total,
    state:state || (done >= total ? "ready" : "preparing")
  }));
}

async function prepareBibleLibrary() {
  const cache = await caches.open(BIBLE_CACHE);
  let done = await bibleCacheCount();
  await broadcastBibleProgress(done, BIBLE_URLS.length, done >= BIBLE_URLS.length ? "ready" : "preparing");
  if (done >= BIBLE_URLS.length) return;

  const cachedSet = new Set((await cache.keys()).map(req => req.url));
  const missing = BIBLE_URLS.filter(url => !cachedSet.has(url));
  const concurrency = 4;

  for (let i = 0; i < missing.length; i += concurrency) {
    const batch = missing.slice(i, i + concurrency);
    const results = await Promise.all(batch.map(async url => {
      try {
        const response = await fetch(url, { mode:"cors", cache:"no-cache" });
        if (!response.ok) return false;
        await cache.put(url, response.clone());
        return true;
      } catch (_) {
        return false;
      }
    }));
    done += results.filter(Boolean).length;
    await broadcastBibleProgress(done, BIBLE_URLS.length, done >= BIBLE_URLS.length ? "ready" : "preparing");
  }
}

self.addEventListener("message", event => {
  if (!event.data) return;
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (event.data.type === "GET_BIBLE_CACHE_STATUS") {
    event.waitUntil(
      bibleCacheCount().then(done => broadcastBibleProgress(
        done,
        BIBLE_URLS.length,
        done >= BIBLE_URLS.length ? "ready" : "preparing"
      ))
    );
    return;
  }
  if (event.data.type === "PREPARE_BIBLE_LIBRARY") {
    event.waitUntil(prepareBibleLibrary());
  }
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isNavigation(request) {
  return request.mode === "navigate";
}

function isBibleSource(url) {
  return url.href.startsWith(BIBLE_SOURCE_BASE);
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (isBibleSource(url)) {
    event.respondWith(
      caches.open(BIBLE_CACHE).then(async cache => {
        const cached = await cache.match(request.url);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response && response.ok) {
            await cache.put(request.url, response.clone());
          }
          return response;
        } catch (_) {
          return cached || new Response(
            JSON.stringify({ error:"Bible book is not cached yet." }),
            { status:503, headers:{ "Content-Type":"application/json" } }
          );
        }
      })
    );
    return;
  }

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