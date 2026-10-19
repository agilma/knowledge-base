"use client";

import { useState, useActionState } from "react";
import { DocumentStatus, DocumentType } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/document/MarkdownEditor";
import { slugify } from "@/lib/slug";
import { createDocumentAction, updateDocumentAction, ActionState } from "@/app/docs/actions";

interface CollectionOption {
  id: string;
  name: string;
  slug: string;
}

interface DocumentFormProps {
  collections: CollectionOption[];
  defaultCollectionId?: string;
  initialData?: {
    id: string;
    title: string;
    slug: string;
    collectionId: string;
    type: DocumentType;
    excerpt?: string | null;
    content: string;
    status: DocumentStatus;
  };
}

export function DocumentForm({
  collections,
  defaultCollectionId,
  initialData,
}: DocumentFormProps) {
  const isEditing = !!initialData;
  const isSlugLocked = isEditing && initialData.status !== DocumentStatus.DRAFT;

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [content, setContent] = useState(initialData?.content ?? "");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(isEditing);

  const action = isEditing
    ? updateDocumentAction.bind(null, initialData.id)
    : createDocumentAction;

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    action,
    {}
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!isSlugManuallyEdited && !isSlugLocked) {
      setSlug(slugify(val));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSlugLocked) return;
    setSlug(e.target.value);
    setIsSlugManuallyEdited(true);
  };

  return (
    <form action={formAction} className="space-y-6 max-w-3xl">
      {state?.error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
          {state.error}
        </div>
      )}

      {/* Hidden input for content since MarkdownEditor is a custom component */}
      <input type="hidden" name="content" value={content} />

      <div className="space-y-2">
        <Label htmlFor="title">Judul Dokumen</Label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={handleTitleChange}
          placeholder="Misal: Cara Konfigurasi Database Neon"
          required
        />
        {state?.fieldErrors?.title && (
          <p className="text-xs text-destructive">{state.fieldErrors.title}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="slug">Slug URL</Label>
          {isSlugManuallyEdited && !isSlugLocked && (
            <button
              type="button"
              onClick={() => {
                setIsSlugManuallyEdited(false);
                setSlug(slugify(title));
              }}
              className="text-xs text-primary hover:underline"
            >
              Reset otomatis dari judul
            </button>
          )}
        </div>
        <Input
          id="slug"
          name="slug"
          value={slug}
          onChange={handleSlugChange}
          placeholder="cara-konfigurasi-database-neon"
          disabled={isSlugLocked}
          required
        />
        {isSlugLocked ? (
          <p className="text-xs text-muted-foreground">
            Slug tidak dapat diubah karena dokumen ini sudah pernah dipublikasi.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Digunakan dalam URL: /docs/{slug || "slug-dokumen"}
          </p>
        )}
        {state?.fieldErrors?.slug && (
          <p className="text-xs text-destructive">{state.fieldErrors.slug}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="collectionId">Koleksi</Label>
          <Select
            id="collectionId"
            name="collectionId"
            defaultValue={initialData?.collectionId ?? defaultCollectionId ?? collections[0]?.id}
            required
          >
            {collections.map((col) => (
              <option key={col.id} value={col.id}>
                {col.name}
              </option>
            ))}
          </Select>
          {state?.fieldErrors?.collectionId && (
            <p className="text-xs text-destructive">{state.fieldErrors.collectionId}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Jenis Dokumen</Label>
          <Select
            id="type"
            name="type"
            defaultValue={initialData?.type ?? DocumentType.PANDUAN}
          >
            <option value={DocumentType.PANDUAN}>Panduan</option>
            <option value={DocumentType.MASALAH}>Masalah</option>
            <option value={DocumentType.SOLUSI}>Solusi</option>
            <option value={DocumentType.REFERENSI}>Referensi</option>
          </Select>
          {state?.fieldErrors?.type && (
            <p className="text-xs text-destructive">{state.fieldErrors.type}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="excerpt">Ringkasan (Opsional)</Label>
        <Textarea
          id="excerpt"
          name="excerpt"
          defaultValue={initialData?.excerpt ?? ""}
          placeholder="Ringkasan singkat yang tampil di daftar..."
          rows={2}
        />
        {state?.fieldErrors?.excerpt && (
          <p className="text-xs text-destructive">{state.fieldErrors.excerpt}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Konten Dokumen</Label>
        <MarkdownEditor
          value={content}
          onChange={setContent}
          placeholder="Tulis dokumen di sini menggunakan Markdown..."
        />
        {state?.fieldErrors?.content && (
          <p className="text-xs text-destructive">{state.fieldErrors.content}</p>
        )}
      </div>

      <div className="space-y-2 max-w-xs">
        <Label htmlFor="status">Status Dokumen</Label>
        <Select
          id="status"
          name="status"
          defaultValue={initialData?.status ?? DocumentStatus.DRAFT}
        >
          <option value={DocumentStatus.DRAFT}>Draf</option>
          <option value={DocumentStatus.PUBLISHED}>Terbit (Published)</option>
          <option value={DocumentStatus.ARCHIVED}>Diarsipkan</option>
        </Select>
        {state?.fieldErrors?.status && (
          <p className="text-xs text-destructive">{state.fieldErrors.status}</p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-4">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Menyimpan..."
            : isEditing
            ? "Simpan Perubahan"
            : "Buat Dokumen"}
        </Button>
      </div>
    </form>
  );
}
