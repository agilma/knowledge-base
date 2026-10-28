"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { restoreRevisionAction } from "@/app/docs/revision-actions";

/** Asks first: the document's text is replaced, though the version it replaces stays in the history. */
export function RestoreRevisionButton({ slug, version }: { slug: string; version: number }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const restore = () =>
    startTransition(async () => {
      setError(null);
      try {
        const result = await restoreRevisionAction(slug, version);
        if (result?.error) setError(result.error);
      } catch (err) {
        // A redirect after success is not an error.
        if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
        setError("Gagal memulihkan versi. Periksa koneksi Anda.");
      }
    });

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <RotateCcw className="mr-1.5 size-3.5" />
        Pulihkan versi ini
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent className="max-w-md">
          <DialogTitle>Pulihkan versi {version}?</DialogTitle>
          <DialogDescription>
            Judul, ringkasan, jenis, dan isi dokumen diganti dengan yang ada di versi {version}. Versi yang sekarang tetap ada di riwayat,
            jadi pemulihan ini bisa dibatalkan dengan memulihkan versi itu. Alamat, koleksi, dan status terbit tidak berubah.
          </DialogDescription>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button type="button" onClick={restore} disabled={pending}>
              {pending ? "Memulihkan…" : "Ya, pulihkan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
