"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { userMessage } from "@/lib/errors";
import { addFeedback, addReply, deleteComment, setResolved } from "@/lib/services/comments";

/** Where to go back to: the notes page of the document, or the inbox it was done from; never anything else. */
function backTo(formData: FormData, slug: string): string {
  return formData.get("from") === "inbox" ? "/admin/masukan" : `/docs/${encodeURIComponent(slug)}/masukan`;
}

function fail(path: string, error: unknown, fallback: string): never {
  redirect(`${path}?${path.includes("?") ? "&" : ""}galat=${encodeURIComponent(userMessage(error, fallback).slice(0, 200))}`);
}

function done(path: string, slug: string): never {
  revalidatePath(`/docs/${slug}/masukan`);
  revalidatePath("/admin/masukan");
  redirect(path);
}

export async function sendFeedbackAction(documentId: string, slug: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const path = backTo(formData, slug);
  try {
    await addFeedback(documentId, formData.get("body"), { id: user.id, role: user.role });
  } catch (err) {
    fail(path, err, "Gagal mengirim masukan");
  }
  done(`${path}?terkirim=1`, slug);
}

export async function replyAction(slug: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const path = backTo(formData, slug);
  const rootId = formData.get("rootId");
  let doc: { slug: string };
  try {
    doc = await addReply(typeof rootId === "string" ? rootId : "", formData.get("body"), { id: user.id, role: user.role });
  } catch (err) {
    fail(path, err, "Gagal membalas");
  }
  done(path, doc.slug);
}

export async function resolveAction(slug: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const path = backTo(formData, slug);
  const rootId = formData.get("rootId");
  let doc: { slug: string };
  try {
    doc = await setResolved(typeof rootId === "string" ? rootId : "", formData.get("resolved") === "1", { id: user.id, role: user.role });
  } catch (err) {
    fail(path, err, "Gagal mengubah status masukan");
  }
  done(path, doc.slug);
}

export async function deleteCommentAction(slug: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const path = backTo(formData, slug);
  const id = formData.get("id");
  let doc: { slug: string };
  try {
    doc = await deleteComment(typeof id === "string" ? id : "", { id: user.id, role: user.role });
  } catch (err) {
    fail(path, err, "Gagal menghapus");
  }
  done(path, doc.slug);
}
