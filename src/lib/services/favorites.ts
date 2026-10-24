import { Role } from "@prisma/client";
import { db } from "../db";
import { documentReadableWhere } from "../collection-access";
import {
  ENTITY_DOCUMENT,
  isDocumentVisible,
  orderByIds,
} from "../user-documents";

export async function isFavorite(userId: string, documentId: string) {
  const row = await db.favorite.findUnique({
    where: {
      userId_entityType_entityId: {
        userId,
        entityType: ENTITY_DOCUMENT,
        entityId: documentId,
      },
    },
    select: { id: true },
  });
  return row !== null;
}

/**
 * Sets the state outright instead of toggling it, so a double click or a
 * retried request cannot flip it back.
 */
export async function setFavorite(
  userId: string,
  documentId: string,
  favorite: boolean,
  role: Role | undefined
): Promise<boolean> {
  if (!favorite) {
    await db.favorite.deleteMany({
      where: { userId, entityType: ENTITY_DOCUMENT, entityId: documentId },
    });
    return true;
  }

  const doc = await db.document.findFirst({
    where: { id: documentId, ...documentReadableWhere({ id: userId, role: role ?? Role.VIEWER }) },
    select: { status: true },
  });
  if (!doc || !isDocumentVisible(doc.status, role)) return false;

  await db.favorite.upsert({
    where: {
      userId_entityType_entityId: {
        userId,
        entityType: ENTITY_DOCUMENT,
        entityId: documentId,
      },
    },
    create: { userId, entityType: ENTITY_DOCUMENT, entityId: documentId },
    update: {},
  });
  return true;
}

/** Newest favourite first; documents the reader can no longer see are skipped. */
export async function getFavoriteDocuments(
  userId: string,
  role: Role | undefined
) {
  const rows = await db.favorite.findMany({
    where: { userId, entityType: ENTITY_DOCUMENT },
    orderBy: { createdAt: "desc" },
    select: { entityId: true },
  });
  const ids = rows.map((row) => row.entityId);
  if (ids.length === 0) return [];

  const documents = await db.document.findMany({
    where: { id: { in: ids }, ...documentReadableWhere({ id: userId, role: role ?? Role.VIEWER }) },
    include: { collection: true },
  });
  return orderByIds(
    ids,
    documents.filter((doc) => isDocumentVisible(doc.status, role))
  );
}
