import { escapeLike } from "../like";
import { DocumentStatus, DocumentType, Prisma, Role, type Document } from "@prisma/client";
import { db } from "../db";
import { trashDocument } from "./trash";
import {
  HIGHLIGHT_MARKERS,
  HIGHLIGHT_START,
  HIGHLIGHT_STOP,
  SEARCH_CONFIG,
  cleanSnippet,
  toTsQuery,
} from "../search-query";
import { documentSchema, DocumentInput } from "../validation/document";
import { diffRelations, parseRelatedIds } from "../related";
import { REVISION_LIMIT, hasMeaningfulChange, nextVersion } from "../revisions";
import { idsToPrune } from "../user-documents";
import {
  MAX_DOCUMENT_MEMBERS,
  collectionReadableWhere,
  documentReadableSql,
  documentReadableWhere,
  type Viewer,
} from "../collection-access";

/**
 * `viewer` is required on purpose: a read without one would silently skip the
 * restricted-collection rule (src/lib/collection-access.ts).
 */
export interface ReadOptions {
  includeDrafts?: boolean;
  viewer: Viewer;
}

type Db = Pick<Prisma.TransactionClient, "collection">;
type Tx = Prisma.TransactionClient;

/** Writes go through the same rule: a user cannot add to, move into or edit what they cannot read. */
async function assertCollectionAccess(client: Db, viewer: Viewer, collectionId: string) {
  const count = await client.collection.count({
    where: { id: collectionId, ...collectionReadableWhere(viewer) },
  });
  if (count === 0) throw new Error("Koleksi tidak ditemukan");
}

/** How many documents a collection page lists at a time. */
export const COLLECTION_PAGE_SIZE = 50;

function collectionDocumentsWhere(collectionId: string, options: ReadOptions): Prisma.DocumentWhereInput {
  return {
    collectionId,
    ...documentReadableWhere(options.viewer),
    ...(options.includeDrafts ? {} : { status: DocumentStatus.PUBLISHED }),
  };
}

/**
 * A page of a collection's list, newest first. Only the columns the list shows: the
 * whole row carries each document's full text, which was 3.6 MB for 500 documents.
 */
export async function getDocumentsByCollection(
  collectionId: string,
  options: ReadOptions & { skip?: number; take?: number }
) {
  return db.document.findMany({
    where: collectionDocumentsWhere(collectionId, options),
    select: { id: true, slug: true, title: true, excerpt: true, status: true, restricted: true, updatedAt: true },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    skip: options.skip,
    take: options.take,
  });
}

export async function countDocumentsByCollection(collectionId: string, options: ReadOptions) {
  return db.document.count({ where: collectionDocumentsWhere(collectionId, options) });
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
export async function getRelatedDocumentIds(documentId: string, viewer: Viewer): Promise<string[]> {
  const rows = await db.documentRelation.findMany({
    where: { OR: [{ fromId: documentId }, { toId: documentId }] },
    select: { fromId: true, toId: true },
  });
  const ids = [...new Set(rows.map((row) => (row.fromId === documentId ? row.toId : row.fromId)))];
  if (ids.length === 0) return ids;
  // These ids end up in the page the editor receives, so the ones they cannot read stay out of it.
  const readable = await db.document.findMany({
    where: { id: { in: ids }, ...documentReadableWhere(viewer) },
    select: { id: true },
  });
  const allowed = new Set(readable.map((doc) => doc.id));
  return ids.filter((id) => allowed.has(id));
}

/**
 * Documents related to this one, in either direction, titled A to Z. A reader
 * sees published ones only; editors also see drafts and archived ones.
 */
export async function getRelatedDocuments(
  documentId: string,
  options: ReadOptions
) {
  const ids = await getRelatedDocumentIds(documentId, options.viewer);
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

export const RELATION_SEARCH_LIMIT = 8;

/**
 * What an editor may pick from when relating a document: titles containing `query`, never
 * the document itself. It searches the whole library; the list this replaces was only the
 * first 500 titles in alphabetical order, so later documents could not be chosen at all.
 */
export async function searchRelationCandidates(query: string, viewer: Viewer, excludeId?: string, limit = RELATION_SEARCH_LIMIT) {
  const needle = query.trim().slice(0, 100);
  if (needle.length < 2) return [];
  return db.document.findMany({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      ...documentReadableWhere(viewer),
      // The text is matched as written: `%` and `_` are not wildcards.
      title: { contains: escapeLike(needle), mode: "insensitive" },
    },
    select: { id: true, title: true, status: true, collection: { select: { name: true } } },
    orderBy: [{ title: "asc" }, { id: "asc" }],
    take: limit,
  });
}

/** The documents already related, with the titles the picker shows for them. */
export async function getRelatedCandidates(documentId: string, viewer: Viewer) {
  const ids = await getRelatedDocumentIds(documentId, viewer);
  if (ids.length === 0) return [];
  return db.document.findMany({
    where: { id: { in: ids }, ...documentReadableWhere(viewer) },
    select: { id: true, title: true, status: true, collection: { select: { name: true } } },
    orderBy: { title: "asc" },
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

  // The stored column (migration 9), which has the same expression the old index uses:
  // recomputing it per row took 11.6 s for a common word on 20,000 documents.
  const vector = Prisma.raw("d.search_vector");
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
        AND ${documentReadableSql(options.viewer, "d", "c")}
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

  // Only what the result list shows: the whole row carries the document's full text.
  const documents = await db.document.findMany({
    where: { id: { in: rows.map((row) => row.id) }, ...documentReadableWhere(options.viewer) },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      type: true,
      status: true,
      restricted: true,
      updatedAt: true,
      collectionId: true,
      collection: { select: { id: true, slug: true, name: true } },
    },
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

/** Fewest letters a query needs before a "did you mean" is worth offering: shorter ones match anything. */
const SUGGEST_MIN_CHARS = 4;
const SUGGEST_LIMIT = 3;
/** pg_trgm's default of 0.6 misses a one-letter typo in a long title; 0.35 catches it without noise. */
const SUGGEST_THRESHOLD = 0.35;

export interface TitleSuggestion {
  slug: string;
  title: string;
}

/**
 * "Mungkin maksud Anda": titles that look like what was typed, for a search that found nothing
 * (a misspelling such as "kasr closing"). Uses pg_trgm word similarity on titles (index from
 * migration 11) and the same access rules as the search, so a title the person may not read
 * is never offered.
 */
export async function suggestDocumentTitles(
  query: string,
  options: Pick<SearchOptions, "viewer" | "includeDrafts">,
): Promise<TitleSuggestion[]> {
  const words = (query.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).slice(0, 8).join(" ");
  if (words.length < SUGGEST_MIN_CHARS) return [];

  return db.$transaction(async (tx) => {
    // SET LOCAL does not take bind parameters; the value is a constant of this file.
    await tx.$executeRawUnsafe(`SET LOCAL pg_trgm.word_similarity_threshold = ${SUGGEST_THRESHOLD}`);
    return tx.$queryRaw<TitleSuggestion[]>`
      SELECT d.slug, d.title
      FROM documents d
      JOIN collections c ON c.id = d."collectionId"
      WHERE ${words} <% d.title
        AND ${documentReadableSql(options.viewer, "d", "c")}
        ${options.includeDrafts ? Prisma.empty : Prisma.sql`AND d.status = 'PUBLISHED'`}
      ORDER BY word_similarity(${words}, d.title) DESC, d."updatedAt" DESC
      LIMIT ${SUGGEST_LIMIT}`;
  });
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
    // Only what the home list shows, not each document's full text.
    select: { id: true, slug: true, title: true, excerpt: true, status: true, restricted: true, updatedAt: true },
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

/** Who may read a restricted document, as chosen by an admin on the form. */
export interface DocumentAccessInput {
  restricted: boolean;
  memberIds: string[];
}

function assertAdmin(actor: Viewer) {
  if (actor.role !== Role.ADMIN) throw new Error("Hanya admin yang boleh membatasi akses dokumen");
}

/** The ids that may be stored as members: strings only, no repeats, within the limit. */
function cleanMemberIds(memberIds: unknown): string[] {
  if (!Array.isArray(memberIds)) throw new Error("Permintaan tidak valid");
  const wanted = [...new Set(memberIds.filter((id): id is string => typeof id === "string" && id.length > 0))];
  if (wanted.length > MAX_DOCUMENT_MEMBERS) {
    throw new Error(`Anggota dokumen maksimal ${MAX_DOCUMENT_MEMBERS} orang`);
  }
  return wanted;
}

/**
 * Makes the document's member list exactly `userIds` (ones that do not exist are
 * dropped). Returns whether anything changed. Callers hold the document's lock.
 */
async function writeDocumentMembers(tx: Tx, documentId: string, userIds: string[]): Promise<boolean> {
  const known = await tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true } });
  const desired = new Set(known.map((u) => u.id));
  const rows = await tx.documentMember.findMany({ where: { documentId }, select: { userId: true } });
  const current = new Set(rows.map((r) => r.userId));

  const add = [...desired].filter((id) => !current.has(id));
  const remove = [...current].filter((id) => !desired.has(id));
  if (remove.length > 0) {
    await tx.documentMember.deleteMany({ where: { documentId, userId: { in: remove } } });
  }
  if (add.length > 0) {
    await tx.documentMember.createMany({ data: add.map((userId) => ({ documentId, userId })), skipDuplicates: true });
  }
  return add.length > 0 || remove.length > 0;
}

export async function createDocument(data: DocumentInput, actor: Viewer, access?: DocumentAccessInput) {
  const authorId = actor.id;
  const validated = documentSchema.parse(data);
  // Only an admin may open a document already restricted; checked before anything is written.
  const memberIds = access?.restricted ? (assertAdmin(actor), cleanMemberIds(access.memberIds)) : [];
  // Before the slug check, so asking for a collection one cannot read is answered the
  // same whatever the slug is.
  await assertCollectionAccess(db, actor, validated.collectionId);
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
        restricted: access?.restricted === true,
      },
    });
    if (access?.restricted) await writeDocumentMembers(tx, doc.id, memberIds);
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
  if (validated.collectionId !== existingDoc.collectionId) {
    await assertCollectionAccess(db, actor, validated.collectionId);
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

    // A document moving between collections changes what each of them holds, and the
    // offline cache key is built from the restricted ones' last change: touch both.
    if (validated.collectionId !== current.collectionId) {
      await tx.collection.updateMany({
        where: { id: { in: [current.collectionId, validated.collectionId] } },
        data: { updatedAt: new Date() },
      });
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

/** "Hapus": moves the document to the trash for 30 days (see trash.ts); nothing is destroyed yet. */
export async function deleteDocument(id: string, actor: Viewer) {
  return trashDocument(id, actor);
}

/**
 * Restricts or opens a document and sets who may read it. Admin only. The change is
 * not an edit of the text, so the document's own `updatedAt` is left as it was (the
 * "last updated" lists would otherwise move it to the top), and no revision is written.
 * Members are kept when the document is opened again, like a collection's.
 */
export async function setDocumentAccess(documentId: string, access: DocumentAccessInput, actor: Viewer) {
  assertAdmin(actor);
  if (typeof documentId !== "string" || !documentId || typeof access?.restricted !== "boolean") {
    throw new Error("Permintaan tidak valid");
  }
  const wanted = cleanMemberIds(access.memberIds);

  await db.$transaction(async (tx) => {
    // Two admins saving at once must not both read the same list and then write over each other.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`document_members:${documentId}`}))`;
    // The document's own time is written back as it was read, so a save of the text must not
    // slip in between: take the lock every writer of the text holds (see lockRevisions).
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`revision:${documentId}`}))`;

    const doc = await tx.document.findUnique({ where: { id: documentId }, select: { restricted: true, updatedAt: true } });
    if (!doc) throw new Error("Dokumen tidak ditemukan");

    if (doc.restricted !== access.restricted) {
      await tx.document.update({
        where: { id: documentId },
        data: { restricted: access.restricted, updatedAt: doc.updatedAt },
      });
    }
    await writeDocumentMembers(tx, documentId, wanted);
  });
}

/** The people listed on a document, for an admin's form. */
export async function getDocumentMemberIds(documentId: string, actor: Viewer): Promise<string[]> {
  assertAdmin(actor);
  const rows = await db.documentMember.findMany({ where: { documentId }, select: { userId: true } });
  return rows.map((r) => r.userId);
}

/** Every restricted document, for the offline cache key (ids only: an edit must not change it). */
export async function getRestrictedDocumentIds(): Promise<string[]> {
  const rows = await db.document.findMany({ where: { restricted: true }, select: { id: true } });
  return rows.map((r) => r.id);
}

/** The restricted documents a user is listed on. */
export async function getMemberDocumentIds(userId: string): Promise<string[]> {
  const rows = await db.documentMember.findMany({ where: { userId }, select: { documentId: true } });
  return rows.map((r) => r.documentId);
}
