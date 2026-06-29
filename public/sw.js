const CACHE_NAME = "calm-wallet-static-v2";
const SAFE_CACHE_PATHS = [
  "/favicon.svg",
  "/manifest.webmanifest",
  "/icons/apple-touch-icon.png",
  "/icons/calm-wallet-icon-192.png",
  "/icons/calm-wallet-icon-512.png",
  "/icons/calm-wallet-maskable-512.png",
];
const IS_DEVELOPMENT_HOST = ["localhost", "127.0.0.1", "[::1]"].includes(self.location.hostname);

function logDevelopment(message, details) {
  if (IS_DEVELOPMENT_HOST) {
    console.info(`[calm-wallet-sw] ${message}`, details);
  }
}

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

  return SAFE_CACHE_PATHS.includes(url.pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const results = await Promise.all(
        SAFE_CACHE_PATHS.map(async (path) => {
          try {
            const response = await fetch(path, { cache: "reload" });

            if (!response.ok) {
              return { cached: false, path, status: response.status };
            }

            await cache.put(path, response);
            return { cached: true, path, status: response.status };
          } catch (error) {
            return { cached: false, errorName: error instanceof Error ? error.name : "UnknownError", path };
          }
        }),
      );

      logDevelopment("install cache population", results);
      await self.skipWaiting();
    }),
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
