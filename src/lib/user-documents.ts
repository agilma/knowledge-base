import { DocumentStatus, Role } from "@prisma/client";

/**
 * Shared rules for the per-user document lists (favourites, recently opened).
 * `Favorite` and `RecentView` hold a plain `entityId` with no foreign key, so
 * a row can outlive its document or point at one the reader may not see. These
 * helpers are pure so those cases can be tested without a database.
 */

export const ENTITY_DOCUMENT = "DOCUMENT";

/** How many recently opened documents are kept per user. */
export const RECENT_LIMIT = 50;

/** Only editors and admins may see drafts and archived documents. */
export function canSeeUnpublished(role: Role | undefined): boolean {
  return role === Role.EDITOR || role === Role.ADMIN;
}

export function isDocumentVisible(
  status: DocumentStatus,
  role: Role | undefined
): boolean {
  return status === DocumentStatus.PUBLISHED || canSeeUnpublished(role);
}

/**
 * Returns the documents in the order of `ids`, dropping ids that no longer
 * resolve (deleted, or filtered out because the reader may not see them).
 */
export function orderByIds<T extends { id: string }>(
  ids: string[],
  documents: T[]
): T[] {
  const byId = new Map(documents.map((doc) => [doc.id, doc]));
  const ordered: T[] = [];
  for (const id of ids) {
    const doc = byId.get(id);
    if (doc) ordered.push(doc);
  }
  return ordered;
}

/**
 * Given rows sorted newest first, the ids that fall beyond `limit` and should
 * be deleted.
 */
export function idsToPrune(
  rowsNewestFirst: { id: string }[],
  limit: number = RECENT_LIMIT
): string[] {
  return rowsNewestFirst.slice(limit).map((row) => row.id);
}
