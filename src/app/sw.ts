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

const runtimeCaching: RuntimeCaching[] = [
  // 1. Explicitly exclude Auth, Login, POST/Server actions, and Edit/New creation pages -> NetworkOnly
  {
    matcher: ({ url, request }) => {
      if (request.method !== "GET") return true;
      const { pathname } = url;
      if (pathname.startsWith("/api/auth") || pathname === "/login") return true;
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
  if (event.data && event.data.type === "CLEAR_PAGE_CACHE") {
    event.waitUntil(
      caches.delete("pages-rsc-cache").then(() => {
        console.log("[SW] Runtime page cache cleared on logout.");
      })
    );
  }
});

serwist.addEventListeners();
