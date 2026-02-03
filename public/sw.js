// Bump the cache whenever we change caching behavior
const CACHE_NAME = "moviebay-v4";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png"
];

// API responses are dynamic; never cache them via the service worker.
const API_PREFIX = "/api";

// Patterns that should NEVER be cached to prevent React hook errors
const NEVER_CACHE_PATTERNS = [
  "/node_modules/",
  "/.vite/",
  "/src/",
  "@vite",
  "@react-refresh",
  "hot-update",
  ".ts",
  ".tsx"
];

// Check if running in development mode
const isDevelopment = () => {
  return self.location.hostname === "localhost" ||
         self.location.hostname.includes(".lovableproject.com") ||
         self.location.hostname.includes("lovable.app");
};

// Check if a URL should never be cached
const shouldNeverCache = (url) => {
  return NEVER_CACHE_PATTERNS.some(pattern => url.includes(pattern));
};

self.addEventListener("install", (event) => {
  // In development, skip caching entirely
  if (isDevelopment()) {
    self.skipWaiting();
    return;
  }
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  const urlString = requestUrl.toString();
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const isApiRequest = isSameOrigin && requestUrl.pathname.startsWith(API_PREFIX);

  // In development mode, bypass all caching
  if (isDevelopment()) {
    return;
  }

  // Never cache Vite dev dependencies, source files, etc.
  if (shouldNeverCache(urlString)) {
    return;
  }

  // Let API traffic go straight to the network to avoid stale data.
  if (isApiRequest) {
    return;
  }

  if (!isSameOrigin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Don't cache if it's a development resource
        if (shouldNeverCache(event.request.url)) {
          return response;
        }
        
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      });
    })
  );
});

// Listen for messages to unregister service worker
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
