const CACHE_NAME = "epsilone-pwa-v1";

const APP_SHELL = [
  "/",
  "/offline",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  "/icons/apple-touch-icon.png",
];

const NEVER_CACHE_PREFIXES = [
  "/api/",
  "/auth/",
  "/login",
  "/signup",
  "/forgot-password",
  "/update-password",
  "/producer/login",
  "/producer/signup",
  "/producer/forgot-password",
  "/producer/setup",
  "/dashboard",
  "/producer",
  "/cart",
  "/checkout",
  "/payment",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function shouldBypass(pathname) {
  return NEVER_CACHE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Never intercept cross-origin requests.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Keep auth, API, dashboard, producer, checkout and payment flows online-only.
  if (shouldBypass(url.pathname)) {
    return;
  }

  // Cache immutable/static assets by URL. Next.js uses hashed asset filenames,
  // so old assets remain safe to reuse after a deployment.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }

        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }

          return response;
        });
      }),
    );

    return;
  }

  // Public page navigation: network-first, then the last cached version,
  // then the offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }

          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);

          if (cached) {
            return cached;
          }

          return (
            (await caches.match("/offline")) ||
            (await caches.match("/"))
          );
        }),
    );
  }
});
