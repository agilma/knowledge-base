"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireRole } from "@/lib/auth/session";
import { userMessage } from "@/lib/errors";
import { getDocumentBySlug } from "@/lib/services/documents";
import { restoreRevision } from "@/lib/services/revisions";

/** "Pulihkan versi ini": the text of an older version becomes the document's text, as a new version. */
export async function restoreRevisionAction(slug: string, version: number): Promise<{ error: string } | undefined> {
  const user = await requireRole([Role.EDITOR, Role.ADMIN]);
  if (typeof slug !== "string" || !Number.isInteger(version) || version < 1) return { error: "Permintaan tidak valid" };
  const viewer = { id: user.id, role: user.role };

  try {
    const doc = await getDocumentBySlug(slug, { includeDrafts: true, viewer });
    if (!doc) return { error: "Dokumen tidak ditemukan" };
    const result = await restoreRevision(doc.id, version, viewer);
    if (!result.changed) return { error: "Isi versi ini sudah sama dengan dokumen sekarang." };
    revalidatePath(`/docs/${result.slug}`);
    revalidatePath("/collections");
    revalidatePath(`/collections/${doc.collection.slug}`);
    revalidatePath("/search");
    revalidatePath("/");
  } catch (err) {
    if (err instanceof ZodError) return { error: "Versi ini tidak bisa dipulihkan karena isinya tidak memenuhi aturan dokumen yang berlaku sekarang." };
    return { error: userMessage(err, "Gagal memulihkan versi") };
  }
  redirect(`/docs/${slug}/history`);
}
