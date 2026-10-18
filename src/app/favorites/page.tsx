import { Star } from "lucide-react";

export const dynamic = "force-dynamic";

export default function FavoritesPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <Star className="w-8 h-8 text-yellow-500 fill-yellow-500/20" />
          <h1 className="text-3xl font-semibold tracking-tight">Favorit</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Dokumen yang Anda tandai sebagai favorit untuk akses cepat.
        </p>
      </header>

      <section className="space-y-4">
        <div className="text-center py-20 border rounded-xl border-dashed border-border bg-muted/20">
          <Star className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg text-foreground font-medium">Fitur Favorit belum aktif.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Fitur ini akan aktif dan dapat digunakan setelah fitur masuk/login tersedia.
          </p>
        </div>
      </section>
    </div>
  );
}
