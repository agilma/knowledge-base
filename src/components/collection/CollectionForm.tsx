"use client";

import { useState, useActionState, FormEvent } from "react";
import { CollectionStatus } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { slugify } from "@/lib/slug";
import { useOnlineStatus } from "@/lib/use-online-status";
import { GroupsPicker, type GroupOption } from "@/components/collection/GroupsPicker";
import { CollectionMembersPicker, type AssignableUser } from "@/components/collection/CollectionMembersPicker";
import { createCollectionAction, updateCollectionAction, ActionState } from "@/app/collections/actions";

interface CollectionFormProps {
  initialData?: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    status: CollectionStatus;
    restricted?: boolean;
  };
  /** Everyone who can be made a member; given only to admins, who are the only ones here. */
  users?: AssignableUser[];
  initialMemberIds?: string[];
  /** Every group, and the ones already on the collection. */
  groups?: GroupOption[];
  initialGroupIds?: string[];
}

export function CollectionForm({ initialData, users = [], initialMemberIds = [], groups = [], initialGroupIds = [] }: CollectionFormProps) {
  const isEditing = !!initialData;
  const isOnline = useOnlineStatus();
  const [name, setName] = useState(initialData?.name ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(isEditing);
  const [clientError, setClientError] = useState<string | null>(null);
  const [restricted, setRestricted] = useState(initialData?.restricted ?? false);

  const action = isEditing
    ? updateCollectionAction.bind(null, initialData.id)
    : createCollectionAction;

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    async (prevState, formData) => {
      setClientError(null);
      if (!navigator.onLine) {
        return {
          error: "Gagal mengirim data. Anda sedang offline.",
        };
      }
      try {
        return await action(prevState, formData);
      } catch (err) {
        if (err instanceof TypeError) {
          return {
            error: "Terjadi kesalahan jaringan saat menyimpan. Pastikan koneksi Anda stabil.",
          };
        }
        throw err;
      }
    },
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

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (!isOnline) {
      e.preventDefault();
      setClientError("Anda sedang offline. Koneksikan internet untuk menyimpan koleksi.");
    }
  };

  const errorMessage = clientError || state?.error;

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {errorMessage && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
          {errorMessage}
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

      <div className="space-y-3 rounded-lg border border-border p-4">
        {/* Tells the server this form carries the setting; without it a form posted by hand
            would read as "not restricted" and open the collection. */}
        <input type="hidden" name="restrictedTouched" value="1" />
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="restricted"
            checked={restricted}
            onChange={(e) => setRestricted(e.target.checked)}
            className="mt-1 size-4"
          />
          <span>
            <span className="font-medium">Batasi akses</span>
            <span className="block text-xs text-muted-foreground">
              Hanya admin dan orang yang dipilih yang bisa melihat koleksi ini dan semua dokumennya (termasuk lewat
              pencarian). Untuk yang lain koleksinya seolah tidak ada. Salinan yang sudah tersimpan di perangkat
              seseorang dikosongkan saat ia membuka aplikasi online berikutnya.
            </span>
          </span>
        </label>
        {/* kept mounted (only hidden) so choices not yet saved survive unticking the box */}
        <div hidden={!restricted}>
          <CollectionMembersPicker users={users} initialIds={initialMemberIds} />
          <GroupsPicker groups={groups} initialIds={initialGroupIds} />
        </div>
      </div>

      {!isOnline && (
        <div className="p-3 text-xs text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          Anda sedang offline. Koneksikan internet untuk menyimpan perubahan koleksi.
        </div>
      )}

      <div className="flex items-center gap-3 pt-4">
        <Button type="submit" disabled={isPending || !isOnline}>
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
