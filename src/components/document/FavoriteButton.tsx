"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { setFavoriteAction } from "@/app/docs/user-actions";
import { useOnlineStatus } from "@/lib/use-online-status";

export function FavoriteButton({
  documentId,
  initialFavorite,
}: {
  documentId: string;
  initialFavorite: boolean;
}) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isOnline = useOnlineStatus();

  const toggle = () => {
    const next = !favorite;
    setError(null);
    setFavorite(next);
    startTransition(async () => {
      try {
        const result = await setFavoriteAction(documentId, next);
        if (!result.ok) {
          setFavorite(!next);
          setError("Gagal menyimpan favorit.");
        }
      } catch {
        setFavorite(!next);
        setError("Gagal menyimpan favorit. Periksa koneksi Anda.");
      }
    });
  };

  return (
    <span className="ml-auto flex items-center gap-3">
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={toggle}
        disabled={isPending || !isOnline}
        aria-pressed={favorite}
        title={isOnline ? undefined : "Tidak bisa mengubah favorit saat offline"}
        className="flex items-center gap-1 hover:text-yellow-500 transition-colors disabled:opacity-50"
      >
        <Star
          className={
            favorite ? "w-4 h-4 text-yellow-500 fill-yellow-500" : "w-4 h-4"
          }
        />
        <span>{favorite ? "Favorit" : "Tambah favorit"}</span>
      </button>
    </span>
  );
}
