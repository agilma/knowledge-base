import { DocumentStatus } from "@prisma/client";
import { db } from "../db";

export interface ReadOptions {
  includeDrafts?: boolean;
}

export async function getDocumentsByCollection(
  collectionId: string,
  options?: ReadOptions
) {
  const whereStatus = options?.includeDrafts
    ? undefined
    : DocumentStatus.PUBLISHED;

  return db.document.findMany({
    where: {
      collectionId,
      ...(whereStatus ? { status: whereStatus } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getDocumentBySlug(
  slug: string,
  options?: ReadOptions
) {
  const document = await db.document.findUnique({
    where: { slug },
    include: {
      collection: true,
      author: true,
    },
  });

  if (!document) return null;

  if (!options?.includeDrafts && document.status !== DocumentStatus.PUBLISHED) {
    return null;
  }

  return document;
}

export async function getRelatedDocuments(
  documentId: string,
  options?: ReadOptions
) {
  const relations = await db.documentRelation.findMany({
    where: { fromId: documentId },
    include: {
      to: {
        include: {
          collection: true,
        },
      },
    },
  });

  const documents = relations.map((rel) => rel.to);

  if (options?.includeDrafts) {
    return documents;
  }

  return documents.filter((doc) => doc.status === DocumentStatus.PUBLISHED);
}

export async function searchDocuments(
  query: string,
  options?: ReadOptions
) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const whereStatus = options?.includeDrafts
    ? undefined
    : DocumentStatus.PUBLISHED;

  return db.document.findMany({
    where: {
      ...(whereStatus ? { status: whereStatus } : {}),
      OR: [
        { title: { contains: trimmed, mode: "insensitive" } },
        { excerpt: { contains: trimmed, mode: "insensitive" } },
        { content: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    include: {
      collection: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}
