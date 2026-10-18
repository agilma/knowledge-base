import { CollectionStatus, DocumentStatus } from "@prisma/client";
import { db } from "../db";
import { collectionSchema, CollectionInput } from "../validation/collection";

export async function getCollections() {
  return db.collection.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getCollectionBySlug(slug: string) {
  return db.collection.findUnique({
    where: { slug },
  });
}

export async function getCollectionById(id: string) {
  return db.collection.findUnique({
    where: { id },
  });
}

export async function getCollectionsWithDocumentCount(options?: { includeDrafts?: boolean }) {
  const collections = await db.collection.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          documents: {
            where: options?.includeDrafts
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
