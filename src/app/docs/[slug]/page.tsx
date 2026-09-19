import { notFound } from "next/navigation";
import Link from "next/link";
import { getDocumentBySlug, getCollectionBySlug, getRelatedDocuments } from "@/lib/mockData";
import { Star, ChevronRight, Hash, FolderOpen, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getDocumentBySlug(slug);

  if (!doc) {
    notFound();
  }

  const collection = getCollectionBySlug(doc.collectionId);
  const relatedDocs = getRelatedDocuments(doc);

  return (
    <div className="flex w-full">
      {/* Main Content Area */}
      <div className="flex-1 min-w-0 max-w-4xl mx-auto px-6 py-10 lg:pr-10 lg:pl-16">

        {/* Breadcrumb / Metadata Header */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link href="/collections" className="hover:text-foreground transition-colors flex items-center gap-1">
            <FolderOpen className="w-4 h-4" />
            Library
          </Link>
          <ChevronRight className="w-4 h-4" />
          {collection && (
            <>
              <Link href={`/collections/${collection.slug}`} className="hover:text-foreground transition-colors">
                {collection.name}
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
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
            </div>
            {collection && (
              <Badge variant="secondary" className="font-normal rounded-full px-3">
                {collection.name}
              </Badge>
            )}
            <button className="flex items-center gap-1 hover:text-yellow-500 transition-colors ml-auto">
              <Star className="w-4 h-4" />
              <span>Favorite</span>
            </button>
          </div>
          {doc.description && (
            <p className="text-xl text-muted-foreground leading-relaxed mt-4">
              {doc.description}
            </p>
          )}
        </header>

        {/* Document Content Sections */}
        <div className="space-y-12 prose prose-neutral dark:prose-invert max-w-none">
          {doc.sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="text-2xl font-semibold tracking-tight border-b border-border pb-2 mb-6 flex items-center gap-2 group">
                {section.title}
                <a href={`#${section.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Hash className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                </a>
              </h2>
              <div className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
                {section.content}
              </div>
            </section>
          ))}
        </div>

        {/* Related Knowledge Section */}
        {relatedDocs.length > 0 && (
          <div className="mt-16 pt-10 border-t border-border">
            <h3 className="text-xl font-semibold tracking-tight mb-6">Related Knowledge</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedDocs.map((related) => (
                <Link
                  key={related.id}
                  href={`/docs/${related.slug}`}
                  className="p-4 rounded-xl border border-border/50 hover:border-border bg-card hover:bg-accent/50 transition-colors group"
                >
                  <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">{related.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1 truncate">{related.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Table of Contents (Desktop only) */}
      <aside className="hidden xl:block w-64 shrink-0 py-10 pr-6 pl-2 sticky top-0 h-screen overflow-y-auto">
        <div className="space-y-4">
          <h4 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
            On this page
          </h4>
          <nav className="space-y-2">
            {doc.sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors border-l-2 border-transparent hover:border-foreground pl-3 py-1"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </div>
      </aside>
    </div>
  );
}
