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

/** Stands for one person *and* what they may see: a promotion changes it too. */
export function cacheOwner(user: { id: string; role: string } | null | undefined): string | null {
  return user ? `${user.id}:${user.role}` : null;
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
