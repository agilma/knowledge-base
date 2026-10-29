import { Prisma, Role } from "@prisma/client";
import { db } from "../db";
import type { Viewer } from "../collection-access";

/** Groups one workspace can have; a limit keeps the checkbox lists of the forms short. */
export const MAX_GROUPS = 100;
/** The most people in one group; the picker and the server both hold to it. */
export const MAX_GROUP_MEMBERS = 200;
/** The most groups listed on one collection or document. */
export const MAX_GROUPS_PER_ITEM = 20;
export const GROUP_NAME_MIN = 2;
export const GROUP_NAME_MAX = 60;

function assertAdmin(actor: Viewer) {
  if (actor.role !== Role.ADMIN) throw new Error("Hanya admin yang boleh mengatur grup");
}

/** The name as it is kept: trimmed, inner spaces collapsed. Throws what is wrong with it. */
export function cleanGroupName(raw: unknown): string {
  if (typeof raw !== "string") throw new Error("Nama grup wajib diisi");
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length < GROUP_NAME_MIN) throw new Error(`Nama grup minimal ${GROUP_NAME_MIN} karakter`);
  if (name.length > GROUP_NAME_MAX) throw new Error(`Nama grup maksimal ${GROUP_NAME_MAX} karakter`);
  return name;
}

function cleanIds(ids: unknown, max: number, message: string): string[] {
  if (!Array.isArray(ids)) throw new Error("Permintaan tidak valid");
  const wanted = [...new Set(ids.filter((id): id is string => typeof id === "string" && id.length > 0))];
  if (wanted.length > max) throw new Error(message);
  return wanted;
}

export interface GroupItem {
  id: string;
  name: string;
  memberCount: number;
  /** Restricted collections and documents that list this group. */
  collectionCount: number;
  documentCount: number;
}

/** Every group with how many people and places it has, for the admin page and for the forms' lists. Admin only. */
export async function listGroups(actor: Viewer): Promise<GroupItem[]> {
  assertAdmin(actor);
  const rows = await db.group.findMany({
    orderBy: { name: "asc" },
    take: MAX_GROUPS,
    select: { id: true, name: true, _count: { select: { members: true, collections: true, documents: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    memberCount: r._count.members,
    collectionCount: r._count.collections,
    documentCount: r._count.documents,
  }));
}

export async function getGroupMemberIds(groupId: string, actor: Viewer): Promise<string[]> {
  assertAdmin(actor);
  const rows = await db.groupMember.findMany({ where: { groupId }, select: { userId: true } });
  return rows.map((r) => r.userId);
}

/** Creates a group; the name must be new (ignoring capitals). Admin only. */
export async function createGroup(rawName: unknown, actor: Viewer): Promise<{ id: string }> {
  assertAdmin(actor);
  const name = cleanGroupName(rawName);
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('groups'))`;
    if ((await tx.group.count()) >= MAX_GROUPS) throw new Error(`Grup maksimal ${MAX_GROUPS}`);
    const clash = await tx.group.count({ where: { name: { equals: name, mode: "insensitive" } } });
    if (clash > 0) throw new Error("Nama grup sudah dipakai");
    return tx.group.create({ data: { name }, select: { id: true } });
  });
}

export async function renameGroup(groupId: string, rawName: unknown, actor: Viewer): Promise<void> {
  assertAdmin(actor);
  const name = cleanGroupName(rawName);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('groups'))`;
    const clash = await tx.group.count({ where: { id: { not: groupId }, name: { equals: name, mode: "insensitive" } } });
    if (clash > 0) throw new Error("Nama grup sudah dipakai");
    const { count } = await tx.group.updateMany({ where: { id: groupId }, data: { name } });
    if (count === 0) throw new Error("Grup tidak ditemukan");
  });
}

/**
 * Deletes a group. Everyone who could read something only through it loses that access at once,
 * so the collections that listed it are marked as changed (what empties the offline caches).
 */
export async function deleteGroup(groupId: string, actor: Viewer): Promise<void> {
  assertAdmin(actor);
  await db.$transaction(async (tx) => {
    await touchCollectionsOf(tx, groupId);
    const { count } = await tx.group.deleteMany({ where: { id: groupId } });
    if (count === 0) throw new Error("Grup tidak ditemukan");
  });
}

/** Marks the collections that list the group as changed: the offline cache key reads their `updatedAt`. */
async function touchCollectionsOf(tx: Prisma.TransactionClient, groupId: string) {
  await tx.collection.updateMany({ where: { groups: { some: { groupId } } }, data: { updatedAt: new Date() } });
}

/**
 * Makes the members of a group exactly `userIds` (people who have signed in; unknown ids are
 * ignored). Admin only. Everyone gains or loses what the group opens at once.
 */
export async function setGroupMembers(groupId: string, userIds: unknown, actor: Viewer): Promise<void> {
  assertAdmin(actor);
  if (typeof groupId !== "string" || !groupId) throw new Error("Permintaan tidak valid");
  const wanted = cleanIds(userIds, MAX_GROUP_MEMBERS, `Anggota grup maksimal ${MAX_GROUP_MEMBERS} orang`);

  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`group_members:${groupId}`}))`;
    const group = await tx.group.findUnique({ where: { id: groupId }, select: { id: true } });
    if (!group) throw new Error("Grup tidak ditemukan");

    const known = await tx.user.findMany({ where: { id: { in: wanted } }, select: { id: true } });
    const desired = new Set(known.map((u) => u.id));
    const current = new Set((await tx.groupMember.findMany({ where: { groupId }, select: { userId: true } })).map((r) => r.userId));
    const add = [...desired].filter((id) => !current.has(id));
    const remove = [...current].filter((id) => !desired.has(id));
    if (add.length === 0 && remove.length === 0) return;

    if (remove.length > 0) await tx.groupMember.deleteMany({ where: { groupId, userId: { in: remove } } });
    if (add.length > 0) await tx.groupMember.createMany({ data: add.map((userId) => ({ groupId, userId })), skipDuplicates: true });
    await touchCollectionsOf(tx, groupId);
  });
}

/** A group deleted while a form listing it was being saved: say so, rather than a database error. */
function groupGone(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
    throw new Error("Grup yang dipilih sudah dihapus; muat ulang halaman lalu coba lagi");
  }
  throw err;
}

/** Ids of the groups listed on a collection. Admin only. */
export async function getCollectionGroupIds(collectionId: string, actor: Viewer): Promise<string[]> {
  assertAdmin(actor);
  return (await db.collectionGroup.findMany({ where: { collectionId }, select: { groupId: true } })).map((r) => r.groupId);
}

/** Ids of the groups listed on a document. Admin only. */
export async function getDocumentGroupIds(documentId: string, actor: Viewer): Promise<string[]> {
  assertAdmin(actor);
  return (await db.documentGroup.findMany({ where: { documentId }, select: { groupId: true } })).map((r) => r.groupId);
}

/**
 * Writes which groups are listed on a collection or document, inside the caller's transaction (so
 * it commits with the rest of the access change). Unknown ids are ignored. Returns whether
 * anything changed.
 */
export async function writeItemGroups(
  tx: Prisma.TransactionClient,
  target: { collectionId: string } | { documentId: string },
  groupIds: unknown,
): Promise<boolean> {
  const wanted = cleanIds(groupIds, MAX_GROUPS_PER_ITEM, `Grup maksimal ${MAX_GROUPS_PER_ITEM} per koleksi atau dokumen`);
  const known = new Set((await tx.group.findMany({ where: { id: { in: wanted } }, select: { id: true } })).map((g) => g.id));

  if ("collectionId" in target) {
    const { collectionId } = target;
    const current = new Set((await tx.collectionGroup.findMany({ where: { collectionId }, select: { groupId: true } })).map((r) => r.groupId));
    const add = [...known].filter((id) => !current.has(id));
    const remove = [...current].filter((id) => !known.has(id));
    if (remove.length > 0) await tx.collectionGroup.deleteMany({ where: { collectionId, groupId: { in: remove } } });
    if (add.length > 0) await tx.collectionGroup.createMany({ data: add.map((groupId) => ({ collectionId, groupId })), skipDuplicates: true });
    return add.length > 0 || remove.length > 0;
  }
  const { documentId } = target;
  const current = new Set((await tx.documentGroup.findMany({ where: { documentId }, select: { groupId: true } })).map((r) => r.groupId));
  const add = [...known].filter((id) => !current.has(id));
  const remove = [...current].filter((id) => !known.has(id));
  if (remove.length > 0) await tx.documentGroup.deleteMany({ where: { documentId, groupId: { in: remove } } });
  if (add.length > 0) await tx.documentGroup.createMany({ data: add.map((groupId) => ({ documentId, groupId })), skipDuplicates: true });
  return add.length > 0 || remove.length > 0;
}

/**
 * Sets the groups listed on a collection (like setCollectionMembers: admin only, kept when the
 * collection stops being restricted). Marks the collection as changed so offline caches empty.
 */
export async function setCollectionGroups(collectionId: string, groupIds: unknown, actor: Viewer): Promise<void> {
  assertAdmin(actor);
  if (typeof collectionId !== "string" || !collectionId) throw new Error("Permintaan tidak valid");
  await db.$transaction(async (tx) => {
    // The same lock as the member list: two admins saving one collection's access must not interleave.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`collection_members:${collectionId}`}))`;
    const collection = await tx.collection.findUnique({ where: { id: collectionId }, select: { id: true } });
    if (!collection) throw new Error("Koleksi tidak ditemukan");
    if (await writeItemGroups(tx, { collectionId }, groupIds)) {
      await tx.collection.update({ where: { id: collectionId }, data: { updatedAt: new Date() } });
    }
  }).catch(groupGone);
}

/**
 * Sets the groups listed on a document. Admin only. Written to its own table, so the document's
 * text, version and "last updated" time are not touched.
 */
export async function setDocumentGroups(documentId: string, groupIds: unknown, actor: Viewer): Promise<void> {
  assertAdmin(actor);
  if (typeof documentId !== "string" || !documentId) throw new Error("Permintaan tidak valid");
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`document_members:${documentId}`}))`;
    const document = await tx.document.findUnique({ where: { id: documentId }, select: { id: true } });
    if (!document) throw new Error("Dokumen tidak ditemukan");
    await writeItemGroups(tx, { documentId }, groupIds);
  }).catch(groupGone);
}
