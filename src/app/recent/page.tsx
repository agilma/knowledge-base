import { Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default function RecentPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <Clock className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-semibold tracking-tight">Terakhir Dibuka</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Dokumen yang baru saja Anda buka atau interaksi.
        </p>
      </header>

      <section className="space-y-4">
        <div className="text-center py-20 border rounded-xl border-dashed border-border bg-muted/20">
          <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg text-foreground font-medium">Riwayat tampilan belum aktif.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Fitur ini akan menyimpan riwayat dokumen setelah fitur masuk/login tersedia.
          </p>
        </div>
      </section>
    </div>
  );
}
