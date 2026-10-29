"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { userMessage } from "@/lib/errors";
import { createTemplateFromDocument, deleteTemplate, renameTemplate } from "@/lib/services/templates";

const staff = [Role.EDITOR, Role.ADMIN];

function fail(path: string, error: unknown, fallback: string): never {
  redirect(`${path}?galat=${encodeURIComponent(userMessage(error, fallback).slice(0, 200))}`);
}

/** "Jadikan templat" on a document page: the document's title becomes the template's name. */
export async function createTemplateAction(documentId: string): Promise<void> {
  const user = await requireRole(staff);
  let name: string;
  try {
    ({ name } = await createTemplateFromDocument(documentId, undefined, { id: user.id, role: user.role }));
  } catch (err) {
    fail("/admin/templat", err, "Gagal menjadikan templat");
  }
  revalidatePath("/admin/templat");
  redirect(`/admin/templat?dibuat=${encodeURIComponent(name.slice(0, 120))}`);
}

export async function renameTemplateAction(id: string, formData: FormData): Promise<void> {
  const user = await requireRole(staff);
  try {
    await renameTemplate(id, formData.get("name"), { id: user.id, role: user.role });
  } catch (err) {
    fail("/admin/templat", err, "Gagal mengganti nama");
  }
  revalidatePath("/admin/templat");
  redirect("/admin/templat");
}

export async function deleteTemplateAction(id: string): Promise<void> {
  const user = await requireRole(staff);
  try {
    await deleteTemplate(id, { id: user.id, role: user.role });
  } catch (err) {
    fail("/admin/templat", err, "Gagal menghapus templat");
  }
  revalidatePath("/admin/templat");
  redirect("/admin/templat");
}
