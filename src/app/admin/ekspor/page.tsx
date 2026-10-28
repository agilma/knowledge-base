import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import { getCollectionsWithDocumentCount } from "@/lib/services/collections";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  const admin = await requireRole(Role.ADMIN);
  const collections = await getCollectionsWithDocumentCount({ includeDrafts: true, viewer: { id: admin.id, role: admin.role } });
  const total = collections.reduce((n, c) => n + c.documentCount, 0);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <div className="space-y-2">
        <Link href="/collections" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Koleksi
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Ekspor dan cadangan</h1>
        <p className="text-muted-foreground">
          Unduh semua dokumen sebagai berkas Markdown dalam satu zip: satu folder per koleksi, satu berkas per dokumen.
        </p>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
        Zip ini memuat <strong>semua</strong> dokumen: draf, diarsipkan, dan yang terbatas. Simpan di tempat yang aman dan jangan dibagikan.
        Pengunduhan dibatasi beberapa kali per sepuluh menit.
      </div>

      <section className="space-y-3">
        <a href="/api/admin/export" download className={buttonVariants({ size: "lg" })}>
          <Download className="mr-2 h-4 w-4" />
          Unduh semua ({total} dokumen)
        </a>
        <p className="text-xs text-muted-foreground">
          Untuk memasukkan kembali: ekstrak zip ke folder di luar repositori (bukan <code>content/drafts/</code>), lalu jalankan{" "}
          <code>npm run docs:import -- --dir &lt;folder&gt;</code>. Dokumen yang alamatnya sudah ada dilewati, yang baru masuk sebagai draf.
        </p>
      </section>

      <section aria-labelledby="per-koleksi" className="space-y-2">
        <h2 id="per-koleksi" className="text-lg font-medium">
          Per koleksi
        </h2>
        <ul className="divide-y divide-border/50 rounded-lg border border-border">
          {collections.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0 truncate">
                {c.name} <span className="text-sm text-muted-foreground">({c.documentCount})</span>
              </span>
              <a
                href={`/api/admin/export?koleksi=${encodeURIComponent(c.slug)}`}
                download
                className={buttonVariants({ variant: "outline", size: "sm" })}
                aria-label={`Unduh koleksi ${c.name}`}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Unduh
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
