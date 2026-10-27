import { Prisma, Role } from "@prisma/client";

/**
 * Who may read a collection, and so the documents in it.
 *
 * A collection is open to everyone who can sign in, unless it is `restricted`:
 * then only admins and the users listed in `collection_members` may read it.
 * One definition, used by every service, so a new way of listing documents
 * cannot forget it. Where a reader may not see a collection the answer is "not
 * found", never "forbidden", so its existence is not revealed either.
 *
 * A document can be restricted too, with its own member list. Both must allow
 * the reader: a restricted document in a restricted collection needs a place in
 * both lists, and an open document in a restricted collection stays as closed as
 * the collection. Admins read everything.
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

/** The most people one restricted document can list; the picker and the server both hold to it. */
export const MAX_DOCUMENT_MEMBERS = 200;

export function canAccessDocument(
  document: { restricted: boolean },
  isDocumentMember: boolean,
  collection: { restricted: boolean },
  isCollectionMember: boolean,
  viewer: Pick<Viewer, "role">
): boolean {
  if (viewer.role === Role.ADMIN) return true;
  if (!canAccessCollection(collection, isCollectionMember, viewer)) return false;
  return !document.restricted || isDocumentMember;
}

/**
 * Prisma filter for the documents the viewer may read: the collection must allow
 * them and so must the document. The `AND` is deliberate, callers spread this
 * next to their own conditions and a top-level `OR` here would collide with theirs.
 */
export function documentReadableWhere(viewer: Viewer): Prisma.DocumentWhereInput {
  if (viewer.role === Role.ADMIN) return {};
  return {
    AND: [
      { collection: collectionReadableWhere(viewer) },
      { OR: [{ restricted: false }, { members: { some: { userId: viewer.id } } }] },
    ],
  };
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
 * The same rule for raw SQL over documents (`docAlias`) joined to their
 * collections (`colAlias`): both the collection's and the document's rules. As
 * with `collectionReadableSql`, it belongs in the WHERE that also produces any
 * total or count.
 */
export function documentReadableSql(viewer: Viewer, docAlias: string, colAlias: string): Prisma.Sql {
  if (viewer.role === Role.ADMIN) return Prisma.sql`TRUE`;
  const doc = Prisma.raw(docAlias);
  return Prisma.sql`(${collectionReadableSql(viewer, colAlias)} AND (${doc}.restricted = FALSE OR EXISTS (
    SELECT 1 FROM document_members dm WHERE dm."documentId" = ${doc}.id AND dm."userId" = ${viewer.id})))`;
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
 *
 * Restricted documents are covered by their ids only: they change when a document
 * is restricted, opened, created or deleted and when this user is added or removed,
 * but not when its text is edited, or every edit would empty everybody's cache.
 */
export function accessKey(
  viewer: Viewer,
  restricted: { id: string; updatedAt: Date | number }[],
  memberOf: string[],
  restrictedDocuments: string[] = [],
  memberOfDocuments: string[] = []
): string {
  if (viewer.role === Role.ADMIN) return "admin";
  if (restricted.length === 0 && restrictedDocuments.length === 0) return "open";
  const parts = restricted
    .map((c) => `${c.id}@${+c.updatedAt}`)
    .sort()
    .concat("|", [...new Set(memberOf)].sort());
  if (restrictedDocuments.length > 0) {
    parts.push("#", ...[...new Set(restrictedDocuments)].sort(), "|", ...[...new Set(memberOfDocuments)].sort());
  }
  // FNV-1a: not security, just a compact value that changes when the input does
  let hash = 0x811c9dc5;
  for (const ch of parts.join(",")) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}
