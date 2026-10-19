"use client";

import { useState, useActionState } from "react";
import { CollectionStatus } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { slugify } from "@/lib/slug";
import { createCollectionAction, updateCollectionAction, ActionState } from "@/app/collections/actions";

interface CollectionFormProps {
  initialData?: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    status: CollectionStatus;
  };
}

export function CollectionForm({ initialData }: CollectionFormProps) {
  const isEditing = !!initialData;
  const [name, setName] = useState(initialData?.name ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(isEditing);

  const action = isEditing
    ? updateCollectionAction.bind(null, initialData.id)
    : createCollectionAction;

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    action,
    {}
  );

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isSlugManuallyEdited) {
      setSlug(slugify(val));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value);
    setIsSlugManuallyEdited(true);
  };

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {state?.error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Nama Koleksi</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={handleNameChange}
          placeholder="Misal: Panduan Pengembang"
          required
        />
        {state?.fieldErrors?.name && (
          <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="slug">Slug URL</Label>
          {isSlugManuallyEdited && (
            <button
              type="button"
              onClick={() => {
                setIsSlugManuallyEdited(false);
                setSlug(slugify(name));
              }}
              className="text-xs text-primary hover:underline"
            >
              Reset otomatis dari nama
            </button>
          )}
        </div>
        <Input
          id="slug"
          name="slug"
          value={slug}
          onChange={handleSlugChange}
          placeholder="panduan-pengembang"
          required
        />
        <p className="text-xs text-muted-foreground">
          Digunakan dalam URL: /collections/{slug || "slug-koleksi"}
        </p>
        {state?.fieldErrors?.slug && (
          <p className="text-xs text-destructive">{state.fieldErrors.slug}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi (Opsional)</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={initialData?.description ?? ""}
          placeholder="Jelaskan secara singkat tujuan koleksi ini..."
          rows={3}
        />
        {state?.fieldErrors?.description && (
          <p className="text-xs text-destructive">{state.fieldErrors.description}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status Koleksi</Label>
        <Select
          id="status"
          name="status"
          defaultValue={initialData?.status ?? CollectionStatus.ACTIVE}
        >
          <option value={CollectionStatus.ACTIVE}>Aktif</option>
          <option value={CollectionStatus.ARCHIVED}>Diarsipkan</option>
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
            : "Buat Koleksi"}
        </Button>
      </div>
    </form>
  );
}
