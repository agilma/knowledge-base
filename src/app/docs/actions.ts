"use server";

import { Role, DocumentStatus, DocumentType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { userMessage } from "@/lib/errors";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import {
  createDocument,
  updateDocument,
  setDocumentStatus,
  deleteDocument,
  getDocumentForRevalidate,
  getDocumentMemberIds,
  setDocumentAccess,
  setRelatedDocuments,
  type DocumentAccessInput,
} from "@/lib/services/documents";
import { MAX_GROUPS_PER_ITEM, setDocumentGroups } from "@/lib/services/groups";
import { assertParentAllowed, setDocumentParent } from "@/lib/services/document-tree";
import { MAX_DOCUMENT_MEMBERS } from "@/lib/collection-access";
import { parseRelatedIds } from "@/lib/related";
import { documentSchema, DocumentInput } from "@/lib/validation/document";

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

/** Ids chosen in the member picker; anything that is not a string is dropped. */
function documentMemberIds(formData: FormData): string[] {
  return formData.getAll("documentMemberIds").filter((id): id is string => typeof id === "string");
}

/** Said before anything is written: the document and its access are saved in two steps. */
function tooManyDocumentMembers(formData: FormData): string | null {
  if (formData.get("documentMembersTouched") === "1" && new Set(documentMemberIds(formData)).size > MAX_DOCUMENT_MEMBERS) {
    return `Anggota dokumen maksimal ${MAX_DOCUMENT_MEMBERS} orang`;
  }
  if (
    formData.get("documentGroupsTouched") === "1" &&
    new Set(formData.getAll("documentGroupIds").filter((id) => typeof id === "string")).size > MAX_GROUPS_PER_ITEM
  ) {
    return `Grup maksimal ${MAX_GROUPS_PER_ITEM} per dokumen`;
  }
  return null;
}

/**
 * What the form says about who may read the document. Only an admin's form carries it,
 * and only a form that says it has the field decides: a post made by hand, or from a tab
 * opened before the field existed, must not read as "open this document".
 */
function accessFromForm(role: Role, formData: FormData): DocumentAccessInput | null {
  if (role !== Role.ADMIN || formData.get("documentRestrictedTouched") !== "1") return null;
  return { restricted: formData.get("documentRestricted") === "on", memberIds: documentMemberIds(formData) };
}

/** The "Induk" field: only a form that carries it decides, so one without it cannot detach the document. */
async function applyParent(documentId: string, formData: FormData, actor: { id: string; role: Role }) {
  if (formData.get("parentTouched") !== "1") return;
  const parentId = formData.get("parentId");
  await setDocumentParent(documentId, typeof parentId === "string" && parentId ? parentId : null, actor);
}

/** The groups ticked in an admin's form; only a form that carries the list decides (see accessFromForm). */
async function applyGroups(documentId: string, formData: FormData, actor: { id: string; role: Role }) {
  if (actor.role !== Role.ADMIN || formData.get("documentGroupsTouched") !== "1") return;
  const ids = formData.getAll("documentGroupIds").filter((id): id is string => typeof id === "string");
  await setDocumentGroups(documentId, ids, actor);
}

/** Said before the document is written, so a refused parent does not leave a half-saved document behind. */
async function checkParentFromForm(documentId: string | null, collectionId: string, formData: FormData, actor: { id: string; role: Role }) {
  if (formData.get("parentTouched") !== "1") return;
  const parentId = formData.get("parentId");
  if (typeof parentId === "string" && parentId) await assertParentAllowed(documentId, collectionId, parentId, actor);
}

export async function createDocumentAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole([Role.EDITOR, Role.ADMIN]);

  const tooMany = user.role === Role.ADMIN ? tooManyDocumentMembers(formData) : null;
  if (tooMany) return { error: tooMany };

  const rawData: DocumentInput = {
    title: formData.get("title") as string,
    slug: formData.get("slug") as string,
    collectionId: formData.get("collectionId") as string,
    type: (formData.get("type") as DocumentType) || DocumentType.PANDUAN,
    excerpt: (formData.get("excerpt") as string) || undefined,
    content: formData.get("content") as string,
    status: (formData.get("status") as DocumentStatus) || DocumentStatus.DRAFT,
  };

  const parsed = documentSchema.safeParse(rawData);
  if (!parsed.success) {
    const formatted = parsed.error.format();
    const fieldErrors: Record<string, string> = {};
    if (formatted.title?._errors[0]) fieldErrors.title = formatted.title._errors[0];
    if (formatted.slug?._errors[0]) fieldErrors.slug = formatted.slug._errors[0];
    if (formatted.collectionId?._errors[0]) fieldErrors.collectionId = formatted.collectionId._errors[0];
    if (formatted.type?._errors[0]) fieldErrors.type = formatted.type._errors[0];
    if (formatted.excerpt?._errors[0]) fieldErrors.excerpt = formatted.excerpt._errors[0];
    if (formatted.content?._errors[0]) fieldErrors.content = formatted.content._errors[0];
    if (formatted.status?._errors[0]) fieldErrors.status = formatted.status._errors[0];

    return { error: "Validasi gagal. Silakan periksa kembali isian Anda.", fieldErrors };
  }

  try {
    await checkParentFromForm(null, parsed.data.collectionId, formData, { id: user.id, role: user.role });
    const newDoc = await createDocument(parsed.data, { id: user.id, role: user.role }, accessFromForm(user.role, formData) ?? undefined);
    if (formData.get("relatedTouched") === "1") {
      await setRelatedDocuments(
        newDoc.id,
        parseRelatedIds(formData.getAll("relatedIds"), newDoc.id),
        { id: user.id, role: user.role }
      );
    }
    await applyParent(newDoc.id, formData, { id: user.id, role: user.role });
    await applyGroups(newDoc.id, formData, { id: user.id, role: user.role });
    const createdWithCol = await getDocumentForRevalidate(newDoc.id);
    revalidatePath("/collections");
    if (createdWithCol?.collection) {
      revalidatePath(`/collections/${createdWithCol.collection.slug}`);
    }
    revalidatePath(`/docs/${newDoc.slug}`);
    revalidatePath("/search");
    revalidatePath("/");
    redirect(`/docs/${newDoc.slug}`);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err;
    }
    return { error: userMessage(err, "Gagal membuat dokumen") };
  }
}

export async function updateDocumentAction(
  id: string,
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole([Role.EDITOR, Role.ADMIN]);
  if (typeof id !== "string") return { error: "Permintaan tidak valid" };

  const tooMany = user.role === Role.ADMIN ? tooManyDocumentMembers(formData) : null;
  if (tooMany) return { error: tooMany };

  const rawData: DocumentInput = {
    title: formData.get("title") as string,
    slug: formData.get("slug") as string,
    collectionId: formData.get("collectionId") as string,
    type: (formData.get("type") as DocumentType) || DocumentType.PANDUAN,
    excerpt: (formData.get("excerpt") as string) || undefined,
    content: formData.get("content") as string,
    status: (formData.get("status") as DocumentStatus) || DocumentStatus.DRAFT,
  };

  const parsed = documentSchema.safeParse(rawData);
  if (!parsed.success) {
    const formatted = parsed.error.format();
    const fieldErrors: Record<string, string> = {};
    if (formatted.title?._errors[0]) fieldErrors.title = formatted.title._errors[0];
    if (formatted.slug?._errors[0]) fieldErrors.slug = formatted.slug._errors[0];
    if (formatted.collectionId?._errors[0]) fieldErrors.collectionId = formatted.collectionId._errors[0];
    if (formatted.type?._errors[0]) fieldErrors.type = formatted.type._errors[0];
    if (formatted.excerpt?._errors[0]) fieldErrors.excerpt = formatted.excerpt._errors[0];
    if (formatted.content?._errors[0]) fieldErrors.content = formatted.content._errors[0];
    if (formatted.status?._errors[0]) fieldErrors.status = formatted.status._errors[0];

    return { error: "Validasi gagal. Silakan periksa kembali isian Anda.", fieldErrors };
  }

  try {
    const oldDoc = await getDocumentForRevalidate(id);
    await checkParentFromForm(id, parsed.data.collectionId, formData, { id: user.id, role: user.role });
    const updatedDoc = await updateDocument(id, parsed.data, { id: user.id, role: user.role });
    if (formData.get("relatedTouched") === "1") {
      await setRelatedDocuments(id, parseRelatedIds(formData.getAll("relatedIds"), id), {
        id: user.id,
        role: user.role,
      });
    }
    await applyParent(id, formData, { id: user.id, role: user.role });
    await applyGroups(id, formData, { id: user.id, role: user.role });
    const access = accessFromForm(user.role, formData);
    if (access) {
      // A picker that was not loaded sends no list: keep the people already on it.
      const memberIds =
        formData.get("documentMembersTouched") === "1"
          ? access.memberIds
          : await getDocumentMemberIds(id, { id: user.id, role: user.role });
      await setDocumentAccess(id, { restricted: access.restricted, memberIds }, { id: user.id, role: user.role });
    }
    const newDocWithCol = await getDocumentForRevalidate(updatedDoc.id);

    revalidatePath("/collections");
    if (oldDoc?.collection) {
      revalidatePath(`/collections/${oldDoc.collection.slug}`);
    }
    if (newDocWithCol?.collection && newDocWithCol.collection.slug !== oldDoc?.collection?.slug) {
      revalidatePath(`/collections/${newDocWithCol.collection.slug}`);
    }
    if (oldDoc?.slug) {
      revalidatePath(`/docs/${oldDoc.slug}`);
    }
    revalidatePath(`/docs/${updatedDoc.slug}`);
    revalidatePath("/search");
    revalidatePath("/");
    redirect(`/docs/${updatedDoc.slug}`);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err;
    }
    return { error: userMessage(err, "Gagal memperbarui dokumen") };
  }
}

export async function setDocumentStatusAction(id: string, status: DocumentStatus) {
  const user = await requireRole([Role.EDITOR, Role.ADMIN]);
  if (typeof id !== "string") return { error: "Permintaan tidak valid" };

  try {
    const doc = await setDocumentStatus(id, status, { id: user.id, role: user.role });
    const docWithCol = await getDocumentForRevalidate(doc.id);
    revalidatePath("/collections");
    if (docWithCol?.collection) {
      revalidatePath(`/collections/${docWithCol.collection.slug}`);
    }
    revalidatePath(`/docs/${doc.slug}`);
    revalidatePath("/search");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { error: userMessage(err, "Gagal mengubah status dokumen") };
  }
}

export async function deleteDocumentAction(id: string) {
  const user = await requireRole(Role.ADMIN);
  if (typeof id !== "string") return { error: "Permintaan tidak valid" };

  try {
    const doc = await getDocumentForRevalidate(id);
    await deleteDocument(id, { id: user.id, role: user.role });
    revalidatePath("/collections");
    if (doc?.collection) {
      revalidatePath(`/collections/${doc.collection.slug}`);
    }
    if (doc?.slug) {
      revalidatePath(`/docs/${doc.slug}`);
    }
    revalidatePath("/search");
    revalidatePath("/");
    if (doc?.collection) {
      redirect(`/collections/${doc.collection.slug}`);
    } else {
      redirect("/collections");
    }
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err;
    }
    return { error: userMessage(err, "Gagal menghapus dokumen") };
  }
}
