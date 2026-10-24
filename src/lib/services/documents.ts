import { DocumentStatus, DocumentType, Prisma } from "@prisma/client";
import { db } from "../db";
import {
  HIGHLIGHT_START,
  HIGHLIGHT_STOP,
  SEARCH_CONFIG,
  SEARCH_VECTOR_SQL,
  cleanSnippet,
  toTsQuery,
} from "../search-query";
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

export const SEARCH_RESULT_LIMIT = 50;

export interface SearchOptions extends ReadOptions {
  collectionId?: string;
  type?: DocumentType;
}

interface SearchRow {
  id: string;
  total: bigint;
  titleHighlight: string;
  excerptHighlight: string | null;
  snippet: string;
}

/**
 * Full-text search, most relevant first. Highlights come back marked with
 * HIGHLIGHT_START / HIGHLIGHT_STOP; use `splitHighlights` to render them.
 *
 * Visibility is decided here, in SQL, and nowhere else: without
 * `includeDrafts` only PUBLISHED documents can match.
 */
export async function searchDocuments(query: string, options?: SearchOptions) {
  const tsQuery = toTsQuery(query);
  if (!tsQuery) return { results: [], total: 0 };

  const vector = Prisma.raw(SEARCH_VECTOR_SQL);
  const headline = (column: Prisma.Sql, extra: string) =>
    Prisma.sql`ts_headline(${SEARCH_CONFIG}::regconfig, ${column}, q.query,
      ${`StartSel=${HIGHLIGHT_START}, StopSel=${HIGHLIGHT_STOP}, ${extra}`})`;

  const rows = await db.$queryRaw<SearchRow[]>`
    WITH q AS (SELECT to_tsquery(${SEARCH_CONFIG}::regconfig, ${tsQuery}) AS query),
    hits AS (
      SELECT d.id, d.title, d.excerpt, d.content, d."updatedAt",
             ts_rank(${vector}, q.query, 1) AS rank,
             count(*) OVER () AS total
      FROM documents d, q
      WHERE ${vector} @@ q.query
        ${options?.includeDrafts ? Prisma.empty : Prisma.sql`AND d.status = 'PUBLISHED'`}
        ${options?.collectionId ? Prisma.sql`AND d."collectionId" = ${options.collectionId}` : Prisma.empty}
        ${options?.type ? Prisma.sql`AND d.type = ${options.type}::"DocumentType"` : Prisma.empty}
      ORDER BY rank DESC, d."updatedAt" DESC
      LIMIT ${SEARCH_RESULT_LIMIT}
    )
    SELECT hits.id, hits.total,
           ${headline(Prisma.sql`hits.title`, "HighlightAll=true")} AS "titleHighlight",
           CASE WHEN hits.excerpt IS NULL THEN NULL
                ELSE ${headline(Prisma.sql`hits.excerpt`, "HighlightAll=true")} END AS "excerptHighlight",
           ${headline(Prisma.sql`left(hits.content, 200000)`, "MinWords=12, MaxWords=28")} AS snippet
    FROM hits, q
    ORDER BY hits.rank DESC, hits."updatedAt" DESC`;

  if (rows.length === 0) return { results: [], total: 0 };

  const documents = await db.document.findMany({
    where: { id: { in: rows.map((row) => row.id) } },
    include: { collection: true },
  });
  const byId = new Map(documents.map((doc) => [doc.id, doc]));

  const results = rows.flatMap((row) => {
    const doc = byId.get(row.id);
    if (!doc) return [];
    return [
      {
        ...doc,
        titleHighlight: row.titleHighlight,
        excerptHighlight: row.excerptHighlight,
        snippet: cleanSnippet(row.snippet),
      },
    ];
  });

  return { results, total: Number(rows[0].total) };
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
