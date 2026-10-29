/**
 * Route rules for the service worker, kept out of `src/app/sw.ts` so they can
 * be tested: that file touches `self` on import and cannot be loaded in Node.
 *
 * A mistake here is silent. A page cached when it should not be shows stale or
 * private content; one left out is simply unreadable offline.
 */

/**
 * Pages that open an editor, or show what only editors may see (a document's
 * revision history) or what people wrote (reader notes). They must always reach the network.
 */
export function isEditorRoute(pathname: string): boolean {
  return (
    pathname === "/docs/new" ||
    pathname === "/collections/new" ||
    /^\/docs\/[^/]+\/edit$/.test(pathname) ||
    /^\/docs\/[^/]+\/history(\/.*)?$/.test(pathname) ||
    // what readers wrote about a document: personal, and never worth showing stale
    /^\/docs\/[^/]+\/masukan$/.test(pathname) ||
    /^\/collections\/[^/]+\/edit$/.test(pathname)
  );
}

/**
 * Pages whose content belongs to the signed-in user. The cache is keyed by URL
 * alone, so a cached copy would be served to whoever uses the browser next,
 * including someone who is not signed in, since the proxy does not run when
 * the service worker answers.
 */
export function isPersonalRoute(pathname: string): boolean {
  return (
    pathname === "/favorites" ||
    pathname === "/recent" ||
    // Results depend on the reader's role (editors also get drafts) and on a
    // query that is rarely repeated, so a cached copy is more risk than help.
    pathname === "/search"
  );
}

/** Readable pages that are cached for offline reading. */
export function isTargetPageRoute(pathname: string): boolean {
  const isTarget =
    pathname === "/" ||
    pathname.startsWith("/collections") ||
    pathname.startsWith("/docs");

  return isTarget && !isEditorRoute(pathname);
}

/**
 * Requests that must never be served from cache: anything but GET, auth
 * endpoints (the session lookup excepted), the login page, editors, and
 * pages that hold one user's own lists.
 */
export function isNetworkOnlyRequest(method: string, pathname: string): boolean {
  if (method !== "GET") return true;
  if (pathname.startsWith("/api/auth")) {
    return pathname !== "/api/auth/session";
  }
  if (pathname === "/login") return true;
  // Admin downloads (the export) are generated per request and must never be stored.
  if (pathname.startsWith("/api/admin/")) return true;
  return isEditorRoute(pathname) || isPersonalRoute(pathname);
}
