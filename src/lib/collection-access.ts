import { Prisma, Role } from "@prisma/client";

/**
 * Who may read a collection, and so the documents in it.
 *
 * A collection is open to everyone who can sign in, unless it is `restricted`:
 * then only admins and the users listed in `collection_members` may read it.
 * One definition, used by every service, so a new way of listing documents
 * cannot forget it. Where a reader may not see a collection the answer is "not
 * found", never "forbidden", so its existence is not revealed either.
 */
export interface Viewer {
  id: string;
  role: Role;
}

/** The most people one restricted collection can list; the picker and the server both hold to it. */
export const MAX_COLLECTION_MEMBERS = 200;

export function canAccessCollection(
  collection: { restricted: boolean },
  isMember: boolean,
  viewer: Pick<Viewer, "role">
): boolean {
  if (!collection.restricted) return true;
  if (viewer.role === Role.ADMIN) return true;
  return isMember;
}

/** Prisma filter for collections the viewer may read. */
export function collectionReadableWhere(viewer: Viewer): Prisma.CollectionWhereInput {
  if (viewer.role === Role.ADMIN) return {};
  return { OR: [{ restricted: false }, { members: { some: { userId: viewer.id } } }] };
}

/** Prisma filter for documents inside collections the viewer may read. */
export function documentReadableWhere(viewer: Viewer): Prisma.DocumentWhereInput {
  if (viewer.role === Role.ADMIN) return {};
  return { collection: collectionReadableWhere(viewer) };
}

/**
 * The same rule for raw SQL. `alias` is the collections table in the query;
 * the filter must sit in the WHERE that also produces any total or count, not
 * after it, or the numbers would reveal what was hidden.
 */
export function collectionReadableSql(viewer: Viewer, alias: string): Prisma.Sql {
  if (viewer.role === Role.ADMIN) return Prisma.sql`TRUE`;
  const col = Prisma.raw(alias);
  return Prisma.sql`(${col}.restricted = FALSE OR EXISTS (
    SELECT 1 FROM collection_members m WHERE m."collectionId" = ${col}.id AND m."userId" = ${viewer.id}))`;
}

/**
 * A short fingerprint of what a user may read beyond the open collections, for
 * the offline cache owner (src/lib/cache-owner.ts).
 *
 * It covers **every** restricted collection (id and last change), not only the
 * ones the user belongs to: a collection turning restricted must empty the cache
 * of the people who are not in it, which is exactly the case this exists for.
 * It changes when a collection is restricted or opened, when one changes
 * (members, documents moved in or out touch `updatedAt`), and when this user is
 * added or removed. With no restricted collection, and for admins, it stays the
 * plain value so nothing is emptied for features nobody uses.
 */
export function accessKey(
  viewer: Viewer,
  restricted: { id: string; updatedAt: Date | number }[],
  memberOf: string[]
): string {
  if (viewer.role === Role.ADMIN || restricted.length === 0) return viewer.role === Role.ADMIN ? "admin" : "open";
  const parts = restricted
    .map((c) => `${c.id}@${+c.updatedAt}`)
    .sort()
    .concat("|", [...new Set(memberOf)].sort());
  // FNV-1a: not security, just a compact value that changes when the input does
  let hash = 0x811c9dc5;
  for (const ch of parts.join(",")) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}
