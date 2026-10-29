import { DocumentStatus, DocumentType, Prisma, Role } from "@prisma/client";
import { db } from "../db";
import { documentReadableWhere, type Viewer } from "../collection-access";

export const TRASH_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A deleted document as stored in `trashed_documents.snapshot` (migration 12). Dates are ISO
 * strings because it is JSON. `v` lets a later version of this code read what an older one wrote.
 */
interface TrashSnapshot {
  v: 1;
  document: {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    content: string;
    type: DocumentType;
    status: DocumentStatus;
    collectionId: string;
    authorId: string | null;
    lastEditedById: string | null;
    restricted: boolean;
    /** The page it sat under (migration 13); a snapshot written before then has neither. */
    parentId?: string | null;
    position?: number;
    createdAt: string;
    updatedAt: string;
  };
  memberIds: string[];
  /** Groups listed on it (migration 14); a snapshot from before then has none. */
  groupIds?: string[];
  /** Reader notes and replies on it (migration 15); a snapshot from before then has none. */
  comments?: { id: string; parentId: string | null; authorId: string | null; body: string; resolved: boolean; resolvedAt: string | null; resolvedById: string | null; createdAt: string }[];
  relations: { fromId: string; toId: string }[];
  revisions: {
    version: number;
    title: string;
    excerpt: string | null;
    content: string;
    type: DocumentType;
    status: DocumentStatus;
    editedById: string | null;
    createdAt: string;
  }[];
}

function assertAdmin(actor: Viewer) {
  if (actor.role !== Role.ADMIN) throw new Error("Hanya admin yang boleh mengelola tempat sampah");
}

let lastPurge = 0;

/** Removes what has been in the trash longer than the retention. At most hourly per instance; never fails the caller. */
export async function purgeTrash(now = Date.now(), force = false): Promise<void> {
  if (!force && now - lastPurge < 60 * 60 * 1000) return;
  lastPurge = now;
  try {
    await db.trashedDocument.deleteMany({ where: { deletedAt: { lt: new Date(now - TRASH_RETENTION_DAYS * DAY_MS) } } });
  } catch {
    // housekeeping only
  }
}

/**
 * "Hapus": the document leaves `documents` (so nothing that reads documents can show it) and
 * waits in the trash with its versions, members and links. Admin only, and only a document the
 * admin can read (an admin reads all). Returns the document as it was, for the caller's redirect.
 */
export async function trashDocument(id: string, actor: Viewer) {
  // "Not found" first: someone who cannot read the document learns nothing from the answer.
  const readable = await db.document.count({ where: { id, ...documentReadableWhere(actor) } });
  if (readable === 0) throw new Error("Dokumen tidak ditemukan");
  assertAdmin(actor);

  const deleted = await db.$transaction(async (tx) => {
    // The locks every writer of this document's text, members and links holds (in the order
    // setDocumentAccess takes them), so none can slip in between reading and deleting and be
    // wiped by the cascade without being in the snapshot.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`document_members:${id}`}))`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`revision:${id}`}))`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('document_relations'))`;

    const doc = await tx.document.findUnique({
      where: { id },
      include: {
        collection: { select: { name: true } },
        members: { select: { userId: true } },
        groups: { select: { groupId: true } },
        comments: { orderBy: { createdAt: "asc" }, take: 1000 },
        relatedFrom: { select: { fromId: true, toId: true } },
        relatedTo: { select: { fromId: true, toId: true } },
        revisions: { orderBy: { version: "asc" } },
      },
    });
    if (!doc) throw new Error("Dokumen tidak ditemukan");

    const snapshot: TrashSnapshot = {
      v: 1,
      document: {
        id: doc.id,
        slug: doc.slug,
        title: doc.title,
        excerpt: doc.excerpt,
        content: doc.content,
        type: doc.type,
        status: doc.status,
        collectionId: doc.collectionId,
        authorId: doc.authorId,
        lastEditedById: doc.lastEditedById,
        restricted: doc.restricted,
        parentId: doc.parentId,
        position: doc.position,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      },
      memberIds: doc.members.map((m) => m.userId),
      groupIds: doc.groups.map((g) => g.groupId),
      comments: doc.comments.map((c) => ({
        id: c.id,
        parentId: c.parentId,
        authorId: c.authorId,
        body: c.body,
        resolved: c.resolved,
        resolvedAt: c.resolvedAt?.toISOString() ?? null,
        resolvedById: c.resolvedById,
        createdAt: c.createdAt.toISOString(),
      })),
      relations: [...doc.relatedFrom, ...doc.relatedTo],
      revisions: doc.revisions.map((r) => ({
        version: r.version,
        title: r.title,
        excerpt: r.excerpt,
        content: r.content,
        type: r.type,
        status: r.status,
        editedById: r.editedById,
        createdAt: r.createdAt.toISOString(),
      })),
    };
    const admin = await tx.user.findUnique({ where: { id: actor.id }, select: { name: true, email: true } });

    await tx.trashedDocument.create({
      data: {
        documentId: doc.id,
        slug: doc.slug,
        title: doc.title,
        collectionId: doc.collectionId,
        collectionName: doc.collection.name,
        deletedById: actor.id,
        deletedByName: admin?.name ?? admin?.email ?? null,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
      },
    });
    await tx.document.delete({ where: { id } });
    return { slug: doc.slug, collectionId: doc.collectionId };
  });

  void purgeTrash();
  return deleted;
}

export interface TrashItem {
  id: string;
  title: string;
  slug: string;
  collectionName: string;
  deletedByName: string | null;
  deletedAt: Date;
  /** Whole days left before it is removed for good (0 on the last day). */
  daysLeft: number;
}

/** What is in the trash, newest first. Admin only. */
export async function listTrash(actor: Viewer, now = Date.now()): Promise<TrashItem[]> {
  assertAdmin(actor);
  await purgeTrash(now, true);
  const rows = await db.trashedDocument.findMany({
    orderBy: { deletedAt: "desc" },
    take: TRASH_LIST_LIMIT,
    select: { id: true, title: true, slug: true, collectionName: true, deletedByName: true, deletedAt: true },
  });
  return rows.map((row) => ({
    ...row,
    daysLeft: Math.max(0, Math.ceil((row.deletedAt.getTime() + TRASH_RETENTION_DAYS * DAY_MS - now) / DAY_MS)),
  }));
}

export const TRASH_LIST_LIMIT = 200;

export async function countTrash(actor: Viewer): Promise<number> {
  assertAdmin(actor);
  return db.trashedDocument.count();
}

/** The first slug that is free: the original, then "-pulih", "-pulih-2", ... */
async function freeSlug(tx: Prisma.TransactionClient, slug: string): Promise<string> {
  const taken = new Set(
    (await tx.document.findMany({ where: { slug: { startsWith: slug } }, select: { slug: true } })).map((d) => d.slug),
  );
  if (!taken.has(slug)) return slug;
  let candidate = `${slug}-pulih`;
  for (let n = 2; taken.has(candidate); n += 1) candidate = `${slug}-pulih-${n}`;
  return candidate;
}

/**
 * Puts a trashed document back as it was (same id, text, status, versions, members and links),
 * leaving out what no longer exists: a user who was deleted, a document it linked to. The slug
 * gets "-pulih" when someone has taken it since. Fails, leaving it in the trash, when its
 * collection has been deleted. Admin only.
 */
export async function restoreTrashedDocument(trashId: string, actor: Viewer): Promise<{ slug: string }> {
  assertAdmin(actor);
  if (typeof trashId !== "string" || !trashId) throw new Error("Permintaan tidak valid");

  return db.$transaction(async (tx) => {
    // Taking the row out first is what keeps two admins pressing "Pulihkan" from restoring twice.
    const row = await tx.trashedDocument.findUnique({ where: { id: trashId } });
    if (!row) throw new Error("Dokumen tidak ada di tempat sampah");
    const claimed = await tx.trashedDocument.deleteMany({ where: { id: trashId } });
    if (claimed.count === 0) throw new Error("Dokumen tidak ada di tempat sampah");

    const snap = row.snapshot as unknown as TrashSnapshot;
    if (!snap || snap.v !== 1) throw new Error("Isi tempat sampah tidak dikenali");
    const d = snap.document;

    const collection = await tx.collection.findUnique({ where: { id: d.collectionId }, select: { id: true } });
    if (!collection) throw new Error("Koleksi dokumen ini sudah dihapus; buat koleksinya lagi sebelum memulihkan");

    const userIds = new Set(
      (
        await tx.user.findMany({
          where: { id: { in: [...new Set([d.authorId, d.lastEditedById, ...snap.memberIds, ...snap.revisions.map((r) => r.editedById), ...(snap.comments ?? []).flatMap((c) => [c.authorId, c.resolvedById])].filter((x): x is string => !!x))] } },
          select: { id: true },
        })
      ).map((u) => u.id),
    );
    const known = (userId: string | null) => (userId && userIds.has(userId) ? userId : null);

    // Back under its parent only when that page is still there, in the same collection; the pages
    // that were under this one became top-level when it was deleted and stay so.
    if (d.parentId) await tx.$queryRaw`SELECT id FROM documents WHERE id = ${d.parentId} FOR SHARE`;
    const parent = d.parentId
      ? await tx.document.findFirst({ where: { id: d.parentId, collectionId: d.collectionId }, select: { id: true } })
      : null;

    const slug = await freeSlug(tx, d.slug);
    await tx.document.create({
      data: {
        id: d.id,
        slug,
        title: d.title,
        excerpt: d.excerpt,
        content: d.content,
        type: d.type,
        status: d.status,
        collectionId: d.collectionId,
        authorId: known(d.authorId),
        lastEditedById: known(d.lastEditedById),
        restricted: d.restricted,
        parentId: parent?.id ?? null,
        position: parent ? (d.position ?? 0) : 0,
        createdAt: new Date(d.createdAt),
        updatedAt: new Date(d.updatedAt),
      },
    });
    if (snap.revisions.length > 0) {
      await tx.documentRevision.createMany({
        data: snap.revisions.map((r) => ({
          documentId: d.id,
          version: r.version,
          title: r.title,
          excerpt: r.excerpt,
          content: r.content,
          type: r.type,
          status: r.status,
          editedById: known(r.editedById),
          createdAt: new Date(r.createdAt),
        })),
      });
    }
    const members = snap.memberIds.filter((id) => userIds.has(id));
    if (members.length > 0) {
      await tx.documentMember.createMany({ data: members.map((userId) => ({ documentId: d.id, userId })) });
    }
    // Reader notes come back with their authors (unknown ones become nameless), roots before their replies.
    const comments = snap.comments ?? [];
    if (comments.length > 0) {
      const data = (c: (typeof comments)[number]) => ({
        id: c.id,
        documentId: d.id,
        parentId: c.parentId,
        authorId: known(c.authorId),
        body: c.body,
        resolved: c.resolved,
        resolvedAt: c.resolvedAt ? new Date(c.resolvedAt) : null,
        resolvedById: known(c.resolvedById),
        createdAt: new Date(c.createdAt),
      });
      await tx.documentComment.createMany({ data: comments.filter((c) => !c.parentId).map(data) });
      await tx.documentComment.createMany({ data: comments.filter((c) => c.parentId).map(data) });
    }
    const groupIds = snap.groupIds ?? [];
    if (groupIds.length > 0) {
      const groups = await tx.group.findMany({ where: { id: { in: groupIds } }, select: { id: true } });
      if (groups.length > 0) await tx.documentGroup.createMany({ data: groups.map((g) => ({ documentId: d.id, groupId: g.id })) });
    }
    const otherIds = [...new Set(snap.relations.flatMap((r) => [r.fromId, r.toId]).filter((id) => id !== d.id))];
    const existing = new Set((await tx.document.findMany({ where: { id: { in: otherIds } }, select: { id: true } })).map((x) => x.id));
    const exists = (docId: string) => docId === d.id || existing.has(docId);
    const links = snap.relations.filter((r) => exists(r.fromId) && exists(r.toId));
    if (links.length > 0) await tx.documentRelation.createMany({ data: links, skipDuplicates: true });

    return { slug };
  });
}

/** "Hapus permanen": the trashed document is gone for good. Admin only. */
export async function deleteTrashedForever(trashId: string, actor: Viewer): Promise<boolean> {
  assertAdmin(actor);
  if (typeof trashId !== "string" || !trashId) return false;
  const { count } = await db.trashedDocument.deleteMany({ where: { id: trashId } });
  return count > 0;
}
