import { DocumentStatus, DocumentType, Prisma } from "@prisma/client";
import { db } from "../db";
import {
  HIGHLIGHT_MARKERS,
  HIGHLIGHT_START,
  HIGHLIGHT_STOP,
  SEARCH_CONFIG,
  SEARCH_VECTOR_SQL,
  cleanSnippet,
  toTsQuery,
} from "../search-query";
import { documentSchema, DocumentInput } from "../validation/document";
import { diffRelations, parseRelatedIds } from "../related";
import { REVISION_LIMIT, hasMeaningfulChange, nextVersion } from "../revisions";
import { idsToPrune } from "../user-documents";

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
      lastEditedBy: { select: { name: true } },
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

/** Ids on the other end of every relation of a document, whichever way it was written. */
export async function getRelatedDocumentIds(documentId: string): Promise<string[]> {
  const rows = await db.documentRelation.findMany({
    where: { OR: [{ fromId: documentId }, { toId: documentId }] },
    select: { fromId: true, toId: true },
  });
  return [...new Set(rows.map((row) => (row.fromId === documentId ? row.toId : row.fromId)))];
}

/**
 * Documents related to this one, in either direction, titled A to Z. A reader
 * sees published ones only; editors also see drafts and archived ones.
 */
export async function getRelatedDocuments(
  documentId: string,
  options?: ReadOptions
) {
  const ids = await getRelatedDocumentIds(documentId);
  if (ids.length === 0) return [];

  return db.document.findMany({
    where: {
      id: { in: ids },
      ...(options?.includeDrafts ? {} : { status: DocumentStatus.PUBLISHED }),
    },
    include: { collection: true },
    orderBy: { title: "asc" },
  });
}

/** What an editor may pick from when relating a document: everything but itself. */
export async function getRelationCandidates(excludeId?: string) {
  return db.document.findMany({
    where: excludeId ? { id: { not: excludeId } } : {},
    select: {
      id: true,
      title: true,
      status: true,
      collection: { select: { name: true } },
    },
    orderBy: { title: "asc" },
    take: 500,
  });
}

/**
 * Makes the documents related to `documentId` exactly `relatedIds`. The pair is
 * one relation whichever way it is stored, so removing deletes both directions
 * and adding does not duplicate a pair that exists in the other direction.
 * Unknown ids are ignored rather than failing the whole save.
 */
export async function setRelatedDocuments(documentId: string, relatedIds: string[]) {
  const desired = parseRelatedIds(relatedIds, documentId);

  await db.$transaction(async (tx) => {
    // One lock for every relation write, not one per document: A saving [B] and
    // B saving [A] at the same moment touch different documents but the same
    // pair, and each would otherwise see no row and insert its own. Relations
    // change rarely, so serialising them costs nothing.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('document_relations'))`;

    const existing = await tx.document.findMany({
      where: { id: { in: desired } },
      select: { id: true },
    });
    const valid = new Set(existing.map((doc) => doc.id));

    const rows = await tx.documentRelation.findMany({
      where: { OR: [{ fromId: documentId }, { toId: documentId }] },
      select: { fromId: true, toId: true },
    });
    const current = [
      ...new Set(rows.map((row) => (row.fromId === documentId ? row.toId : row.fromId))),
    ];

    const { add, remove } = diffRelations(
      current,
      desired.filter((id) => valid.has(id))
    );

    if (remove.length > 0) {
      await tx.documentRelation.deleteMany({
        where: {
          OR: [
            { fromId: documentId, toId: { in: remove } },
            { toId: documentId, fromId: { in: remove } },
          ],
        },
      });
    }
    if (add.length > 0) {
      await tx.documentRelation.createMany({
        data: add.map((toId) => ({ fromId: documentId, toId })),
        skipDuplicates: true,
      });
    }
  });
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
  // translate() drops the marker characters from the text first, so content
  // that happens to contain them cannot masquerade as a match.
  const headline = (column: Prisma.Sql, extra: string) =>
    Prisma.sql`ts_headline(${SEARCH_CONFIG}::regconfig, translate(${column}, ${HIGHLIGHT_MARKERS}, ''), q.query,
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

  return db.$transaction(async (tx) => {
    const doc = await tx.document.create({
      data: {
        title: validated.title,
        slug: validated.slug,
        collectionId: validated.collectionId,
        type: validated.type,
        excerpt: validated.excerpt || null,
        content: validated.content,
        status: validated.status,
        authorId: authorId || null,
        lastEditedById: authorId || null,
      },
    });
    await tx.documentRevision.create({
      data: {
        documentId: doc.id,
        version: 1,
        title: doc.title,
        excerpt: doc.excerpt,
        content: doc.content,
        type: doc.type,
        status: doc.status,
        editedById: authorId || null,
      },
    });
    return doc;
  });
}

export async function updateDocument(id: string, data: DocumentInput, editorId?: string) {
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

  return db.$transaction(async (tx) => {
    // Version numbers come from "latest + 1", so two saves of one document at the
    // same moment must not both read the same latest. The lock ends on commit.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`revision:${id}`}))`;

    // Read the document again, now that the lock is held. The copy read before the
    // transaction can be stale: if another save committed in between, comparing
    // against it would call a revert "no change" and skip its revision.
    const current = await tx.document.findUnique({ where: { id } });
    if (!current) {
      throw new Error("Dokumen tidak ditemukan");
    }

    const meaningful = hasMeaningfulChange(current, {
      title: validated.title,
      excerpt: validated.excerpt || null,
      content: validated.content,
      type: validated.type,
    });

    let latest = (
      await tx.documentRevision.findFirst({
        where: { documentId: id },
        orderBy: { version: "desc" },
        select: { version: true },
      })
    )?.version;

    // Documents written before revisions existed have none. Keep what was there
    // before this save as version 1, or the first edit would erase it from history.
    if (meaningful && latest === undefined) {
      await tx.documentRevision.create({
        data: {
          documentId: id,
          version: nextVersion(latest),
          title: current.title,
          excerpt: current.excerpt,
          content: current.content,
          type: current.type,
          status: current.status,
          editedById: current.lastEditedById ?? current.authorId,
          createdAt: current.updatedAt,
        },
      });
      latest = 1;
    }

    const updated = await tx.document.update({
      where: { id },
      data: {
        title: validated.title,
        slug: validated.slug,
        collectionId: validated.collectionId,
        type: validated.type,
        excerpt: validated.excerpt || null,
        content: validated.content,
        status: validated.status,
        lastEditedById: editorId ?? current.lastEditedById,
      },
    });

    if (meaningful) {
      await tx.documentRevision.create({
        data: {
          documentId: id,
          version: nextVersion(latest),
          title: updated.title,
          excerpt: updated.excerpt,
          content: updated.content,
          type: updated.type,
          status: updated.status,
          editedById: editorId ?? null,
        },
      });

      const all = await tx.documentRevision.findMany({
        where: { documentId: id },
        orderBy: { version: "desc" },
        select: { id: true },
      });
      const stale = idsToPrune(all, REVISION_LIMIT);
      if (stale.length > 0) {
        await tx.documentRevision.deleteMany({ where: { id: { in: stale } } });
      }
    }

    return updated;
  });
}

export async function setDocumentStatus(id: string, status: DocumentStatus, editorId?: string) {
  return db.document.update({
    where: { id },
    data: { status, ...(editorId ? { lastEditedById: editorId } : {}) },
  });
}

export async function deleteDocument(id: string) {
  return db.document.delete({
    where: { id },
  });
}
