import { DocumentStatus } from "@prisma/client";
import { db } from "../db";

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

export async function getCollectionsWithDocumentCount() {
  const collections = await db.collection.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          documents: {
            where: {
              status: DocumentStatus.PUBLISHED,
            },
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
