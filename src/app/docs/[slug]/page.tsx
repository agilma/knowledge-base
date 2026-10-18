import { notFound } from "next/navigation";
import Link from "next/link";
import { getDocumentBySlug, getRelatedDocuments } from "@/lib/services/documents";
import { Star, ChevronRight, FolderOpen, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MarkdownContent } from "@/components/document/MarkdownContent";
import { extractHeadings } from "@/lib/markdown";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

function formatDocumentType(type: string): string {
  if (!type) return "";
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await getDocumentBySlug(slug);

  if (!doc) {
    notFound();
  }

  const relatedDocs = await getRelatedDocuments(doc.id);
  const headings = extractHeadings(doc.content);

  return (
    <div className="flex w-full">
      {/* Main Content Area */}
      <div className="flex-1 min-w-0 max-w-4xl mx-auto px-6 py-10 lg:pr-10 lg:pl-16">

        {/* Breadcrumb / Metadata Header */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link href="/collections" className="hover:text-foreground transition-colors flex items-center gap-1">
            <FolderOpen className="w-4 h-4" />
            Pustaka
          </Link>
          <ChevronRight className="w-4 h-4" />
          {doc.collection && (
            <>
              <Link href={`/collections/${doc.collection.slug}`} className="hover:text-foreground transition-colors">
                {doc.collection.name}
              </Link>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
          <span className="text-foreground truncate">{doc.title}</span>
        </div>

        {/* Document Header */}
        <header className="space-y-6 mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight">
            {doc.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>Diperbarui {formatDate(doc.updatedAt)}</span>
            </div>
            {doc.collection && (
              <Badge variant="secondary" className="font-normal rounded-full px-3">
                {doc.collection.name}
              </Badge>
            )}
            <Badge variant="outline" className="font-normal rounded-full px-3">
              {formatDocumentType(doc.type)}
            </Badge>
            <button className="flex items-center gap-1 hover:text-yellow-500 transition-colors ml-auto">
              <Star className="w-4 h-4" />
              <span>Favorit</span>
            </button>
          </div>
          {doc.excerpt && (
            <p className="text-xl text-muted-foreground leading-relaxed mt-4">
              {doc.excerpt}
            </p>
          )}
        </header>

        {/* Document Content Sections */}
        <MarkdownContent content={doc.content} />

        {/* Related Knowledge Section */}
        {relatedDocs.length > 0 && (
          <div className="mt-16 pt-10 border-t border-border">
            <h3 className="text-xl font-semibold tracking-tight mb-6">Pengetahuan Terkait</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedDocs.map((related) => (
                <Link
                  key={related.id}
                  href={`/docs/${related.slug}`}
                  className="p-4 rounded-xl border border-border/50 hover:border-border bg-card hover:bg-accent/50 transition-colors group"
                >
                  <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">{related.title}</h4>
                  {related.excerpt && (
                    <p className="text-sm text-muted-foreground mt-1 truncate">{related.excerpt}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Table of Contents (Desktop only) */}
      {headings.length > 0 && (
        <aside className="hidden xl:block w-64 shrink-0 py-10 pr-6 pl-2 sticky top-0 h-screen overflow-y-auto">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
              Di halaman ini
            </h4>
            <nav className="space-y-2">
              {headings.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className="block text-sm text-muted-foreground hover:text-foreground transition-colors border-l-2 border-transparent hover:border-foreground pl-3 py-1"
                >
                  {heading.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      )}
    </div>
  );
}
