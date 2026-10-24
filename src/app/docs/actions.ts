"use server";

import { Role, DocumentStatus, DocumentType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import {
  createDocument,
  updateDocument,
  setDocumentStatus,
  deleteDocument,
  getDocumentForRevalidate,
  setRelatedDocuments,
} from "@/lib/services/documents";
import { parseRelatedIds } from "@/lib/related";
import { documentSchema, DocumentInput } from "@/lib/validation/document";

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createDocumentAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole([Role.EDITOR, Role.ADMIN]);

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
    const newDoc = await createDocument(parsed.data, { id: user.id, role: user.role });
    if (formData.get("relatedTouched") === "1") {
      await setRelatedDocuments(
        newDoc.id,
        parseRelatedIds(formData.getAll("relatedIds"), newDoc.id),
        { id: user.id, role: user.role }
      );
    }
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
    return { error: err instanceof Error ? err.message : "Gagal membuat dokumen" };
  }
}

export async function updateDocumentAction(
  id: string,
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole([Role.EDITOR, Role.ADMIN]);

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
    const updatedDoc = await updateDocument(id, parsed.data, { id: user.id, role: user.role });
    if (formData.get("relatedTouched") === "1") {
      await setRelatedDocuments(id, parseRelatedIds(formData.getAll("relatedIds"), id), {
        id: user.id,
        role: user.role,
      });
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
    return { error: err instanceof Error ? err.message : "Gagal memperbarui dokumen" };
  }
}

export async function setDocumentStatusAction(id: string, status: DocumentStatus) {
  const user = await requireRole([Role.EDITOR, Role.ADMIN]);

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
    return { error: err instanceof Error ? err.message : "Gagal mengubah status dokumen" };
  }
}

export async function deleteDocumentAction(id: string) {
  const user = await requireRole(Role.ADMIN);

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
    return { error: err instanceof Error ? err.message : "Gagal menghapus dokumen" };
  }
}
