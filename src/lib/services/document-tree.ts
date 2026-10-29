import { DocumentStatus, Prisma, Role } from "@prisma/client";
import { db } from "../db";
import { documentReadableWhere, type Viewer } from "../collection-access";

/** Levels a tree may have, the top one included: a guide, its chapters, their sections, their steps. */
export const MAX_TREE_DEPTH = 4;
/** Longest list of possible parents offered in the form of one collection. */
export const PARENT_CANDIDATE_LIMIT = 300;

export interface TreeReadOptions {
  viewer: Viewer;
  includeDrafts?: boolean;
}

/** What a reader sees of the tree: documents they may read, and drafts only for those who see drafts. */
function listedWhere(options: TreeReadOptions): Prisma.DocumentWhereInput {
  return {
    ...documentReadableWhere(options.viewer),
    ...(options.includeDrafts ? {} : { status: DocumentStatus.PUBLISHED }),
  };
}

export interface TreeLink {
  id: string;
  slug: string;
  title: string;
}

/**
 * The pages above this one, top first, for the breadcrumb. The chain stops at the first page the
 * viewer cannot see (a restricted chapter does not reveal its title to someone outside it, and
 * what lies above it is not reachable through it).
 */
export async function getAncestors(documentId: string, options: TreeReadOptions): Promise<TreeLink[]> {
  const start = await db.document.findUnique({ where: { id: documentId }, select: { parentId: true } });
  const chain: TreeLink[] = [];
  const seen = new Set([documentId]);
  let nextId = start?.parentId ?? null;
  while (nextId && !seen.has(nextId) && chain.length < MAX_TREE_DEPTH) {
    seen.add(nextId);
    const parent: (TreeLink & { parentId: string | null }) | null = await db.document.findFirst({
      where: { id: nextId, ...listedWhere(options) },
      select: { id: true, slug: true, title: true, parentId: true },
    });
    if (!parent) break;
    chain.unshift({ id: parent.id, slug: parent.slug, title: parent.title });
    nextId = parent.parentId;
  }
  return chain;
}

export interface TreeChild extends TreeLink {
  excerpt: string | null;
  status: DocumentStatus;
  restricted: boolean;
}

/** The pages directly under this one, in their order, that the viewer may see. */
export async function getChildren(documentId: string, options: TreeReadOptions): Promise<TreeChild[]> {
  return db.document.findMany({
    where: { parentId: documentId, ...listedWhere(options) },
    select: { id: true, slug: true, title: true, excerpt: true, status: true, restricted: true },
    orderBy: [{ position: "asc" }, { title: "asc" }, { id: "asc" }],
    take: 200,
  });
}

function assertCanWrite(actor: Viewer) {
  if (actor.role !== Role.ADMIN && actor.role !== Role.EDITOR) throw new Error("Anda tidak punya hak untuk mengatur susunan dokumen");
}

/** Ids of everything below `id`, level by level (stops at the depth a tree may have, and at cycles). */
async function descendantIds(tx: Prisma.TransactionClient, id: string): Promise<{ ids: string[]; height: number }> {
  const seen = new Set([id]);
  let level = [id];
  let height = 0;
  while (level.length > 0 && height < MAX_TREE_DEPTH + 2) {
    const rows = await tx.document.findMany({ where: { parentId: { in: level } }, select: { id: true } });
    level = rows.map((r) => r.id).filter((x) => !seen.has(x));
    if (level.length === 0) break;
    level.forEach((x) => seen.add(x));
    height += 1;
  }
  seen.delete(id);
  return { ids: [...seen], height };
}

/** The ids from `id` up to its top page, `id` first (the whole chain, whoever may see it). */
async function chainUp(tx: Prisma.TransactionClient, id: string): Promise<string[]> {
  const chain: string[] = [];
  let next: string | null = id;
  while (next && !chain.includes(next) && chain.length < MAX_TREE_DEPTH + 6) {
    chain.push(next);
    const row: { parentId: string | null } | null = await tx.document.findUnique({ where: { id: next }, select: { parentId: true } });
    next = row?.parentId ?? null;
  }
  return chain;
}

/**
 * Puts a document under `parentId` (or at the top of its collection when null). The parent must be
 * readable by the actor, in the same collection, not the document itself or one of its own pages,
 * and the whole tree stays within MAX_TREE_DEPTH levels. The document goes last among its new
 * siblings. This is not an edit of the text: its own "last updated" time is left as it was and no
 * version is written. Editors and admins only.
 */
/**
 * Whether `id` (null for a document not yet created, which has no pages of its own) may go under
 * `parentId`, said with the reason when it may not. Used by the form's save before anything is
 * written, and again inside the transaction of setDocumentParent.
 */
async function checkParent(
  tx: Prisma.TransactionClient,
  id: string | null,
  collectionId: string,
  parentId: string,
  actor: Viewer,
): Promise<void> {
  if (parentId === id) throw new Error("Dokumen tidak bisa menjadi bagian dari dirinya sendiri");
  const parent = await tx.document.findFirst({ where: { id: parentId, ...documentReadableWhere(actor) }, select: { collectionId: true } });
  if (!parent) throw new Error("Dokumen induk tidak ditemukan");
  if (parent.collectionId !== collectionId) throw new Error("Dokumen induk harus berada di koleksi yang sama");

  const above = await chainUp(tx, parentId);
  if (id && above.includes(id)) throw new Error("Dokumen tidak bisa dipindah ke bawah halamannya sendiri");
  const height = id ? (await descendantIds(tx, id)).height : 0;
  if (above.length + 1 + height > MAX_TREE_DEPTH) throw new Error(`Susunan terlalu dalam (paling banyak ${MAX_TREE_DEPTH} tingkat)`);
}

/** Says why a save that names a parent would fail, before the document is written (best effort; setDocumentParent decides). */
export async function assertParentAllowed(id: string | null, collectionId: string, parentId: string, actor: Viewer): Promise<void> {
  assertCanWrite(actor);
  await checkParent(db, id, collectionId, parentId, actor);
}

/**
 * Puts a document under `parentId` (or at the top of its collection when null). The parent must be
 * readable by the actor, in the same collection, not the document itself or one of its own pages,
 * and the whole tree stays within MAX_TREE_DEPTH levels. The document goes last among its new
 * siblings. This is not an edit of the text: the columns are written with SQL, which leaves the
 * document's own "last updated" time alone (and cannot step on a save that commits meanwhile), and
 * no version is written. Editors and admins only.
 */
export async function setDocumentParent(id: string, parentId: string | null, actor: Viewer): Promise<void> {
  assertCanWrite(actor);
  if (typeof id !== "string" || !id || (parentId !== null && typeof parentId !== "string")) throw new Error("Permintaan tidak valid");

  await db.$transaction(async (tx) => {
    // One writer of the tree at a time: two moves that are each fine alone can make a cycle together.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('document_tree'))`;
    // Row locks, the parent first (the order deleting a parent takes them in): the parent cannot
    // change collection or be deleted, nor this page change collection, until this commits.
    if (parentId) await tx.$queryRaw`SELECT id FROM documents WHERE id = ${parentId} FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM documents WHERE id = ${id} FOR SHARE`;

    const doc = await tx.document.findFirst({ where: { id, ...documentReadableWhere(actor) }, select: { parentId: true, collectionId: true, locked: true } });
    if (!doc) throw new Error("Dokumen tidak ditemukan");
    if (doc.locked && actor.role !== Role.ADMIN) throw new Error("Dokumen ini dikunci; hanya admin yang boleh mengubahnya");
    if ((doc.parentId ?? null) === parentId) return;

    if (parentId === null) {
      await tx.$executeRaw`UPDATE documents SET "parentId" = NULL, position = 0 WHERE id = ${id}`;
      return;
    }

    await checkParent(tx, id, doc.collectionId, parentId, actor);
    const last = await tx.document.aggregate({ where: { parentId }, _max: { position: true } });
    const position = (last._max.position ?? -1) + 1;
    await tx.$executeRaw`UPDATE documents SET "parentId" = ${parentId}, position = ${position} WHERE id = ${id}`;
  });
}

/**
 * Moves a page one place up or down among the pages under the same parent (the ones the actor may
 * see). Positions of those pages are renumbered 0, 1, 2... first, so pages that shared a number
 * (every page starts at 0) get a definite order. Editors and admins only.
 */
export async function moveDocumentInParent(id: string, direction: "up" | "down", actor: Viewer): Promise<void> {
  assertCanWrite(actor);
  if (typeof id !== "string" || !id || (direction !== "up" && direction !== "down")) throw new Error("Permintaan tidak valid");

  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('document_tree'))`;
    const doc = await tx.document.findFirst({ where: { id, ...documentReadableWhere(actor) }, select: { id: true, parentId: true, locked: true } });
    if (!doc) throw new Error("Dokumen tidak ditemukan");
    if (doc.locked && actor.role !== Role.ADMIN) throw new Error("Dokumen ini dikunci; hanya admin yang boleh mengubahnya");
    if (!doc.parentId) throw new Error("Hanya halaman di bawah induk yang bisa diurutkan");

    const siblings = await tx.document.findMany({
      where: { parentId: doc.parentId, ...documentReadableWhere(actor) },
      select: { id: true, position: true },
      orderBy: [{ position: "asc" }, { title: "asc" }, { id: "asc" }],
    });
    const index = siblings.findIndex((s) => s.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= siblings.length) return;
    [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
    for (const [position, sibling] of siblings.entries()) {
      await tx.$executeRaw`UPDATE documents SET position = ${position} WHERE id = ${sibling.id}`;
    }
  });
}

export interface ParentCandidate {
  id: string;
  title: string;
}

/**
 * Documents of one collection that `documentId` could go under: readable by the viewer, not the
 * document itself or anything below it (that would make a cycle). For the "Induk" field of the form.
 */
export async function getParentCandidates(collectionId: string, documentId: string | null, viewer: Viewer): Promise<ParentCandidate[]> {
  assertCanWrite(viewer);
  const excluded = documentId ? [documentId, ...(await descendantIds(db, documentId)).ids] : [];
  return db.document.findMany({
    where: { collectionId, id: { notIn: excluded }, ...documentReadableWhere(viewer) },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
    take: PARENT_CANDIDATE_LIMIT,
  });
}
