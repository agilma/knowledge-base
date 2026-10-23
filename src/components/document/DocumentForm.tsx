"use client";

import { useState, useEffect, useActionState, FormEvent, useCallback, useRef } from "react";
import { DocumentStatus, DocumentType } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/document/MarkdownEditor";
import { slugify } from "@/lib/slug";
import { useOnlineStatus } from "@/lib/use-online-status";
import { createDocumentAction, updateDocumentAction, ActionState } from "@/app/docs/actions";
import {
  DOCUMENT_TEMPLATES,
  DOCUMENT_TYPE_HINTS,
  isEquivalentMarkdown,
  isUntouchedTemplate,
} from "@/lib/document-templates";

interface CollectionOption {
  id: string;
  name: string;
  slug: string;
}

interface LocalDraft {
  title: string;
  slug: string;
  collectionId: string;
  type: DocumentType;
  excerpt: string;
  content: string;
  status: DocumentStatus;
  savedAt: number;
}

interface DocumentFormProps {
  collections: CollectionOption[];
  defaultCollectionId?: string;
  defaultTitle?: string;
  initialData?: {
    id: string;
    title: string;
    slug: string;
    collectionId: string;
    type: DocumentType;
    excerpt?: string | null;
    content: string;
    status: DocumentStatus;
    updatedAt?: Date | string;
  };
}

export function DocumentForm({
  collections,
  defaultCollectionId,
  defaultTitle,
  initialData,
}: DocumentFormProps) {
  const isEditing = !!initialData;
  const isSlugLocked = isEditing && initialData.status !== DocumentStatus.DRAFT;
  const isOnline = useOnlineStatus();

  // Storage key determination
  const draftKey = isEditing
    ? `kb:draft:doc:${initialData.id}`
    : `kb:draft:doc:new:${defaultCollectionId ? collections.find(c => c.id === defaultCollectionId)?.slug || "none" : "none"}`;

  const [title, setTitle] = useState(initialData?.title ?? defaultTitle ?? "");
  const [slug, setSlug] = useState(
    initialData?.slug ?? (defaultTitle ? slugify(defaultTitle) : "")
  );
  const [collectionId, setCollectionId] = useState(
    initialData?.collectionId ?? defaultCollectionId ?? collections[0]?.id ?? ""
  );
  const [type, setType] = useState<DocumentType>(initialData?.type ?? DocumentType.PANDUAN);
  const [excerpt, setExcerpt] = useState(initialData?.excerpt ?? "");
  const [content, setContent] = useState(
    initialData?.content ?? DOCUMENT_TEMPLATES[DocumentType.PANDUAN]
  );
  const [status, setStatus] = useState<DocumentStatus>(initialData?.status ?? DocumentStatus.DRAFT);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(isEditing);

  const [clientError, setClientError] = useState<string | null>(null);

  // Track initial mount and initial data timestamps
  const serverUpdatedAt = initialData?.updatedAt
    ? new Date(initialData.updatedAt).getTime()
    : 0;

  // What the form would hold if the author touched nothing. Editing starts
  // from the stored document; a new document starts from the template.
  const [baseline] = useState(() => ({
    title: initialData?.title ?? defaultTitle ?? "",
    slug: initialData?.slug ?? (defaultTitle ? slugify(defaultTitle) : ""),
    collectionId:
      initialData?.collectionId ?? defaultCollectionId ?? collections[0]?.id ?? "",
    type: initialData?.type ?? DocumentType.PANDUAN,
    excerpt: initialData?.excerpt ?? "",
    content: initialData?.content ?? DOCUMENT_TEMPLATES[DocumentType.PANDUAN],
    status: initialData?.status ?? DocumentStatus.DRAFT,
  }));

  // The editor rewrites markdown as it loads (`_a_` → `*a*`), so a draft whose
  // only difference is formatting is not work worth warning about.
  const isUnchanged = useCallback(
    (d: Omit<LocalDraft, "savedAt">) =>
      d.title === baseline.title &&
      d.slug === baseline.slug &&
      d.collectionId === baseline.collectionId &&
      d.type === baseline.type &&
      d.excerpt === baseline.excerpt &&
      d.status === baseline.status &&
      isEquivalentMarkdown(d.content, baseline.content),
    [baseline]
  );

  // Initialize draft state lazily
  const [localDraft, setLocalDraft] = useState<LocalDraft | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw) as LocalDraft;
        if (parsed && typeof parsed.savedAt === "number") {
          if (
            (!isEditing || parsed.savedAt > serverUpdatedAt) &&
            !isUnchanged(parsed)
          ) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn("Gagal membaca draf lokal:", e);
    }
    return null;
  });

  const [showDraftBanner, setShowDraftBanner] = useState<boolean>(() => !!localDraft);

  // Debounced autosave to localStorage
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const saveDraftLocally = useCallback(() => {
    // Only save if there's actual input content or title
    if (!title.trim() && !content.trim()) return;

    // Nothing to protect: drop any stale draft instead of writing a copy of
    // what the server already has.
    if (isUnchanged({ title, slug, collectionId, type, excerpt, content, status })) {
      // While the restore banner is up the form still shows the saved version;
      // clearing now would destroy the draft the author is being asked about.
      if (!showDraftBanner) {
        try {
          localStorage.removeItem(draftKey);
        } catch {}
      }
      return;
    }

    const draftData: LocalDraft = {
      title,
      slug,
      collectionId,
      type,
      excerpt,
      content,
      status,
      savedAt: Date.now(),
    };

    try {
      localStorage.setItem(draftKey, JSON.stringify(draftData));
    } catch (e) {
      console.warn("Gagal menyimpan draf lokal:", e);
    }
  }, [title, slug, collectionId, type, excerpt, content, status, draftKey, isUnchanged, showDraftBanner]);

  useEffect(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      saveDraftLocally();
    }, 1000);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [saveDraftLocally]);

  // Restore draft handler
  const handleRestoreDraft = () => {
    if (!localDraft) return;
    setTitle(localDraft.title ?? "");
    if (!isSlugLocked) {
      setSlug(localDraft.slug ?? "");
    }
    if (localDraft.collectionId) {
      setCollectionId(localDraft.collectionId);
    }
    if (localDraft.type) {
      setType(localDraft.type);
    }
    setExcerpt(localDraft.excerpt ?? "");
    setContent(localDraft.content ?? "");
    if (localDraft.status) {
      setStatus(localDraft.status);
    }
    setShowDraftBanner(false);
  };

  // Discard draft handler
  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch (e) {
      console.warn("Gagal menghapus draf lokal:", e);
    }
    setLocalDraft(null);
    setShowDraftBanner(false);
  };

  // Action definition
  const action = isEditing
    ? updateDocumentAction.bind(null, initialData.id)
    : createDocumentAction;

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    async (prevState, formData) => {
      setClientError(null);

      if (!navigator.onLine) {
        saveDraftLocally();
        return {
          error: "Gagal mengirim data. Anda sedang offline. Perubahan Anda aman di draf lokal.",
        };
      }

      try {
        // Clear local draft right before submitting to server action
        // If server action succeeds, redirect happens. If error returns, user can re-save.
        try {
          localStorage.removeItem(draftKey);
        } catch {}

        const result = await action(prevState, formData);
        return result;
      } catch (err) {
        if (err instanceof TypeError) {
          saveDraftLocally();
          return {
            error: "Terjadi kesalahan jaringan saat menyimpan. Pastikan koneksi Anda stabil. Perubahan tersimpan di draf lokal.",
          };
        }
        throw err;
      }
    },
    {}
  );

  const handleTypeChange = (nextType: DocumentType) => {
    setType(nextType);
    // Only swap the skeleton while nothing has been written over it, so
    // changing your mind about the type never costs you a draft.
    if (!isEditing && isUntouchedTemplate(content)) {
      setContent(DOCUMENT_TEMPLATES[nextType]);
    }
  };

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

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (!isOnline) {
      e.preventDefault();
      // Ensure current changes are written to local draft immediately on attempted submit
      saveDraftLocally();
      setClientError(
        "Anda sedang offline. Perubahan disimpan sebagai draf lokal di perangkat ini dan bisa dikirim setelah koneksi kembali."
      );
    }
  };

  const errorMessage = clientError || state?.error;

  const formattedSavedAt = localDraft?.savedAt
    ? new Date(localDraft.savedAt).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {showDraftBanner && localDraft && (
        <div className="p-3 text-sm bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200 rounded-lg flex flex-wrap items-center justify-between gap-2">
          <span>
            Ada draf lokal yang belum tersimpan ({formattedSavedAt}).
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleRestoreDraft}
              className="h-7 text-xs px-2.5"
            >
              Pulihkan
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDiscardDraft}
              className="h-7 text-xs px-2.5"
            >
              Buang
            </Button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
          {errorMessage}
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
          name={isSlugLocked ? undefined : "slug"}
          value={slug}
          onChange={handleSlugChange}
          placeholder="cara-konfigurasi-database-neon"
          disabled={isSlugLocked}
          required={!isSlugLocked}
        />
        {/* A disabled input is left out of the submitted FormData, so a locked
            slug arrived at the action as null and failed validation — no
            published document could be saved. Carry the value separately. */}
        {isSlugLocked && <input type="hidden" name="slug" value={slug} />}
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
            value={collectionId}
            onChange={(e) => setCollectionId(e.target.value)}
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
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as DocumentType)}
          >
            <option value={DocumentType.PANDUAN}>Panduan</option>
            <option value={DocumentType.MASALAH}>Masalah</option>
            <option value={DocumentType.REFERENSI}>Referensi</option>
          </Select>
          <p className="text-xs text-muted-foreground">
            {DOCUMENT_TYPE_HINTS[type]}
          </p>
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
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
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
          value={status}
          onChange={(e) => setStatus(e.target.value as DocumentStatus)}
        >
          <option value={DocumentStatus.DRAFT}>Draf</option>
          <option value={DocumentStatus.PUBLISHED}>Terbit (Published)</option>
          <option value={DocumentStatus.ARCHIVED}>Diarsipkan</option>
        </Select>
        {state?.fieldErrors?.status && (
          <p className="text-xs text-destructive">{state.fieldErrors.status}</p>
        )}
      </div>

      {!isOnline && (
        <div className="p-3 text-xs text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          Anda sedang offline. Perubahan disimpan sebagai draf lokal di perangkat ini dan bisa dikirim setelah koneksi kembali.
        </div>
      )}

      <div className="flex items-center gap-3 pt-4">
        <Button type="submit" disabled={isPending || !isOnline}>
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
