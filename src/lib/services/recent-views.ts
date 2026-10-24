import { Role } from "@prisma/client";
import { db } from "../db";
import {
  ENTITY_DOCUMENT,
  RECENT_LIMIT,
  idsToPrune,
  isDocumentVisible,
  orderByIds,
} from "../user-documents";

/**
 * Notes that a user opened a document. `RecentView` has no unique key, so the
 * old row is replaced rather than a second one added, and the list is trimmed
 * to `RECENT_LIMIT`, keeping the table from growing with every page view.
 */
export async function recordView(
  userId: string,
  documentId: string,
  role: Role | undefined
): Promise<boolean> {
  const doc = await db.document.findUnique({
    where: { id: documentId },
    select: { status: true },
  });
  if (!doc || !isDocumentVisible(doc.status, role)) return false;

  await db.$transaction(async (tx) => {
    await tx.recentView.deleteMany({
      where: { userId, entityType: ENTITY_DOCUMENT, entityId: documentId },
    });
    await tx.recentView.create({
      data: { userId, entityType: ENTITY_DOCUMENT, entityId: documentId },
    });

    const rows = await tx.recentView.findMany({
      where: { userId, entityType: ENTITY_DOCUMENT },
      orderBy: { viewedAt: "desc" },
      select: { id: true },
    });
    const stale = idsToPrune(rows, RECENT_LIMIT);
    if (stale.length > 0) {
      await tx.recentView.deleteMany({ where: { id: { in: stale } } });
    }
  });
  return true;
}

/** Most recently opened first; documents the reader can no longer see are skipped. */
export async function getRecentDocuments(
  userId: string,
  role: Role | undefined,
  limit: number = 20
) {
  const rows = await db.recentView.findMany({
    where: { userId, entityType: ENTITY_DOCUMENT },
    orderBy: { viewedAt: "desc" },
    select: { entityId: true },
  });
  const ids = rows.map((row) => row.entityId);
  if (ids.length === 0) return [];

  const documents = await db.document.findMany({
    where: { id: { in: ids } },
    include: { collection: true },
  });
  return orderByIds(
    ids,
    documents.filter((doc) => isDocumentVisible(doc.status, role))
  ).slice(0, limit);
}
