import { DocumentStatus, Prisma, Role } from "@prisma/client";
import { db } from "../db";
import { cleanCommentBody } from "../comment-text";
import { documentReadableWhere, type Viewer } from "../collection-access";

/** Notes one person may send in an hour, over all documents: enough to be heard, too few to flood an inbox. */
export const FEEDBACK_PER_HOUR = 10;
/** Replies one thread may hold. */
export const REPLIES_PER_THREAD = 100;
/** Threads a document page or the inbox lists at a time. */
export const THREAD_LIMIT = 50;

const isStaff = (viewer: Viewer) => viewer.role === Role.EDITOR || viewer.role === Role.ADMIN;

/** A document the viewer may read, as a reader sees it: drafts and archives only for staff. */
function readableDocument(id: string, viewer: Viewer) {
  return db.document.findFirst({
    where: { id, ...documentReadableWhere(viewer), ...(isStaff(viewer) ? {} : { status: DocumentStatus.PUBLISHED }) },
    select: { id: true, slug: true, title: true },
  });
}

export interface CommentItem {
  id: string;
  body: string;
  createdAt: Date;
  authorName: string | null;
  /** Written by an editor or admin (shown as "Penyunting"), not by the reader. */
  staff: boolean;
  mine: boolean;
}

export interface ThreadItem extends CommentItem {
  resolved: boolean;
  resolvedAt: Date | null;
  replies: CommentItem[];
}

/**
 * A reader sends a note on a document they may read ("Ada yang kurang jelas?"). A limit per hour
 * keeps one person from flooding the inbox.
 */
export async function addFeedback(documentId: string, rawBody: unknown, viewer: Viewer): Promise<{ id: string }> {
  const body = cleanCommentBody(rawBody);
  if (typeof documentId !== "string" || !documentId) throw new Error("Permintaan tidak valid");
  const doc = await readableDocument(documentId, viewer);
  if (!doc) throw new Error("Dokumen tidak ditemukan");

  return db.$transaction(async (tx) => {
    // Two notes from one person at the same moment must both be counted before the limit is judged.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`feedback:${viewer.id}`}))`;
    const sent = await tx.documentComment.count({
      where: { authorId: viewer.id, parentId: null, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (sent >= FEEDBACK_PER_HOUR) throw new Error("Terlalu banyak masukan dalam satu jam; coba lagi nanti");
    return tx.documentComment.create({ data: { documentId, authorId: viewer.id, body }, select: { id: true } });
  });
}

/** A root note the viewer may see: staff who may read its document, or its author. Null otherwise (not found, never forbidden). */
async function visibleRoot(rootId: string, viewer: Viewer) {
  if (typeof rootId !== "string" || !rootId) return null;
  const root = await db.documentComment.findFirst({
    where: { id: rootId, parentId: null, document: { ...documentReadableWhere(viewer) } },
    select: { id: true, authorId: true, resolved: true, documentId: true, document: { select: { slug: true } } },
  });
  if (!root) return null;
  if (!isStaff(viewer) && root.authorId !== viewer.id) return null;
  return root;
}

/**
 * A reply in a thread, from staff or from the person who started it (who reopens a resolved thread by
 * answering). Returns the slug of the document, for the caller to refresh its page.
 */
export async function addReply(rootId: string, rawBody: unknown, viewer: Viewer): Promise<{ slug: string }> {
  const body = cleanCommentBody(rawBody);
  const root = await visibleRoot(rootId, viewer);
  if (!root) throw new Error("Masukan tidak ditemukan");

  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`thread:${rootId}`}))`;
    if ((await tx.documentComment.count({ where: { parentId: rootId } })) >= REPLIES_PER_THREAD) {
      throw new Error("Utas ini sudah penuh");
    }
    await tx.documentComment.create({ data: { documentId: root.documentId, parentId: rootId, authorId: viewer.id, body } });
    if (root.resolved && !isStaff(viewer)) {
      await tx.documentComment.update({ where: { id: rootId }, data: { resolved: false, resolvedAt: null, resolvedById: null } });
    }
  });
  return { slug: root.document.slug };
}

/** Marks a thread dealt with, or open again. Editors and admins only. */
export async function setResolved(rootId: string, resolved: boolean, viewer: Viewer): Promise<{ slug: string }> {
  if (!isStaff(viewer)) throw new Error("Hanya penyunting yang boleh menandai masukan");
  const root = await visibleRoot(rootId, viewer);
  if (!root) throw new Error("Masukan tidak ditemukan");
  await db.documentComment.update({
    where: { id: rootId },
    data: resolved ? { resolved: true, resolvedAt: new Date(), resolvedById: viewer.id } : { resolved: false, resolvedAt: null, resolvedById: null },
  });
  return { slug: root.document.slug };
}

/** Deletes a note or a reply (a note takes its replies): its author, or staff. */
export async function deleteComment(id: string, viewer: Viewer): Promise<{ slug: string }> {
  if (typeof id !== "string" || !id) throw new Error("Permintaan tidak valid");
  const comment = await db.documentComment.findFirst({
    where: { id, document: { ...documentReadableWhere(viewer) } },
    select: { id: true, authorId: true, parentId: true, document: { select: { slug: true } } },
  });
  // Someone else's note is "not found" to a reader, as it is everywhere else.
  if (!comment || (!isStaff(viewer) && comment.authorId !== viewer.id)) throw new Error("Masukan tidak ditemukan");
  await db.documentComment.delete({ where: { id } });
  return { slug: comment.document.slug };
}

type ThreadRow = Prisma.DocumentCommentGetPayload<{
  include: { author: { select: { name: true; email: true; role: true } }; replies: { include: { author: { select: { name: true; email: true; role: true } } } } };
}>;

function toItem(row: { id: string; body: string; createdAt: Date; authorId: string | null; author: { name: string | null; email: string; role: Role } | null }, viewer: Viewer, withNames: boolean): CommentItem {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.createdAt,
    // Staff see who wrote a note; the writer sees their own side of it as "Anda"
    authorName: withNames ? (row.author?.name ?? row.author?.email ?? null) : null,
    staff: row.author ? row.author.role === Role.EDITOR || row.author.role === Role.ADMIN : false,
    mine: row.authorId === viewer.id,
  };
}

function toThread(row: ThreadRow, viewer: Viewer): ThreadItem {
  const names = isStaff(viewer);
  return {
    ...toItem(row, viewer, names),
    resolved: row.resolved,
    resolvedAt: row.resolvedAt,
    replies: row.replies.map((reply) => toItem(reply, viewer, names)),
  };
}

const THREAD_INCLUDE = {
  author: { select: { name: true, email: true, role: true } },
  replies: { orderBy: { createdAt: "asc" as const }, take: REPLIES_PER_THREAD, include: { author: { select: { name: true, email: true, role: true } } } },
};

/**
 * The notes on one document: all of them for editors and admins (open first), only the viewer's own
 * for everyone else. Empty when the document is not readable.
 */
export async function listThreads(documentId: string, viewer: Viewer): Promise<ThreadItem[]> {
  if (!(await readableDocument(documentId, viewer))) return [];
  const rows = await db.documentComment.findMany({
    where: { documentId, parentId: null, ...(isStaff(viewer) ? {} : { authorId: viewer.id }) },
    orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
    take: THREAD_LIMIT,
    include: THREAD_INCLUDE,
  });
  return rows.map((row) => toThread(row, viewer));
}

export interface InboxItem extends ThreadItem {
  document: { slug: string; title: string };
}

/** The notes across documents the editor may read, open ones (or resolved ones) newest first. Editors and admins only. */
export async function listInbox(viewer: Viewer, state: "open" | "resolved" = "open"): Promise<InboxItem[]> {
  if (!isStaff(viewer)) throw new Error("Hanya penyunting yang boleh membuka kotak masuk");
  const rows = await db.documentComment.findMany({
    where: { parentId: null, resolved: state === "resolved", document: { ...documentReadableWhere(viewer) } },
    orderBy: { createdAt: "desc" },
    take: THREAD_LIMIT,
    include: { ...THREAD_INCLUDE, document: { select: { slug: true, title: true } } },
  });
  return rows.map((row) => ({ ...toThread(row, viewer), document: row.document }));
}

/** How many notes wait for an editor, over documents they may read. */
export async function countOpen(viewer: Viewer): Promise<number> {
  if (!isStaff(viewer)) return 0;
  return db.documentComment.count({ where: { parentId: null, resolved: false, document: { ...documentReadableWhere(viewer) } } });
}
