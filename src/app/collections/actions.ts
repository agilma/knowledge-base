"use server";

import { Role, CollectionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { userMessage } from "@/lib/errors";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import {
  createCollection,
  updateCollection,
  setCollectionStatus,
  deleteCollection,
  getCollectionById,
  setCollectionMembers,
} from "@/lib/services/collections";
import { collectionSchema, CollectionInput } from "@/lib/validation/collection";
import { MAX_COLLECTION_MEMBERS } from "@/lib/collection-access";

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

/** Ids chosen in the member picker; anything that is not a string is dropped. */
function memberIds(formData: FormData): string[] {
  return formData.getAll("memberIds").filter((id): id is string => typeof id === "string");
}

/**
 * Said before anything is written: the collection and its members are saved in
 * two steps, so a list the second step would refuse must not leave the first done.
 */
function tooManyMembers(formData: FormData): string | null {
  if (formData.get("membersTouched") !== "1") return null;
  return new Set(memberIds(formData)).size > MAX_COLLECTION_MEMBERS
    ? `Anggota koleksi maksimal ${MAX_COLLECTION_MEMBERS} orang`
    : null;
}

export async function createCollectionAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireRole(Role.ADMIN);

  const tooMany = tooManyMembers(formData);
  if (tooMany) return { error: tooMany };

  const rawData: CollectionInput = {
    name: formData.get("name") as string,
    slug: formData.get("slug") as string,
    description: (formData.get("description") as string) || undefined,
    icon: (formData.get("icon") as string) || undefined,
    status: (formData.get("status") as CollectionStatus) || CollectionStatus.ACTIVE,
    restricted: formData.get("restricted") === "on",
  };

  const parsed = collectionSchema.safeParse(rawData);
  if (!parsed.success) {
    const formatted = parsed.error.format();
    const fieldErrors: Record<string, string> = {};
    if (formatted.name?._errors[0]) fieldErrors.name = formatted.name._errors[0];
    if (formatted.slug?._errors[0]) fieldErrors.slug = formatted.slug._errors[0];
    if (formatted.description?._errors[0]) fieldErrors.description = formatted.description._errors[0];
    if (formatted.status?._errors[0]) fieldErrors.status = formatted.status._errors[0];

    return { error: "Validasi gagal. Silakan periksa kembali isian Anda.", fieldErrors };
  }

  try {
    const newCollection = await createCollection(parsed.data);
    if (formData.get("membersTouched") === "1") {
      await setCollectionMembers(newCollection.id, memberIds(formData), { id: admin.id, role: admin.role });
    }
    revalidatePath("/collections");
    revalidatePath(`/collections/${newCollection.slug}`);
    revalidatePath("/search");
    revalidatePath("/");
    redirect(`/collections/${newCollection.slug}`);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err;
    }
    return { error: userMessage(err, "Gagal membuat koleksi") };
  }
}

export async function updateCollectionAction(
  id: string,
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireRole(Role.ADMIN);
  if (typeof id !== "string") return { error: "Permintaan tidak valid" };

  const tooMany = tooManyMembers(formData);
  if (tooMany) return { error: tooMany };

  const viewer = { id: admin.id, role: admin.role };
  const oldCollection = await getCollectionById(id, viewer);
  if (!oldCollection) return { error: "Koleksi tidak ditemukan" };

  // A form that does not carry the field (posted by hand, or from a tab opened before it
  // existed) must not read as "unrestrict this": only a form that says it has it decides.
  const restricted =
    formData.get("restrictedTouched") === "1"
      ? formData.get("restricted") === "on"
      : oldCollection.restricted;

  const rawData: CollectionInput = {
    name: formData.get("name") as string,
    slug: formData.get("slug") as string,
    description: (formData.get("description") as string) || undefined,
    icon: (formData.get("icon") as string) || undefined,
    status: (formData.get("status") as CollectionStatus) || CollectionStatus.ACTIVE,
    restricted,
  };

  const parsed = collectionSchema.safeParse(rawData);
  if (!parsed.success) {
    const formatted = parsed.error.format();
    const fieldErrors: Record<string, string> = {};
    if (formatted.name?._errors[0]) fieldErrors.name = formatted.name._errors[0];
    if (formatted.slug?._errors[0]) fieldErrors.slug = formatted.slug._errors[0];
    if (formatted.description?._errors[0]) fieldErrors.description = formatted.description._errors[0];
    if (formatted.status?._errors[0]) fieldErrors.status = formatted.status._errors[0];

    return { error: "Validasi gagal. Silakan periksa kembali isian Anda.", fieldErrors };
  }

  try {
    const updatedCollection = await updateCollection(id, parsed.data);
    if (formData.get("membersTouched") === "1") {
      await setCollectionMembers(id, memberIds(formData), viewer);
    }
    revalidatePath("/collections");
    revalidatePath(`/collections/${oldCollection.slug}`);
    revalidatePath(`/collections/${updatedCollection.slug}`);
    revalidatePath("/search");
    revalidatePath("/");
    redirect(`/collections/${updatedCollection.slug}`);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err;
    }
    return { error: userMessage(err, "Gagal memperbarui koleksi") };
  }
}

export async function setCollectionStatusAction(id: string, status: CollectionStatus) {
  await requireRole(Role.ADMIN);
  if (typeof id !== "string") return { error: "Permintaan tidak valid" };
  try {
    const col = await setCollectionStatus(id, status);
    revalidatePath("/collections");
    revalidatePath(`/collections/${col.slug}`);
    revalidatePath("/search");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { error: userMessage(err, "Gagal mengubah status koleksi") };
  }
}

export async function deleteCollectionAction(id: string) {
  const admin = await requireRole(Role.ADMIN);
  if (typeof id !== "string") return { error: "Permintaan tidak valid" };
  try {
    const oldCol = await getCollectionById(id, { id: admin.id, role: admin.role });
    await deleteCollection(id);
    revalidatePath("/collections");
    if (oldCol?.slug) {
      revalidatePath(`/collections/${oldCol.slug}`);
    }
    revalidatePath("/search");
    revalidatePath("/");
    redirect("/collections");
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err;
    }
    return { error: userMessage(err, "Gagal menghapus koleksi") };
  }
}
