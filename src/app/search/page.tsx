import Link from "next/link";
import { Search as SearchIcon, FileText, ChevronRight, Plus } from "lucide-react";
import { Role, DocumentStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { searchDocuments } from "@/lib/services/documents";
import { getCollections } from "@/lib/services/collections";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Highlighted } from "@/components/search/Highlighted";
import { formatDate } from "@/lib/format";
import {
  DOCUMENT_TYPE_LABELS,
  SEARCH_DOCUMENT_TYPES,
  buildSearchHref,
  firstParam,
  hasHighlight,
  parseDocumentType,
  parseSearchQuery,
} from "@/lib/search-query";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    collection?: string | string[];
    type?: string | string[];
  }>;
}) {
  const user = await requireUser();
  const viewer = { id: user.id, role: user.role };
  const canSeeDrafts = user?.role === Role.EDITOR || user?.role === Role.ADMIN;

  const params = await searchParams;
  const query = firstParam(params.q) ?? "";
  const selectedCollectionSlug = firstParam(params.collection);
  const selectedType = parseDocumentType(firstParam(params.type));

  const collections = await getCollections(viewer);
  const selectedCollection = collections.find(
    (col) => col.slug === selectedCollectionSlug
  );

  const hasQuery = query.trim().length > 0;
  // Input made only of symbols ("!!!", a stray quote) has nothing to search for.
  const hasSearchableTerms = parseSearchQuery(query).length > 0;

  const { results, total } = hasSearchableTerms
    ? await searchDocuments(query, {
        collectionId: selectedCollection?.id,
        type: selectedType,
        includeDrafts: canSeeDrafts,
        viewer,
      })
    : { results: [], total: 0 };

  const hrefWith = (filters: { collection?: string; type?: string }) =>
    buildSearchHref({
      q: query,
      collection: selectedCollection?.slug,
      type: selectedType,
      ...filters,
    });

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <header className="space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Cari Pengetahuan</h1>

        <form method="get" action="/search" className="relative">
          {selectedCollection && (
            <input type="hidden" name="collection" value={selectedCollection.slug} />
          )}
          {selectedType && <input type="hidden" name="type" value={selectedType} />}
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={query}
            className="w-full pl-12 py-7 text-lg rounded-xl bg-background border-border focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Cari dokumen, topik, atau koleksi..."
            autoFocus
          />
        </form>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Link href={hrefWith({ type: undefined })}>
              <Badge
                variant={!selectedType ? "default" : "secondary"}
                className="cursor-pointer px-3 py-1 text-sm font-normal"
              >
                Semua Jenis
              </Badge>
            </Link>
            {SEARCH_DOCUMENT_TYPES.map((type) => (
              <Link
                key={type}
                href={hrefWith({ type: selectedType === type ? undefined : type })}
              >
                <Badge
                  variant={selectedType === type ? "default" : "secondary"}
                  className="cursor-pointer px-3 py-1 text-sm font-normal"
                >
                  {DOCUMENT_TYPE_LABELS[type]}
                </Badge>
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={hrefWith({ collection: undefined })}>
              <Badge
                variant={!selectedCollection ? "default" : "secondary"}
                className="cursor-pointer px-3 py-1 text-sm font-normal"
              >
                Semua Koleksi
              </Badge>
            </Link>
            {collections.map((col) => {
              const isSelected = selectedCollection?.id === col.id;
              return (
                <Link
                  key={col.id}
                  href={hrefWith({ collection: isSelected ? undefined : col.slug })}
                >
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
        </div>
      </header>

      <section>
        {!hasQuery ? (
          <div className="text-center py-20 text-muted-foreground border rounded-xl border-dashed border-border bg-muted/20">
            <SearchIcon className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground">
              Ketik kata kunci untuk mulai mencari
            </p>
            <p className="text-sm mt-1 text-muted-foreground">
              Cari berdasarkan judul, ringkasan, atau isi dokumen. Pakai tanda kutip untuk frasa, misalnya &ldquo;gagal closing&rdquo;.
            </p>
          </div>
        ) : (
          <>
            {hasSearchableTerms && (
              <p className="text-sm text-muted-foreground mb-4">
                Ditemukan {total} hasil
                {total > results.length && ` (menampilkan ${results.length} teratas)`}
              </p>
            )}

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
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-xl font-medium text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <span>
                            <Highlighted text={doc.titleHighlight} />
                          </span>
                        </h2>
                        {doc.status === DocumentStatus.DRAFT && (
                          <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400 shrink-0">
                            Draf
                          </Badge>
                        )}
                        {doc.status === DocumentStatus.ARCHIVED && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            Diarsipkan
                          </Badge>
                        )}
                      </div>
                      {doc.excerptHighlight && (
                        <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                          <Highlighted text={doc.excerptHighlight} />
                        </p>
                      )}
                      {/* The match is only in the body: show where. */}
                      {hasHighlight(doc.snippet) &&
                        !hasHighlight(doc.excerptHighlight) && (
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            &hellip; <Highlighted text={doc.snippet} /> &hellip;
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
                    {hasSearchableTerms
                      ? "Tidak ada dokumen yang sesuai dengan pencarian Anda."
                      : "Kata kunci harus berisi huruf atau angka."}
                  </p>
                  <p className="text-sm mt-2 text-muted-foreground">
                    {hasSearchableTerms
                      ? "Coba sesuaikan filter atau kata kunci pencarian Anda."
                      : "Coba ketik kata lain, misalnya judul atau gejala masalahnya."}
                  </p>
                  {/* Someone who searched and found nothing knows better than
                      anyone which document is missing, and will never be more
                      motivated to write it than right now. */}
                  {canSeeDrafts && hasSearchableTerms && (
                    <div className="mt-6">
                      <Link
                        href={{
                          pathname: "/docs/new",
                          query: {
                            title: query.trim(),
                            ...(selectedCollection
                              ? { collection: selectedCollection.slug }
                              : {}),
                          },
                        }}
                        className={buttonVariants({ variant: "outline" })}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Buat dokumen &ldquo;{query.trim()}&rdquo;
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
