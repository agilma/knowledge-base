import { DocumentStatus, DocumentType, Prisma, type Document } from "@prisma/client";
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
import { collectionReadableSql, collectionReadableWhere, documentReadableWhere, type Viewer } from "../collection-access";

/**
 * `viewer` is required on purpose: a read without one would silently skip the
 * restricted-collection rule (src/lib/collection-access.ts).
 */
export interface ReadOptions {
  includeDrafts?: boolean;
  viewer: Viewer;
}

type Db = Pick<Prisma.TransactionClient, "collection">;

/** Writes go through the same rule: a user cannot add to, move into or edit what they cannot read. */
async function assertCollectionAccess(client: Db, viewer: Viewer, collectionId: string) {
  const count = await client.collection.count({
    where: { id: collectionId, ...collectionReadableWhere(viewer) },
  });
  if (count === 0) throw new Error("Koleksi tidak ditemukan");
}

export async function getDocumentsByCollection(
  collectionId: string,
  options: ReadOptions
) {
  const whereStatus = options.includeDrafts
    ? undefined
    : DocumentStatus.PUBLISHED;

  return db.document.findMany({
    where: {
      collectionId,
      ...documentReadableWhere(options.viewer),
      ...(whereStatus ? { status: whereStatus } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getDocumentBySlug(
  slug: string,
  options: ReadOptions
) {
  // The page, its history, an old version and the edit form all read through
  // here, so one filter covers them. Not readable looks the same as not found.
  const document = await db.document.findFirst({
    where: { slug, ...documentReadableWhere(options.viewer) },
    include: {
      collection: true,
      author: true,
      lastEditedBy: { select: { name: true } },
    },
  });

  if (!document) return null;

  if (!options.includeDrafts && document.status !== DocumentStatus.PUBLISHED) {
    return null;
  }

  return document;
}

/**
 * Unfiltered: for write actions that only need the document's collection and
 * slug to refresh pages after the write has been authorised. Never read through it.
 */
export async function getDocumentForRevalidate(id: string) {
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
  options: ReadOptions
) {
  const ids = await getRelatedDocumentIds(documentId);
  if (ids.length === 0) return [];

  return db.document.findMany({
    where: {
      id: { in: ids },
      ...documentReadableWhere(options.viewer),
      ...(options.includeDrafts ? {} : { status: DocumentStatus.PUBLISHED }),
    },
    include: { collection: true },
    orderBy: { title: "asc" },
  });
}

/** What an editor may pick from when relating a document: everything but itself. */
export async function getRelationCandidates(viewer: Viewer, excludeId?: string) {
  return db.document.findMany({
    where: { ...(excludeId ? { id: { not: excludeId } } : {}), ...documentReadableWhere(viewer) },
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
export async function setRelatedDocuments(documentId: string, relatedIds: string[], actor: Viewer) {
  const desired = parseRelatedIds(relatedIds, documentId);

  await db.$transaction(async (tx) => {
    // One lock for every relation write, not one per document: A saving [B] and
    // B saving [A] at the same moment touch different documents but the same
    // pair, and each would otherwise see no row and insert its own. Relations
    // change rarely, so serialising them costs nothing.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('document_relations'))`;

    // Only documents the editor can read can be related or unrelated by them.
    const own = await tx.document.findFirst({
      where: { id: documentId, ...documentReadableWhere(actor) },
      select: { id: true },
    });
    if (!own) throw new Error("Dokumen tidak ditemukan");

    const existing = await tx.document.findMany({
      where: { id: { in: desired }, ...documentReadableWhere(actor) },
      select: { id: true },
    });
    const valid = new Set(existing.map((doc) => doc.id));

    const rows = await tx.documentRelation.findMany({
      where: { OR: [{ fromId: documentId }, { toId: documentId }] },
      select: { fromId: true, toId: true },
    });
    const allCurrent = [
      ...new Set(rows.map((row) => (row.fromId === documentId ? row.toId : row.fromId))),
    ];
    // A relation to a document the editor cannot see is not in their form, so
    // saving the form must not read its absence as "remove it".
    const visible = await tx.document.findMany({
      where: { id: { in: allCurrent }, ...documentReadableWhere(actor) },
      select: { id: true },
    });
    const current = visible.map((doc) => doc.id);

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
export async function searchDocuments(query: string, options: SearchOptions) {
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
      FROM documents d
      JOIN collections c ON c.id = d."collectionId", q
      WHERE ${vector} @@ q.query
        AND ${collectionReadableSql(options.viewer, "c")}
        ${options.includeDrafts ? Prisma.empty : Prisma.sql`AND d.status = 'PUBLISHED'`}
        ${options.collectionId ? Prisma.sql`AND d."collectionId" = ${options.collectionId}` : Prisma.empty}
        ${options.type ? Prisma.sql`AND d.type = ${options.type}::"DocumentType"` : Prisma.empty}
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
    where: { id: { in: rows.map((row) => row.id) }, ...documentReadableWhere(options.viewer) },
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
  limit: number,
  options: ReadOptions
) {
  const whereStatus = options.includeDrafts
    ? undefined
    : DocumentStatus.PUBLISHED;

  return db.document.findMany({
    where: {
      ...documentReadableWhere(options.viewer),
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

export async function createDocument(data: DocumentInput, actor: Viewer) {
  const authorId = actor.id;
  const validated = documentSchema.parse(data);
  const isAvailable = await isDocumentSlugAvailable(validated.slug);
  if (!isAvailable) {
    throw new Error("Slug dokumen sudah digunakan");
  }

  return db.$transaction(async (tx) => {
    await assertCollectionAccess(tx, actor, validated.collectionId);
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

type Tx = Prisma.TransactionClient;

/**
 * Serialises everything that writes a document's revisions. Version numbers come
 * from "latest + 1", so two saves at the same moment must not read the same latest.
 * The lock ends when the transaction does.
 */
async function lockRevisions(tx: Tx, documentId: string): Promise<number | undefined> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`revision:${documentId}`}))`;
  const latest = await tx.documentRevision.findFirst({
    where: { documentId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  return latest?.version;
}

/**
 * Documents written before revisions existed have none. Keep what was there
 * before the first recorded change as version 1, or that change would erase it
 * from the history.
 */
async function snapshotBaseline(tx: Tx, before: Document): Promise<number> {
  await tx.documentRevision.create({
    data: {
      documentId: before.id,
      version: 1,
      title: before.title,
      excerpt: before.excerpt,
      content: before.content,
      type: before.type,
      status: before.status,
      editedById: before.lastEditedById ?? before.authorId,
      createdAt: before.updatedAt,
    },
  });
  return 1;
}

/** Writes the next version from the saved document and trims the oldest beyond the cap. */
async function appendRevision(
  tx: Tx,
  saved: Document,
  editorId: string | undefined,
  latest: number | undefined
) {
  await tx.documentRevision.create({
    data: {
      documentId: saved.id,
      version: nextVersion(latest),
      title: saved.title,
      excerpt: saved.excerpt,
      content: saved.content,
      type: saved.type,
      status: saved.status,
      editedById: editorId ?? null,
    },
  });

  const all = await tx.documentRevision.findMany({
    where: { documentId: saved.id },
    orderBy: { version: "desc" },
    select: { id: true },
  });
  const stale = idsToPrune(all, REVISION_LIMIT);
  if (stale.length > 0) {
    await tx.documentRevision.deleteMany({ where: { id: { in: stale } } });
  }
}

export async function updateDocument(id: string, data: DocumentInput, actor: Viewer) {
  const editorId = actor.id;
  const validated = documentSchema.parse(data);

  const existingDoc = await db.document.findFirst({
    where: { id, ...documentReadableWhere(actor) },
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
    let latest = await lockRevisions(tx, id);

    // Read the document again, now that the lock is held. The copy read before the
    // transaction can be stale: if another save committed in between, comparing
    // against it would call a revert "no change" and skip its revision.
    const current = await tx.document.findFirst({ where: { id, ...documentReadableWhere(actor) } });
    if (!current) {
      throw new Error("Dokumen tidak ditemukan");
    }
    // Moving a document into a collection needs access to that one too.
    if (validated.collectionId !== current.collectionId) {
      await assertCollectionAccess(tx, actor, validated.collectionId);
    }

    // A change of status is a change of its own: who published or archived a
    // document is something the history has to answer, even if the text is the same.
    const record =
      current.status !== validated.status ||
      hasMeaningfulChange(current, {
        title: validated.title,
        excerpt: validated.excerpt || null,
        content: validated.content,
        type: validated.type,
      });

    if (record && latest === undefined) {
      latest = await snapshotBaseline(tx, current);
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

    if (record) {
      await appendRevision(tx, updated, editorId, latest);
    }

    return updated;
  });
}

/**
 * Publishes, archives or returns a document to draft, and records it in the
 * history. Setting the status a document already has changes nothing and
 * records nothing.
 */
export async function setDocumentStatus(id: string, status: DocumentStatus, actor: Viewer) {
  const editorId = actor.id;
  // Server actions can be called directly with any payload.
  if (typeof id !== "string" || !Object.values(DocumentStatus).includes(status)) {
    throw new Error("Status dokumen tidak valid");
  }
  return db.$transaction(async (tx) => {
    let latest = await lockRevisions(tx, id);

    const current = await tx.document.findFirst({ where: { id, ...documentReadableWhere(actor) } });
    if (!current) {
      throw new Error("Dokumen tidak ditemukan");
    }
    if (current.status === status) return current;

    if (latest === undefined) {
      latest = await snapshotBaseline(tx, current);
    }

    const updated = await tx.document.update({
      where: { id },
      data: { status, ...(editorId ? { lastEditedById: editorId } : {}) },
    });
    await appendRevision(tx, updated, editorId, latest);
    return updated;
  });
}

export async function deleteDocument(id: string, actor: Viewer) {
  const readable = await db.document.count({ where: { id, ...documentReadableWhere(actor) } });
  if (readable === 0) throw new Error("Dokumen tidak ditemukan");
  return db.document.delete({
    where: { id },
  });
}
