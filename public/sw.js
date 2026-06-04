const CACHE_NAME = "calm-wallet-static-v1";
const SAFE_CACHE_PATHS = [
  "/favicon.svg",
  "/manifest.webmanifest",
  "/icons/apple-touch-icon.png",
  "/icons/calm-ledger-icon-192.png",
  "/icons/calm-ledger-icon-512.png",
  "/icons/calm-ledger-maskable-512.png",
];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isSafeStaticRequest(request, url) {
  if (request.method !== "GET" || !isSameOrigin(url)) {
    return false;
  }

  if (request.mode === "navigate" || request.destination === "document") {
    return false;
  }

  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/assistant") ||
    url.pathname.startsWith("/transactions") ||
    url.pathname.startsWith("/insights")
  ) {
    return false;
  }

  return (
    SAFE_CACHE_PATHS.includes(url.pathname) ||
    (url.pathname.startsWith("/_next/static/") && (request.destination === "script" || request.destination === "style"))
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SAFE_CACHE_PATHS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (!isSafeStaticRequest(event.request, url)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkResponse = fetch(event.request).then((response) => {
        if (response.ok) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }

        return response;
      });

      return cachedResponse || networkResponse;
    }),
  );
});
