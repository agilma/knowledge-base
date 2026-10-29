import { CollectionStatus, DocumentStatus, Role } from "@prisma/client";
import { db } from "../db";
import { collectionSchema, CollectionInput } from "../validation/collection";
import { cache } from "react";
import { collectionReadableWhere, documentReadableWhere, MAX_COLLECTION_MEMBERS, type Viewer } from "../collection-access";

// Rendered by the sidebar on every page, so dedupe it within a request. The key
// is the user and role as plain values: `cache` compares arguments by identity,
// and a fresh `viewer` object each time would never hit.
const listCollections = cache(async (userId: string, role: Role) => {
  return db.collection.findMany({
    where: collectionReadableWhere({ id: userId, role }),
    orderBy: { name: "asc" },
  });
});

/** The collections the viewer may read; a restricted one they are not in does not appear. */
export function getCollections(viewer: Viewer) {
  return listCollections(viewer.id, viewer.role);
}

/** Id and last change of every restricted collection: what the offline cache key is made from. */
export async function getRestrictedCollections() {
  return db.collection.findMany({
    where: { restricted: true },
    select: { id: true, updatedAt: true },
  });
}

/** Ids of the restricted collections this user was added to, by name or through a group. */
export async function getMemberCollectionIds(userId: string): Promise<string[]> {
  const [direct, viaGroup] = await Promise.all([
    db.collectionMember.findMany({ where: { userId }, select: { collectionId: true } }),
    db.collectionGroup.findMany({ where: { group: { members: { some: { userId } } } }, select: { collectionId: true } }),
  ]);
  return [...new Set([...direct, ...viaGroup].map((row) => row.collectionId))];
}

export async function getCollectionBySlug(slug: string, viewer: Viewer) {
  return db.collection.findFirst({
    where: { slug, ...collectionReadableWhere(viewer) },
  });
}

export async function getCollectionById(id: string, viewer: Viewer) {
  return db.collection.findFirst({
    where: { id, ...collectionReadableWhere(viewer) },
  });
}

export async function getCollectionsWithDocumentCount(options: { includeDrafts?: boolean; viewer: Viewer }) {
  const collections = await db.collection.findMany({
    where: collectionReadableWhere(options.viewer),
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          // The count follows the same rule as the list it stands for: a restricted
          // document in an open collection must not show up in the number either.
          documents: {
            where: {
              ...(options.includeDrafts ? {} : { status: DocumentStatus.PUBLISHED }),
              ...documentReadableWhere(options.viewer),
            },
          },
        },
      },
    },
  });

  return collections.map((col) => ({
    ...col,
    documentCount: col._count.documents,
  }));
}

export async function isCollectionSlugAvailable(slug: string, excludeId?: string) {
  const existing = await db.collection.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!existing) return true;
  if (excludeId && existing.id === excludeId) return true;
  return false;
}

export async function createCollection(data: CollectionInput) {
  const validated = collectionSchema.parse(data);
  const isAvailable = await isCollectionSlugAvailable(validated.slug);
  if (!isAvailable) {
    throw new Error("Slug koleksi sudah digunakan");
  }

  return db.collection.create({
    data: {
      name: validated.name,
      slug: validated.slug,
      description: validated.description || null,
      icon: validated.icon || null,
      status: validated.status,
      restricted: validated.restricted,
      requiresApproval: validated.requiresApproval,
    },
  });
}

export async function updateCollection(id: string, data: CollectionInput) {
  const validated = collectionSchema.parse(data);
  const isAvailable = await isCollectionSlugAvailable(validated.slug, id);
  if (!isAvailable) {
    throw new Error("Slug koleksi sudah digunakan");
  }

  return db.collection.update({
    where: { id },
    data: {
      name: validated.name,
      slug: validated.slug,
      description: validated.description || null,
      icon: validated.icon || null,
      status: validated.status,
      restricted: validated.restricted,
      requiresApproval: validated.requiresApproval,
    },
  });
}

export async function setCollectionStatus(id: string, status: CollectionStatus) {
  return db.collection.update({
    where: { id },
    data: { status },
  });
}

export async function deleteCollection(id: string) {
  const docCount = await db.document.count({
    where: { collectionId: id },
  });

  if (docCount > 0) {
    throw new Error("Koleksi tidak dapat dihapus karena masih memiliki dokumen");
  }

  return db.collection.delete({
    where: { id },
  });
}

function assertAdmin(actor: Viewer) {
  if (actor.role !== Role.ADMIN) throw new Error("Hanya admin yang boleh mengatur anggota koleksi");
}

/** Everyone who has signed in, for an admin to pick members from. */
export async function listAssignableUsers(actor: Viewer) {
  assertAdmin(actor);
  return db.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    take: 500,
  });
}

export async function getCollectionMemberIds(collectionId: string, actor: Viewer): Promise<string[]> {
  assertAdmin(actor);
  const rows = await db.collectionMember.findMany({
    where: { collectionId },
    select: { userId: true },
  });
  return rows.map((row) => row.userId);
}

/**
 * Makes the members of a collection exactly `userIds` (people who have signed in;
 * unknown ids are ignored). Admins only. The change also marks the collection as
 * changed (`updatedAt`): that is what empties the offline cache of the people
 * whose access moved (see `accessKey`). The members are kept when a collection
 * stops being restricted, so switching it back on does not mean choosing them again.
 */
export async function setCollectionMembers(collectionId: string, userIds: string[], actor: Viewer) {
  assertAdmin(actor);
  if (typeof collectionId !== "string" || !Array.isArray(userIds)) {
    throw new Error("Permintaan tidak valid");
  }
  const wanted = [...new Set(userIds.filter((id): id is string => typeof id === "string" && id.length > 0))];
  if (wanted.length > MAX_COLLECTION_MEMBERS) {
    throw new Error(`Anggota koleksi maksimal ${MAX_COLLECTION_MEMBERS} orang`);
  }

  await db.$transaction(async (tx) => {
    // Two admins saving at once must not both read the same list and then write over each other.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`collection_members:${collectionId}`}))`;

    const collection = await tx.collection.findUnique({ where: { id: collectionId }, select: { id: true } });
    if (!collection) throw new Error("Koleksi tidak ditemukan");

    const known = await tx.user.findMany({ where: { id: { in: wanted } }, select: { id: true } });
    const desired = new Set(known.map((u) => u.id));
    const rows = await tx.collectionMember.findMany({ where: { collectionId }, select: { userId: true } });
    const current = new Set(rows.map((r) => r.userId));

    const add = [...desired].filter((id) => !current.has(id));
    const remove = [...current].filter((id) => !desired.has(id));
    if (add.length === 0 && remove.length === 0) return;

    if (remove.length > 0) {
      await tx.collectionMember.deleteMany({ where: { collectionId, userId: { in: remove } } });
    }
    if (add.length > 0) {
      await tx.collectionMember.createMany({
        data: add.map((userId) => ({ collectionId, userId })),
        skipDuplicates: true,
      });
    }
    await tx.collection.update({ where: { id: collectionId }, data: { updatedAt: new Date() } });
  });
}
