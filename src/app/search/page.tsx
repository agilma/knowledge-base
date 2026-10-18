import Link from "next/link";
import { Search as SearchIcon, FileText, ChevronRight } from "lucide-react";
import { searchDocuments } from "@/lib/services/documents";
import { getCollections } from "@/lib/services/collections";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; collection?: string }>;
}) {
  const { q, collection: selectedCollectionSlug } = await searchParams;
  const query = q ?? "";

  const collections = await getCollections();
  const selectedCollection = collections.find(
    (col) => col.slug === selectedCollectionSlug
  );

  const results = query.trim()
    ? await searchDocuments(query, {
        collectionId: selectedCollection?.id,
      })
    : [];

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <header className="space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Cari Pengetahuan</h1>

        <form method="get" action="/search" className="relative">
          {selectedCollectionSlug && (
            <input type="hidden" name="collection" value={selectedCollectionSlug} />
          )}
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={query}
            className="w-full pl-12 py-7 text-lg rounded-xl bg-background border-border focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Cari dokumen, topik, atau koleksi..."
            autoFocus
          />
        </form>

        <div className="flex flex-wrap gap-2">
          <Link
            href={
              query.trim()
                ? `/search?q=${encodeURIComponent(query)}`
                : "/search"
            }
          >
            <Badge
              variant={!selectedCollectionSlug ? "default" : "secondary"}
              className="cursor-pointer px-3 py-1 text-sm font-normal"
            >
              Semua Koleksi
            </Badge>
          </Link>
          {collections.map((col) => {
            const isSelected = selectedCollectionSlug === col.slug;
            const href = isSelected
              ? query.trim()
                ? `/search?q=${encodeURIComponent(query)}`
                : "/search"
              : query.trim()
              ? `/search?q=${encodeURIComponent(query)}&collection=${col.slug}`
              : `/search?collection=${col.slug}`;

            return (
              <Link key={col.id} href={href}>
                <Badge
                  variant={isSelected ? "default" : "secondary"}
                  className="cursor-pointer px-3 py-1 text-sm font-normal"
                >
                  {col.name}
                </Badge>
              </Link>
            );
          })}
        </div>
      </header>

      <section>
        {!query.trim() ? (
          <div className="text-center py-20 text-muted-foreground border rounded-xl border-dashed border-border bg-muted/20">
            <SearchIcon className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground">
              Ketik kata kunci untuk mulai mencari
            </p>
            <p className="text-sm mt-1 text-muted-foreground">
              Cari berdasarkan judul, ringkasan, atau isi dokumen.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Ditemukan {results.length} hasil
            </p>

            <div className="space-y-4">
              {results.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/docs/${doc.slug}`}
                  className="block p-5 rounded-xl border border-border/50 hover:border-border bg-card hover:bg-accent/50 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <span className="font-medium">{doc.collection.name}</span>
                        <span>•</span>
                        <span>{formatDate(doc.updatedAt)}</span>
                      </div>
                      <h2 className="text-xl font-medium text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        {doc.title}
                      </h2>
                      {doc.excerpt && (
                        <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                          {doc.excerpt}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-6" />
                  </div>
                </Link>
              ))}

              {results.length === 0 && (
                <div className="text-center py-20 text-muted-foreground border rounded-xl border-dashed border-border bg-muted/20">
                  <p className="text-lg font-medium text-foreground">
                    Tidak ada dokumen yang sesuai dengan pencarian Anda.
                  </p>
                  <p className="text-sm mt-2 text-muted-foreground">
                    Coba sesuaikan filter atau kata kunci pencarian Anda.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
