"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { userMessage } from "@/lib/errors";
import { db } from "@/lib/db";
import { documentReadableWhere } from "@/lib/collection-access";
import { getParentCandidates, moveDocumentInParent } from "@/lib/services/document-tree";

/** The "Induk" field of the form: what the document could go under in this collection. */
export async function listParentCandidatesAction(collectionId: string, documentId?: string) {
  const user = await requireRole([Role.EDITOR, Role.ADMIN]);
  if (typeof collectionId !== "string" || !collectionId || (documentId !== undefined && typeof documentId !== "string")) return [];
  return getParentCandidates(collectionId, documentId ?? null, { id: user.id, role: user.role });
}

/** "Naik" and "Turun" beside a page under a parent. */
export async function moveDocumentAction(formData: FormData): Promise<void> {
  const user = await requireRole([Role.EDITOR, Role.ADMIN]);
  const id = formData.get("id");
  const direction = formData.get("direction");
  if (typeof id !== "string" || (direction !== "up" && direction !== "down")) return;
  const viewer = { id: user.id, role: user.role };
  try {
    await moveDocumentInParent(id, direction, viewer);
  } catch (err) {
    console.warn("moveDocumentAction", userMessage(err, "Gagal mengurutkan"));
    return;
  }
  const doc = await db.document.findFirst({
    where: { id, ...documentReadableWhere(viewer) },
    select: { parent: { select: { slug: true } } },
  });
  if (doc?.parent) revalidatePath(`/docs/${doc.parent.slug}`);
}
