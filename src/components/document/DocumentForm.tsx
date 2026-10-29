"use client";

import { useState, useEffect, useActionState, FormEvent, useCallback, useRef } from "react";
import { DocumentStatus, DocumentType } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { AiAssistantPanel } from "@/components/document/AiAssistantPanel";
import type { FormContext, Proposal } from "@/lib/ai/request";
import { MarkdownEditor } from "@/components/document/MarkdownEditor";
import { GroupsPicker, type GroupOption } from "@/components/collection/GroupsPicker";
import { ParentSelect, type ParentOption } from "@/components/document/ParentSelect";
import { RelatedDocumentsPicker, type RelatedCandidate } from "@/components/document/RelatedDocumentsPicker";
import { CollectionMembersPicker, type AssignableUser } from "@/components/collection/CollectionMembersPicker";
import { MAX_DOCUMENT_MEMBERS } from "@/lib/collection-access";
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
  /** The documents already related, with their titles; the picker searches for more. */
  initialRelated?: RelatedCandidate[];
  /** The page this document sits under now (editing) or should be created under (a new sub-page). */
  initialParent?: ParentOption | null;
  /**
   * Given only to admins, who alone may restrict a document: everyone who can be made a
   * member, and the current setting. Without `users` the section is not shown at all.
   */
  accessUsers?: AssignableUser[];
  initialRestricted?: boolean;
  initialMemberIds?: string[];
  /** Admins only: every group, and the ones already on the document. */
  accessGroups?: GroupOption[];
  initialGroupIds?: string[];
  /** Given only to admins; the server checks the role again on every request. */
  aiEnabled?: boolean;
  defaultCollectionId?: string;
  defaultTitle?: string;
  /** A published document of a collection that requires approval: saving asks an admin, the live text stays. */
  reviewMode?: boolean;
  /** A saved template this new document starts from: its text and type replace the built-in skeleton. */
  defaultTemplate?: { id: string; type: DocumentType; content: string };
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
  initialRelated = [],
  initialParent = null,
  accessUsers,
  initialRestricted = false,
  initialMemberIds = [],
  accessGroups = [],
  initialGroupIds = [],
  aiEnabled = false,
  defaultCollectionId,
  defaultTitle,
  defaultTemplate,
  reviewMode = false,
  initialData,
}: DocumentFormProps) {
  const isEditing = !!initialData;
  const isSlugLocked = isEditing && initialData.status !== DocumentStatus.DRAFT;
  const isOnline = useOnlineStatus();
  const [restricted, setRestricted] = useState(initialRestricted);
  const [aiOpen, setAiOpen] = useState(false);

  // Storage key determination
  const draftKey = isEditing
    ? `kb:draft:doc:${initialData.id}`
    : `kb:draft:doc:new:${defaultCollectionId ? collections.find(c => c.id === defaultCollectionId)?.slug || "none" : "none"}${defaultTemplate ? `:t:${defaultTemplate.id}` : ""}`;

  const [title, setTitle] = useState(initialData?.title ?? defaultTitle ?? "");
  const [slug, setSlug] = useState(
    initialData?.slug ?? (defaultTitle ? slugify(defaultTitle) : "")
  );
  const [collectionId, setCollectionId] = useState(
    initialData?.collectionId ?? defaultCollectionId ?? collections[0]?.id ?? ""
  );
  const [type, setType] = useState<DocumentType>(initialData?.type ?? defaultTemplate?.type ?? DocumentType.PANDUAN);
  const [excerpt, setExcerpt] = useState(initialData?.excerpt ?? "");
  const [content, setContent] = useState(
    initialData?.content ?? defaultTemplate?.content ?? DOCUMENT_TEMPLATES[DocumentType.PANDUAN]
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
    type: initialData?.type ?? defaultTemplate?.type ?? DocumentType.PANDUAN,
    excerpt: initialData?.excerpt ?? "",
    content: initialData?.content ?? defaultTemplate?.content ?? DOCUMENT_TEMPLATES[DocumentType.PANDUAN],
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

  // The saved draft lives in the browser, so the server cannot know it. Reading it
  // while rendering (as this used to) gave the server one page and the browser
  // another, which React reports as hydration error #418 on every load with a
  // draft. It is read once the form has mounted instead.
  const [localDraft, setLocalDraft] = useState<LocalDraft | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as LocalDraft;
      if (
        parsed &&
        typeof parsed.savedAt === "number" &&
        (!isEditing || parsed.savedAt > serverUpdatedAt) &&
        !isUnchanged(parsed)
      ) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- the browser is the only place the draft can be read
        setLocalDraft(parsed);
        setShowDraftBanner(true);
      }
    } catch (e) {
      console.warn("Gagal membaca draf lokal:", e);
    }
    // once per form: later edits are the autosave's business, not a new draft to offer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

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

  const aiFormContext = (): FormContext => ({
    title,
    slug,
    collectionSlug: collections.find((c) => c.id === collectionId)?.slug ?? "",
    type,
    excerpt,
    // The untouched template says nothing about what the author wants.
    content: isUntouchedTemplate(content) || !content.trim() ? undefined : content,
  });

  const applyAiProposal = (p: Proposal): string[] => {
    const notes: string[] = [];
    setTitle(p.title);
    if (isSlugLocked) {
      notes.push("Slug tidak diubah karena dokumen sudah terbit.");
    } else {
      setSlug(p.slug);
      setIsSlugManuallyEdited(true);
    }
    const target = collections.find((c) => c.slug === p.collection_slug);
    if (target) setCollectionId(target.id);
    else notes.push(`Koleksi "${p.collection_slug}" tidak ditemukan, koleksi di form tidak diubah.`);
    // Set directly: handleTypeChange would swap the content for a template first.
    setType(p.type);
    setExcerpt(p.excerpt);
    setContent(p.content);
    return notes;
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

      {aiEnabled && (
        <>
          <Button type="button" variant="outline" size="sm" onClick={() => setAiOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Asisten AI
          </Button>
          <AiAssistantPanel
            open={aiOpen}
            onOpenChange={setAiOpen}
            documentId={initialData?.id}
            getForm={aiFormContext}
            formHasContent={() => !!aiFormContext().content || !!title.trim()}
            onApply={applyAiProposal}
          />
        </>
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

      <ParentSelect
        collectionId={collectionId}
        documentId={initialData?.id}
        initialCollectionId={initialData?.collectionId ?? defaultCollectionId ?? collections[0]?.id ?? ""}
        initialParent={initialParent}
      />

      <RelatedDocumentsPicker initialRelated={initialRelated} documentId={initialData?.id} />

      {accessUsers && (
        <div className="space-y-3 rounded-lg border border-border p-4">
          {/* Tells the server this form carries the setting; without it a form posted by hand
              would read as "not restricted" and open the document. */}
          <input type="hidden" name="documentRestrictedTouched" value="1" />
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="documentRestricted"
              checked={restricted}
              onChange={(e) => setRestricted(e.target.checked)}
              className="mt-1 size-4"
            />
            <span>
              <span className="font-medium">Batasi akses dokumen ini</span>
              <span className="block text-xs text-muted-foreground">
                Hanya admin dan orang yang dipilih yang bisa membaca dokumen ini (termasuk lewat pencarian, riwayat,
                dan daftar terkait). Koleksinya tetap berlaku: kalau koleksinya terbatas, orang itu harus ada di daftar
                koleksi juga. Untuk yang lain dokumennya seolah tidak ada.
              </span>
            </span>
          </label>
          {/* kept mounted (only hidden) so choices not yet saved survive unticking the box */}
          <div hidden={!restricted}>
            <CollectionMembersPicker
              users={accessUsers}
              initialIds={initialMemberIds}
              noun="dokumen"
              max={MAX_DOCUMENT_MEMBERS}
              fieldName="documentMemberIds"
              touchedName="documentMembersTouched"
            />
            <GroupsPicker
              groups={accessGroups}
              initialIds={initialGroupIds}
              noun="dokumen"
              fieldName="documentGroupIds"
              touchedName="documentGroupsTouched"
            />
          </div>
        </div>
      )}

      {reviewMode ? (
        <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-700 dark:bg-amber-950/20">
          <input type="hidden" name="status" value={status} />
          <p className="text-sm font-medium">Dokumen ini terbit di koleksi yang butuh persetujuan</p>
          <p className="text-xs text-muted-foreground">
            Perubahan Anda tidak langsung tampil: dikirim ke admin, dan dokumen yang terbit baru berubah setelah admin menyetujui.
            Yang diajukan hanya judul, ringkasan, jenis, dan isi; perubahan koleksi, alamat (slug), induk, dokumen terkait, dan akses tidak ikut.
          </p>
          <Label htmlFor="reviewNote">Catatan untuk admin (opsional)</Label>
          <textarea
            id="reviewNote"
            name="reviewNote"
            rows={2}
            maxLength={500}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            placeholder="Apa yang diubah dan kenapa"
          />
        </div>
      ) : (
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
      )}

      {!isOnline && (
        <div className="p-3 text-xs text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          Anda sedang offline. Perubahan disimpan sebagai draf lokal di perangkat ini dan bisa dikirim setelah koneksi kembali.
        </div>
      )}

      <div className="flex items-center gap-3 pt-4">
        <Button type="submit" disabled={isPending || !isOnline}>
          {isPending
            ? "Menyimpan..."
            : reviewMode
            ? "Ajukan perubahan"
            : isEditing
            ? "Simpan Perubahan"
            : "Buat Dokumen"}
        </Button>
      </div>
    </form>
  );
}
