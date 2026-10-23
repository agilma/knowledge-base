/**
 * Route rules for the service worker, kept out of `src/app/sw.ts` so they can
 * be tested: that file touches `self` on import and cannot be loaded in Node.
 *
 * A mistake here is silent. A page cached when it should not be shows stale or
 * private content; one left out is simply unreadable offline.
 */

/** Pages that open an editor. They must always reach the network. */
export function isEditorRoute(pathname: string): boolean {
  return (
    pathname === "/docs/new" ||
    pathname === "/collections/new" ||
    /^\/docs\/[^/]+\/edit$/.test(pathname) ||
    /^\/collections\/[^/]+\/edit$/.test(pathname)
  );
}

/** Readable pages that are cached for offline reading. */
export function isTargetPageRoute(pathname: string): boolean {
  const isTarget =
    pathname === "/" ||
    pathname === "/favorites" ||
    pathname === "/recent" ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/collections") ||
    pathname.startsWith("/docs");

  return isTarget && !isEditorRoute(pathname);
}

/**
 * Requests that must never be served from cache: anything but GET, auth
 * endpoints (the session lookup excepted), the login page, and editors.
 */
export function isNetworkOnlyRequest(method: string, pathname: string): boolean {
  if (method !== "GET") return true;
  if (pathname.startsWith("/api/auth")) {
    return pathname !== "/api/auth/session";
  }
  if (pathname === "/login") return true;
  return isEditorRoute(pathname);
}
