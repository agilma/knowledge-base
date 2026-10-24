import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, History } from "lucide-react";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import { getDocumentBySlug } from "@/lib/services/documents";
import { getRevisionList } from "@/lib/services/revisions";
import { formatSizeChange } from "@/lib/revisions";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DocumentHistoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireRole([Role.EDITOR, Role.ADMIN]);
  const viewer = { id: user.id, role: user.role };

  const { slug } = await params;
  const doc = await getDocumentBySlug(slug, { includeDrafts: true, viewer });
  if (!doc) notFound();

  const revisions = await getRevisionList(doc.id);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/docs/${doc.slug}`} className="hover:text-foreground transition-colors">
            {doc.title}
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">Riwayat</span>
        </div>
        <div className="flex items-center gap-3">
          <History className="w-7 h-7 text-muted-foreground" />
          <h1 className="text-3xl font-semibold tracking-tight">Riwayat Perubahan</h1>
        </div>
        <p className="text-muted-foreground">
          Setiap simpan yang mengubah judul, ringkasan, jenis, atau isi dicatat sebagai satu
          versi, begitu juga setiap perubahan status (terbit, arsip, kembali ke draf). Yang tersimpan paling banyak 100 versi terakhir. Dokumen yang dibuat sebelum
          riwayat ada baru mulai tercatat pada simpan pertama sesudahnya.
        </p>
      </header>

      {revisions.length === 0 ? (
        <div className="py-12 text-center border rounded-xl border-dashed border-border bg-muted/20">
          <p className="text-muted-foreground">
            Belum ada riwayat. Versi pertama tercatat saat dokumen ini disimpan berikutnya.
          </p>
        </div>
      ) : (
        <ol className="divide-y divide-border rounded-xl border border-border">
          {revisions.map((revision, index) => (
            <li key={revision.version}>
              <Link
                href={`/docs/${doc.slug}/history/${revision.version}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium">
                    Versi {revision.version}
                    {index === 0 && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">terbaru</span>
                    )}
                    {revision.statusLabel && (
                      <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-xs font-normal text-muted-foreground">
                        {revision.statusLabel}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{revision.title}</p>
                  <p className="text-xs text-muted-foreground/80">
                    {formatDate(revision.createdAt)} · {revision.editorName ?? "penulis tidak diketahui"}
                  </p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {revision.sizeChange === null
                    ? formatSizeChange(null)
                    : `${formatSizeChange(revision.sizeChange)} karakter`}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
