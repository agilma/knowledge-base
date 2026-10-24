import { Star } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getFavoriteDocuments } from "@/lib/services/favorites";
import { DocumentRow } from "@/components/document/DocumentRow";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const user = await requireUser();
  const docs = await getFavoriteDocuments(user.id, user.role);

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

      <section>
        {docs.length > 0 ? (
          <div className="space-y-3">
            {docs.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border rounded-xl border-dashed border-border bg-muted/20">
            <Star className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-foreground font-medium">Belum ada favorit.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Buka sebuah dokumen lalu pilih &ldquo;Tambah favorit&rdquo; untuk menyimpannya di sini.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
