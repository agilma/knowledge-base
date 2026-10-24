"use client";

import { useEffect } from "react";
import { CACHE_OWNER_KEY, shouldClearCache } from "@/lib/cache-owner";

/**
 * Empties the offline page cache when the person (or their role) on this
 * browser changes. See `src/lib/cache-owner.ts` for why.
 */
export function CacheGuard({ owner }: { owner: string | null }) {
  useEffect(() => {
    if (!owner) return;

    let recorded: string | null;
    try {
      recorded = localStorage.getItem(CACHE_OWNER_KEY);
    } catch {
      // Storage blocked: we cannot tell, and clearing on every load would
      // defeat offline reading. Sign-out still clears the cache.
      return;
    }
    if (!shouldClearCache(recorded, owner)) return;

    const clear = async () => {
      try {
        if ("caches" in window) await caches.delete("pages-rsc-cache");
      } catch {
        // nothing more to do; the entries expire on their own
      }
      try {
        localStorage.setItem(CACHE_OWNER_KEY, owner);
      } catch {
        // see above
      }
    };
    void clear();
  }, [owner]);

  return null;
}
