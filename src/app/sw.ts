/// <reference lib="webworker" />

import { CacheableResponsePlugin, ExpirationPlugin } from "serwist";
import type { PrecacheEntry, RuntimeCaching } from "serwist";
import { Serwist, NetworkFirst, NetworkOnly, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope {
    __SW_MANIFEST: (string | PrecacheEntry)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const docCacheTimestamps = new Map<string, number>();

// Next.js appends a fresh `_rsc` hash to every client-side navigation, so
// caching requests under their own URL stored one throwaway entry per
// navigation and pushed the real documents out past `maxEntries`. Collapse
// every RSC payload for a route onto one stable key, kept distinct from the
// clean URL that holds the HTML document.
function cacheKeyFor(request: Request): string {
  const url = new URL(request.url);
  const isRsc = url.searchParams.has("_rsc") || request.headers.get("RSC") === "1";
  if (!isRsc) return url.toString();

  url.searchParams.delete("_rsc");
  url.searchParams.set("__rsc", "1");
  return url.toString();
}

// The clients cannot see that a navigation was served from cache, and
// `navigator.onLine` stays true whenever the device has any connection at all.
// Tell them what actually happened on the wire instead.
let networkReachable = true;

async function broadcastNetworkStatus(reachable: boolean): Promise<void> {
  const changed = reachable !== networkReachable;
  networkReachable = reachable;
  if (!changed) return;

  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) {
    client.postMessage({ type: "NETWORK_STATUS", reachable });
  }
}

function isTargetPageRoute(pathname: string): boolean {
  const isTarget =
    pathname === "/" ||
    pathname === "/favorites" ||
    pathname === "/recent" ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/collections") ||
    pathname.startsWith("/docs");

  if (!isTarget) return false;

  if (
    pathname === "/docs/new" ||
    pathname === "/collections/new" ||
    pathname.match(/^\/docs\/[^/]+\/edit$/) ||
    pathname.match(/^\/collections\/[^/]+\/edit$/)
  ) {
    return false;
  }

  return true;
}

const runtimeCaching: RuntimeCaching[] = [
  // 1. GET /api/auth/session -> NetworkFirst (cached in pages-rsc-cache)
  {
    matcher: ({ url, request }) => {
      return request.method === "GET" && url.pathname === "/api/auth/session";
    },
    handler: new NetworkFirst({
      cacheName: "pages-rsc-cache",
      networkTimeoutSeconds: 3,
      plugins: [
        new CacheableResponsePlugin({
          statuses: [200],
        }),
      ],
    }),
  },

  // 2. Explicitly exclude Auth (except GET session), Login, POST/Server actions, and Edit/New creation pages -> NetworkOnly
  {
    matcher: ({ url, request }) => {
      if (request.method !== "GET") return true;
      const { pathname } = url;
      if (pathname.startsWith("/api/auth")) {
        if (pathname === "/api/auth/session") return false;
        return true;
      }
      if (pathname === "/login") return true;
      if (
        pathname === "/docs/new" ||
        pathname === "/collections/new" ||
        pathname.match(/^\/docs\/[^/]+\/edit$/) ||
        pathname.match(/^\/collections\/[^/]+\/edit$/)
      ) {
        return true;
      }
      return false;
    },
    handler: new NetworkOnly(),
  },

  // 2. NetworkFirst for navigation pages and RSC requests
  {
    matcher: ({ url, request }) => {
      if (request.method !== "GET") return false;
      const { pathname } = url;

      const isTargetRoute =
        pathname === "/" ||
        pathname === "/favorites" ||
        pathname === "/recent" ||
        pathname.startsWith("/search") ||
        pathname.startsWith("/collections") ||
        pathname.startsWith("/docs");

      if (!isTargetRoute) return false;

      // Exclude creation and edit pages
      if (
        pathname === "/docs/new" ||
        pathname === "/collections/new" ||
        pathname.match(/^\/docs\/[^/]+\/edit$/) ||
        pathname.match(/^\/collections\/[^/]+\/edit$/)
      ) {
        return false;
      }

      return true;
    },
    handler: new NetworkFirst({
      cacheName: "pages-rsc-cache",
      networkTimeoutSeconds: 3,
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
        {
          cacheKeyWillBeUsed: async ({ request }) => cacheKeyFor(request),
          async fetchDidFail() {
            await broadcastNetworkStatus(false);
          },
          async fetchDidSucceed({ request, response, event }) {
            await broadcastNetworkStatus(true);
            if (request.method === "GET") {
              const url = new URL(request.url);
              const isRsc = url.searchParams.has("_rsc") || request.headers.get("RSC") === "1";
              if (isRsc) {
                const docUrl = new URL(request.url);
                docUrl.searchParams.delete("_rsc");

                if (isTargetPageRoute(docUrl.pathname)) {
                  const key = docUrl.toString();
                  const now = Date.now();
                  const lastCached = docCacheTimestamps.get(key) || 0;

                  if (now - lastCached > 5 * 60 * 1000) {
                    const fetchAndCacheDoc = async () => {
                      try {
                        const cache = await caches.open("pages-rsc-cache");
                        const cachedResp = await cache.match(key);
                        if (cachedResp) {
                          const dateHeader = cachedResp.headers.get("date");
                          if (dateHeader) {
                            const cachedTime = new Date(dateHeader).getTime();
                            if (!isNaN(cachedTime) && now - cachedTime < 5 * 60 * 1000) {
                              docCacheTimestamps.set(key, cachedTime);
                              return;
                            }
                          }
                        }

                        const docReq = new Request(key, {
                          headers: {
                            Accept:
                              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                          },
                          credentials: "same-origin",
                        });
                        const docRes = await fetch(docReq);
                        if (
                          docRes.status === 200 &&
                          docRes.headers.get("content-type")?.includes("text/html")
                        ) {
                          await cache.put(key, docRes.clone());
                          docCacheTimestamps.set(key, now);
                        }
                      } catch {
                        // ignore background fetch failures when offline
                      }
                    };

                    if (event && typeof event.waitUntil === "function") {
                      event.waitUntil(fetchAndCacheDoc());
                    } else {
                      fetchAndCacheDoc();
                    }
                  }
                }
              }
            }
            return response;
          },
        },
      ],
    }),
  },

  // 3. Static Assets -> StaleWhileRevalidate
  {
    matcher: ({ url }) => {
      const { pathname } = url;
      return (
        pathname.startsWith("/_next/static/") ||
        pathname.startsWith("/icons/") ||
        url.hostname.includes("fonts.googleapis.com") ||
        url.hostname.includes("fonts.gstatic.com")
      );
    },
    handler: new StaleWhileRevalidate({
      cacheName: "static-assets",
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

// Listener for clearing runtime page cache on sign out
self.addEventListener("message", (event) => {
  // A page that has just loaded missed any earlier broadcast, so let it ask.
  if (event.data && event.data.type === "QUERY_NETWORK_STATUS") {
    const source = event.source;
    if (source && "postMessage" in source) {
      (source as Client).postMessage({
        type: "NETWORK_STATUS",
        reachable: networkReachable,
      });
    }
    return;
  }

  if (event.data && event.data.type === "CLEAR_PAGE_CACHE") {
    event.waitUntil(
      caches.delete("pages-rsc-cache").then(() => {
        console.log("[SW] Runtime page cache cleared on logout.");
      })
    );
  }
});

serwist.addEventListeners();
