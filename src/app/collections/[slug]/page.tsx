import { notFound } from "next/navigation";
import Link from "next/link";
import { Role, DocumentStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { getCollectionBySlug } from "@/lib/services/collections";
import { clampPage } from "@/lib/pagination";
import { COLLECTION_PAGE_SIZE, countDocumentsByCollection, getDocumentsByCollection } from "@/lib/services/documents";
import { CollectionActions } from "@/components/collection/CollectionActions";
import { Badge } from "@/components/ui/badge";
import { FileText, FolderOpen, Lock, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CollectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ halaman?: string }>;
}) {
  const user = await requireUser();
  const viewer = { id: user.id, role: user.role };
  const canSeeDrafts = user?.role === Role.EDITOR || user?.role === Role.ADMIN;

  const { slug } = await params;
  const collection = await getCollectionBySlug(slug, viewer);

  if (!collection) {
    notFound();
  }

  const listOptions = { includeDrafts: canSeeDrafts, viewer, topLevelOnly: true };
  const total = await countDocumentsByCollection(collection.id, listOptions);
  const pages = Math.max(1, Math.ceil(total / COLLECTION_PAGE_SIZE));
  // A page number out of range (an old link, a typed one) shows the nearest real page, not an empty list.
  const page = clampPage((await searchParams).halaman, pages);
  const docs = await getDocumentsByCollection(collection.id, {
    ...listOptions,
    skip: (page - 1) * COLLECTION_PAGE_SIZE,
    take: COLLECTION_PAGE_SIZE,
  });
  const pageHref = (n: number) => (n <= 1 ? `/collections/${collection.slug}` : `/collections/${collection.slug}?halaman=${n}`);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
      <div className="flex items-center justify-between">
        <Link
          href="/collections"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-8 px-3 -ml-3 text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Semua Koleksi
        </Link>

        {user && (
          <CollectionActions
            collectionId={collection.id}
            collectionSlug={collection.slug}
            status={collection.status}
            userRole={user.role}
          />
        )}
      </div>

      <header className="space-y-4">
        <div className="flex items-center gap-3 text-primary mb-2">
          <FolderOpen className="w-6 h-6" />
          <span className="text-sm font-semibold tracking-wider uppercase">Koleksi</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight">{collection.name}</h1>
        {collection.restricted && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="size-3.5" /> Koleksi terbatas: hanya admin dan anggota yang bisa melihatnya.
          </p>
        )}
        {collection.description && (
          <p className="text-xl text-muted-foreground leading-relaxed">
            {collection.description}
          </p>
        )}
      </header>

      <section>
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
          <h2 className="text-lg font-medium">{total} Dokumen</h2>
          {pages > 1 && (
            <p className="text-sm text-muted-foreground">
              Halaman {page} dari {pages}
            </p>
          )}
        </div>

        {docs.length > 0 ? (
          <div className="space-y-3">
            {docs.map((doc) => (
              <Link
                key={doc.id}
                href={`/docs/${doc.slug}`}
                className="block p-5 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50 group"
              >
                <div className="flex items-start gap-4">
                  <FileText className="w-5 h-5 text-muted-foreground mt-0.5 group-hover:text-primary transition-colors" />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-medium group-hover:text-primary transition-colors">{doc.restricted && <Lock className="mr-1.5 inline size-4 text-muted-foreground" aria-label="Dokumen terbatas" />}{doc.title}</h3>
                      {doc.status === DocumentStatus.DRAFT && (
                        <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400">
                          Draf
                        </Badge>
                      )}
                      {doc.status === DocumentStatus.ARCHIVED && (
                        <Badge variant="outline" className="text-xs">
                          Diarsipkan
                        </Badge>
                      )}
                    </div>
                    {doc.excerpt && <p className="text-sm text-muted-foreground">{doc.excerpt}</p>}
                    <p className="text-xs text-muted-foreground/80 mt-2">
                      Diperbarui {formatDate(doc.updatedAt)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center border rounded-xl border-dashed border-border bg-muted/20">
            <p className="text-muted-foreground">Koleksi ini belum memiliki dokumen.</p>
          </div>
        )}

        {pages > 1 && (
          <nav aria-label="Halaman daftar dokumen" className="mt-8 flex items-center justify-between gap-4">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                <ChevronLeft className="size-4" /> Sebelumnya
              </Link>
            ) : (
              <span />
            )}
            {page < pages ? (
              <Link href={pageHref(page + 1)} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Berikutnya <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
