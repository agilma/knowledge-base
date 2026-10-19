import { DocumentStatus } from "@prisma/client";
import { db } from "../db";
import { documentSchema, DocumentInput } from "../validation/document";

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

export async function getDocumentById(id: string) {
  return db.document.findUnique({
    where: { id },
    include: {
      collection: true,
      author: true,
    },
  });
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
  options?: ReadOptions & { collectionId?: string }
) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const whereStatus = options?.includeDrafts
    ? undefined
    : DocumentStatus.PUBLISHED;

  return db.document.findMany({
    where: {
      ...(whereStatus ? { status: whereStatus } : {}),
      ...(options?.collectionId ? { collectionId: options.collectionId } : {}),
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

export async function getRecentlyUpdatedDocuments(
  limit: number = 5,
  options?: ReadOptions
) {
  const whereStatus = options?.includeDrafts
    ? undefined
    : DocumentStatus.PUBLISHED;

  return db.document.findMany({
    where: {
      ...(whereStatus ? { status: whereStatus } : {}),
    },
    include: {
      collection: true,
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

export async function isDocumentSlugAvailable(slug: string, excludeId?: string) {
  const existing = await db.document.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!existing) return true;
  if (excludeId && existing.id === excludeId) return true;
  return false;
}

export async function createDocument(data: DocumentInput, authorId?: string) {
  const validated = documentSchema.parse(data);
  const isAvailable = await isDocumentSlugAvailable(validated.slug);
  if (!isAvailable) {
    throw new Error("Slug dokumen sudah digunakan");
  }

  return db.document.create({
    data: {
      title: validated.title,
      slug: validated.slug,
      collectionId: validated.collectionId,
      type: validated.type,
      excerpt: validated.excerpt || null,
      content: validated.content,
      status: validated.status,
      authorId: authorId || null,
    },
  });
}

export async function updateDocument(id: string, data: DocumentInput) {
  const validated = documentSchema.parse(data);

  const existingDoc = await db.document.findUnique({
    where: { id },
  });

  if (!existingDoc) {
    throw new Error("Dokumen tidak ditemukan");
  }

  // Jika dokumen pernah / sedang PUBLISHED atau ARCHIVED (bukan DRAFT murni), slug tidak boleh diubah
  if (existingDoc.status !== DocumentStatus.DRAFT && existingDoc.slug !== validated.slug) {
    throw new Error("Dokumen yang sudah pernah dipublikasi tidak boleh diubah slugnya");
  }

  const isAvailable = await isDocumentSlugAvailable(validated.slug, id);
  if (!isAvailable) {
    throw new Error("Slug dokumen sudah digunakan");
  }

  return db.document.update({
    where: { id },
    data: {
      title: validated.title,
      slug: validated.slug,
      collectionId: validated.collectionId,
      type: validated.type,
      excerpt: validated.excerpt || null,
      content: validated.content,
      status: validated.status,
    },
  });
}

export async function setDocumentStatus(id: string, status: DocumentStatus) {
  return db.document.update({
    where: { id },
    data: { status },
  });
}

export async function deleteDocument(id: string) {
  return db.document.delete({
    where: { id },
  });
}
