"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { userMessage } from "@/lib/errors";
import { approveReview, rejectReview, setDocumentLocked, submitPublish, withdrawReview } from "@/lib/services/reviews";

const staff = [Role.EDITOR, Role.ADMIN];

/** Back to the review page of the document, or to the inbox it was done from; never anywhere else. */
function backTo(formData: FormData, slug: string): string {
  return formData.get("from") === "inbox" ? "/admin/persetujuan" : `/docs/${encodeURIComponent(slug)}/tinjau`;
}

function fail(path: string, error: unknown, fallback: string): never {
  redirect(`${path}?galat=${encodeURIComponent(userMessage(error, fallback).slice(0, 200))}`);
}

function done(path: string, slug: string, flag?: string): never {
  revalidatePath(`/docs/${slug}`);
  revalidatePath(`/docs/${slug}/tinjau`);
  revalidatePath("/admin/persetujuan");
  revalidatePath("/search");
  revalidatePath("/");
  redirect(flag ? `${path}?${flag}=1` : path);
}

export async function submitPublishAction(documentId: string, slug: string, formData: FormData): Promise<void> {
  const user = await requireRole(staff);
  const path = backTo(formData, slug);
  try {
    await submitPublish(documentId, formData.get("note"), { id: user.id, role: user.role });
  } catch (err) {
    fail(path, err, "Gagal mengajukan");
  }
  done(path, slug, "diajukan");
}

export async function withdrawAction(slug: string, formData: FormData): Promise<void> {
  const user = await requireRole(staff);
  const path = backTo(formData, slug);
  const id = formData.get("reviewId");
  let doc: { slug: string };
  try {
    doc = await withdrawReview(typeof id === "string" ? id : "", { id: user.id, role: user.role });
  } catch (err) {
    fail(path, err, "Gagal menarik permintaan");
  }
  done(path, doc.slug);
}

export async function approveAction(slug: string, formData: FormData): Promise<void> {
  const user = await requireRole(Role.ADMIN);
  const path = backTo(formData, slug);
  const id = formData.get("reviewId");
  let doc: { slug: string };
  try {
    doc = await approveReview(typeof id === "string" ? id : "", formData.get("note"), { id: user.id, role: user.role }, formData.get("seen"));
  } catch (err) {
    fail(path, err, "Gagal menyetujui");
  }
  done(path, doc.slug, "disetujui");
}

export async function rejectAction(slug: string, formData: FormData): Promise<void> {
  const user = await requireRole(Role.ADMIN);
  const path = backTo(formData, slug);
  const id = formData.get("reviewId");
  let doc: { slug: string };
  try {
    doc = await rejectReview(typeof id === "string" ? id : "", formData.get("note"), { id: user.id, role: user.role });
  } catch (err) {
    fail(path, err, "Gagal menolak");
  }
  done(path, doc.slug);
}

export async function lockAction(documentId: string, slug: string, formData: FormData): Promise<void> {
  const user = await requireRole(Role.ADMIN);
  const path = backTo(formData, slug);
  let doc: { slug: string };
  try {
    doc = await setDocumentLocked(documentId, formData.get("locked") === "1", { id: user.id, role: user.role });
  } catch (err) {
    fail(path, err, "Gagal mengubah kunci");
  }
  done(path, doc.slug);
}
