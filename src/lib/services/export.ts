import { Role } from "@prisma/client";
import { db } from "../db";
import type { Viewer } from "../collection-access";
import type { ExportedDocument } from "../export";

/** Documents fetched per round trip while the archive is being written. */
export const EXPORT_BATCH = 200;

function assertAdmin(actor: Viewer) {
  if (actor.role !== Role.ADMIN) throw new Error("Hanya admin yang bisa mengekspor");
}

/** The collection an export is limited to, or null for everything; unknown slug throws. */
export async function resolveExportScope(actor: Viewer, collectionSlug?: string | null): Promise<{ id: string; slug: string } | null> {
  assertAdmin(actor);
  if (!collectionSlug) return null;
  const collection = await db.collection.findUnique({ where: { slug: collectionSlug }, select: { id: true, slug: true } });
  if (!collection) throw new Error("Koleksi tidak ditemukan");
  return collection;
}

export async function countExportable(actor: Viewer, collectionId?: string): Promise<number> {
  assertAdmin(actor);
  return db.document.count({ where: collectionId ? { collectionId } : {} });
}

/** The next batch after `afterId` (id order, so the walk is stable while documents are edited). Admin only: it includes drafts, archived and restricted documents. */
export async function exportBatch(actor: Viewer, options: { afterId?: string; take?: number; collectionId?: string }): Promise<ExportedDocument[]> {
  assertAdmin(actor);
  return db.document.findMany({
    where: { ...(options.collectionId ? { collectionId: options.collectionId } : {}), ...(options.afterId ? { id: { gt: options.afterId } } : {}) },
    orderBy: { id: "asc" },
    take: options.take ?? EXPORT_BATCH,
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      type: true,
      status: true,
      restricted: true,
      createdAt: true,
      updatedAt: true,
      collection: { select: { slug: true, name: true } },
      parent: { select: { slug: true } },
      author: { select: { name: true } },
      lastEditedBy: { select: { name: true } },
    },
  });
}
