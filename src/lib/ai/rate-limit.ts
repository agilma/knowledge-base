/**
 * Sliding-window limiter, kept in memory. On serverless each instance counts
 * on its own, so this is a brake on a runaway client or a loop, not a hard
 * quota; the hard quota is the spend limit on the Anthropic account.
 */
export function createRateLimiter(options: {
  limit: number;
  windowMs: number;
  now?: () => number;
}) {
  const now = options.now ?? Date.now;
  const hits = new Map<string, number[]>();

  return {
    /** Records an attempt for `key`; `ok` is false when the window is full. */
    take(key: string): { ok: true } | { ok: false; retryAfterMs: number } {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((at) => t - at < options.windowMs);
      if (recent.length >= options.limit) {
        hits.set(key, recent);
        return { ok: false, retryAfterMs: options.windowMs - (t - recent[0]) };
      }
      recent.push(t);
      hits.set(key, recent);
      // Keys that stopped asking would otherwise stay for the life of the instance.
      if (hits.size > 1000) {
        for (const [k, v] of hits) {
          if (v.every((at) => t - at >= options.windowMs)) hits.delete(k);
        }
      }
      return { ok: true };
    },
  };
}
