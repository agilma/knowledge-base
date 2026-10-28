import Link from "next/link";
import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { listTrash, TRASH_RETENTION_DAYS } from "@/lib/services/trash";
import { formatDate } from "@/lib/format";
import { deleteTrashedForeverAction, restoreTrashedAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function TrashPage({ searchParams }: { searchParams: Promise<{ galat?: string | string[] }> }) {
  const user = await requireRole(Role.ADMIN);
  const params = await searchParams;
  const error = Array.isArray(params.galat) ? params.galat[0] : params.galat;
  const items = await listTrash({ id: user.id, role: user.role });

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <div className="space-y-2">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Beranda
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Tempat sampah</h1>
        <p className="text-muted-foreground">
          Dokumen yang dihapus tinggal di sini {TRASH_RETENTION_DAYS} hari, lalu hilang untuk selamanya. Memulihkan mengembalikan dokumen apa adanya
          (isi, status, riwayat versi, anggota, dan dokumen terkait yang masih ada).
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <div className="py-12 text-center border rounded-xl border-dashed border-border bg-muted/20">
          <p className="text-muted-foreground">Tempat sampah kosong.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 space-y-0.5">
                <p className="font-medium break-words">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.collectionName} · dihapus {formatDate(item.deletedAt)}
                  {item.deletedByName ? ` oleh ${item.deletedByName}` : ""} · sisa {item.daysLeft} hari
                </p>
              </div>
              <div className="flex items-center gap-2">
                <form action={restoreTrashedAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <Button type="submit" variant="outline" size="sm" aria-label={`Pulihkan ${item.title}`}>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Pulihkan
                  </Button>
                </form>
                <form action={deleteTrashedForeverAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <Button type="submit" variant="ghost" size="sm" aria-label={`Hapus permanen ${item.title}`} className="text-destructive">
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Hapus permanen
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
