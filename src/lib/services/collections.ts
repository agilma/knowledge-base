import { CollectionStatus, DocumentStatus, Role } from "@prisma/client";
import { db } from "../db";
import { collectionSchema, CollectionInput } from "../validation/collection";
import { cache } from "react";
import { collectionReadableWhere, type Viewer } from "../collection-access";

// Rendered by the sidebar on every page, so dedupe it within a request. The key
// is the user and role as plain values: `cache` compares arguments by identity,
// and a fresh `viewer` object each time would never hit.
const listCollections = cache(async (userId: string, role: Role) => {
  return db.collection.findMany({
    where: collectionReadableWhere({ id: userId, role }),
    orderBy: { name: "asc" },
  });
});

/** The collections the viewer may read; a restricted one they are not in does not appear. */
export function getCollections(viewer: Viewer) {
  return listCollections(viewer.id, viewer.role);
}

/** Ids of the restricted collections this user was added to. */
export async function getMemberCollectionIds(userId: string): Promise<string[]> {
  const rows = await db.collectionMember.findMany({
    where: { userId },
    select: { collectionId: true },
  });
  return rows.map((row) => row.collectionId);
}

export async function getCollectionBySlug(slug: string, viewer: Viewer) {
  return db.collection.findFirst({
    where: { slug, ...collectionReadableWhere(viewer) },
  });
}

export async function getCollectionById(id: string, viewer: Viewer) {
  return db.collection.findFirst({
    where: { id, ...collectionReadableWhere(viewer) },
  });
}

export async function getCollectionsWithDocumentCount(options: { includeDrafts?: boolean; viewer: Viewer }) {
  const collections = await db.collection.findMany({
    where: collectionReadableWhere(options.viewer),
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          documents: {
            where: options.includeDrafts
              ? undefined
              : { status: DocumentStatus.PUBLISHED },
          },
        },
      },
    },
  });

  return collections.map((col) => ({
    ...col,
    documentCount: col._count.documents,
  }));
}

export async function isCollectionSlugAvailable(slug: string, excludeId?: string) {
  const existing = await db.collection.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!existing) return true;
  if (excludeId && existing.id === excludeId) return true;
  return false;
}

export async function createCollection(data: CollectionInput) {
  const validated = collectionSchema.parse(data);
  const isAvailable = await isCollectionSlugAvailable(validated.slug);
  if (!isAvailable) {
    throw new Error("Slug koleksi sudah digunakan");
  }

  return db.collection.create({
    data: {
      name: validated.name,
      slug: validated.slug,
      description: validated.description || null,
      icon: validated.icon || null,
      status: validated.status,
    },
  });
}

export async function updateCollection(id: string, data: CollectionInput) {
  const validated = collectionSchema.parse(data);
  const isAvailable = await isCollectionSlugAvailable(validated.slug, id);
  if (!isAvailable) {
    throw new Error("Slug koleksi sudah digunakan");
  }

  return db.collection.update({
    where: { id },
    data: {
      name: validated.name,
      slug: validated.slug,
      description: validated.description || null,
      icon: validated.icon || null,
      status: validated.status,
    },
  });
}

export async function setCollectionStatus(id: string, status: CollectionStatus) {
  return db.collection.update({
    where: { id },
    data: { status },
  });
}

export async function deleteCollection(id: string) {
  const docCount = await db.document.count({
    where: { collectionId: id },
  });

  if (docCount > 0) {
    throw new Error("Koleksi tidak dapat dihapus karena masih memiliki dokumen");
  }

  return db.collection.delete({
    where: { id },
  });
}
