import { notFound } from "next/navigation";
import Link from "next/link";
import { getCollectionBySlug } from "@/lib/services/collections";
import { getDocumentsByCollection } from "@/lib/services/documents";
import { FileText, FolderOpen, ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);

  if (!collection) {
    notFound();
  }

  const docs = await getDocumentsByCollection(collection.id);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
      <div className="flex items-center gap-2">
        <Link
          href="/collections"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-8 px-3 -ml-3 text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Semua Koleksi
        </Link>
      </div>

      <header className="space-y-4">
        <div className="flex items-center gap-3 text-primary mb-2">
          <FolderOpen className="w-6 h-6" />
          <span className="text-sm font-semibold tracking-wider uppercase">Koleksi</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight">{collection.name}</h1>
        {collection.description && (
          <p className="text-xl text-muted-foreground leading-relaxed">
            {collection.description}
          </p>
        )}
      </header>

      <section>
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
          <h2 className="text-lg font-medium">{docs.length} Dokumen</h2>
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
                  <div className="space-y-1">
                    <h3 className="text-lg font-medium group-hover:text-primary transition-colors">{doc.title}</h3>
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
      </section>
    </div>
  );
}
