/**
 * Who the cached pages belong to.
 *
 * The service worker keys its page cache by URL alone, so pages fetched for one
 * person (an editor's drafts, say) would be served to the next person to use
 * the same browser. Signing out clears the cache, but a session that simply
 * expires, or someone else signing in, does not. So each page records whom it
 * was rendered for, and a change of person or role empties the cache.
 */

export const CACHE_OWNER_KEY = "kb:cache-owner";

/**
 * Stands for one person *and* what they may see: a promotion changes it too,
 * and so does being added to or removed from a restricted collection (`access`,
 * see `accessKey`). Someone in no restricted collection, and every admin, keep
 * the plain `id:role` form, so adding the feature did not empty their caches.
 */
export function cacheOwner(
  user: { id: string; role: string } | null | undefined,
  access?: string
): string | null {
  if (!user) return null;
  const base = `${user.id}:${user.role}`;
  return access && access !== "open" && access !== "admin" ? `${base}:${access}` : base;
}

/**
 * Empty the cache when the page belongs to someone other than whoever filled
 * it, or when nothing is recorded (it may hold another person's pages). A page
 * with nobody signed in leaves the cache alone: signing out already cleared it.
 */
export function shouldClearCache(recorded: string | null, current: string | null): boolean {
  if (current === null) return false;
  return recorded !== current;
}
