"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { userMessage } from "@/lib/errors";
import { deleteTrashedForever, restoreTrashedDocument } from "@/lib/services/trash";

/** "Pulihkan": the document is back where it was, as it was. */
export async function restoreTrashedAction(formData: FormData): Promise<void> {
  const user = await requireRole(Role.ADMIN);
  const id = formData.get("id");
  if (typeof id !== "string") return;
  let slug: string;
  try {
    ({ slug } = await restoreTrashedDocument(id, { id: user.id, role: user.role }));
  } catch (err) {
    redirect(`/admin/sampah?galat=${encodeURIComponent(userMessage(err, "Gagal memulihkan dokumen"))}`);
  }
  revalidatePath("/admin/sampah");
  revalidatePath("/collections");
  revalidatePath("/search");
  revalidatePath("/");
  redirect(`/docs/${slug}`);
}

/** "Hapus permanen": no way back. */
export async function deleteTrashedForeverAction(formData: FormData): Promise<void> {
  const user = await requireRole(Role.ADMIN);
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await deleteTrashedForever(id, { id: user.id, role: user.role });
  revalidatePath("/admin/sampah");
}
