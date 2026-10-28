import { db } from "../db";
import { normalizeMissQuery } from "../search-miss";

export const MISS_RETENTION_DAYS = 180;
/** The list never keeps more phrases than this; the oldest go first. */
export const MISS_CAP = 2000;

let lastPurge = 0;

/** Removes old phrases and anything beyond the cap. At most hourly per instance; never fails the caller. */
export async function purgeSearchMisses(now = Date.now(), force = false): Promise<void> {
  if (!force && now - lastPurge < 60 * 60 * 1000) return;
  lastPurge = now;
  try {
    await db.searchMiss.deleteMany({ where: { lastAt: { lt: new Date(now - MISS_RETENTION_DAYS * 24 * 60 * 60 * 1000) } } });
    await db.$executeRaw`DELETE FROM search_misses WHERE query IN (SELECT query FROM search_misses ORDER BY "lastAt" DESC OFFSET ${MISS_CAP})`;
  } catch {
    // housekeeping only
  }
}

/** Counts one more search that found nothing. Returns false when the phrase is not kept (see normalizeMissQuery). */
export async function recordSearchMiss(raw: string): Promise<boolean> {
  const query = normalizeMissQuery(raw);
  if (!query) return false;
  await db.$executeRaw`
    INSERT INTO search_misses (query, count, "firstAt", "lastAt") VALUES (${query}, 1, now(), now())
    ON CONFLICT (query) DO UPDATE SET count = search_misses.count + 1, "lastAt" = now()`;
  void purgeSearchMisses();
  return true;
}

export interface SearchMissItem {
  query: string;
  count: number;
  firstAt: Date;
  lastAt: Date;
}

/** The phrases searched most, within the last `sinceDays`, for editors to see what is missing. */
export async function listSearchMisses(options: { limit?: number; sinceDays?: number } = {}): Promise<SearchMissItem[]> {
  const since = new Date(Date.now() - (options.sinceDays ?? 90) * 24 * 60 * 60 * 1000);
  return db.searchMiss.findMany({
    where: { lastAt: { gte: since } },
    orderBy: [{ count: "desc" }, { lastAt: "desc" }],
    take: options.limit ?? 50,
  });
}

/** "Abaikan": the phrase leaves the list (it comes back if someone searches for it again). */
export async function dismissSearchMiss(query: string): Promise<boolean> {
  if (typeof query !== "string" || !query) return false;
  const { count } = await db.searchMiss.deleteMany({ where: { query } });
  return count > 0;
}
