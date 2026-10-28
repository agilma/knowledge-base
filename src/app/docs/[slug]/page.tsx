import { notFound } from "next/navigation";
import Link from "next/link";
import { Role, DocumentStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { getDocumentBySlug, getRelatedDocuments } from "@/lib/services/documents";
import { ChevronRight, FolderOpen, Calendar, AlertCircle, History, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MarkdownContent } from "@/components/document/MarkdownContent";
import { DocumentShareActions, PrintSource } from "@/components/document/DocumentShareActions";
import { DocumentActions } from "@/components/document/DocumentActions";
import { TableOfContents } from "@/components/document/TableOfContents";
import { FavoriteButton } from "@/components/document/FavoriteButton";
import { RecordView } from "@/components/document/RecordView";
import { isFavorite } from "@/lib/services/favorites";
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
  const user = await requireUser();
  const viewer = { id: user.id, role: user.role };
  const canSeeDrafts = user?.role === Role.EDITOR || user?.role === Role.ADMIN;

  const { slug } = await params;
  const doc = await getDocumentBySlug(slug, { includeDrafts: canSeeDrafts, viewer });

  if (!doc) {
    notFound();
  }

  const relatedDocs = await getRelatedDocuments(doc.id, { includeDrafts: canSeeDrafts, viewer });
  const headings = extractHeadings(doc.content);
  const favorite = user ? await isFavorite(user.id, doc.id) : false;

  return (
    <div className="flex w-full">
      {/* Main Content Area */}
      <div className="flex-1 min-w-0 max-w-4xl mx-auto px-6 py-10 lg:pr-10 lg:pl-16 space-y-6">

        {/* Draft/Archived Notice Banner */}
        {doc.status !== DocumentStatus.PUBLISHED && (
          <div className="print:hidden flex items-center gap-2 p-3 text-sm rounded-lg border bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              {doc.status === DocumentStatus.DRAFT
                ? "Dokumen ini masih draf"
                : "Dokumen ini diarsipkan"}
            </span>
          </div>
        )}

        {/* Breadcrumb / Action Header */}
        <div className="print:hidden flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/collections" className="hover:text-foreground transition-colors flex items-center gap-1">
              <FolderOpen className="w-4 h-4" />
              Koleksi
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
            <span className="text-foreground truncate max-w-[200px]">{doc.title}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <DocumentShareActions slug={doc.slug} title={doc.title} excerpt={doc.excerpt} />
            {user && (
              <DocumentActions
                documentId={doc.id}
                documentSlug={doc.slug}
                status={doc.status}
                userRole={user.role}
              />
            )}
          </div>
        </div>

        {/* Document Header */}
        <header className="space-y-6 mb-8">
          <PrintSource slug={doc.slug} collection={doc.collection?.name} status={doc.status} />
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight">
            {doc.restricted && <Lock className="mr-3 inline size-7 text-muted-foreground" aria-label="Dokumen terbatas" />}
            {doc.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>
                Diperbarui {formatDate(doc.updatedAt)}
                {doc.lastEditedBy?.name && ` oleh ${doc.lastEditedBy.name}`}
              </span>
            </div>
            {canSeeDrafts && (
              <Link
                href={`/docs/${doc.slug}/history`}
                className="print:hidden flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <History className="w-4 h-4" />
                Riwayat
              </Link>
            )}
            {doc.collection && (
              <Badge variant="secondary" className="font-normal rounded-full px-3">
                {doc.collection.name}
              </Badge>
            )}
            <Badge variant="outline" className="font-normal rounded-full px-3">
              {formatDocumentType(doc.type)}
            </Badge>
            {user && (
              <span className="print:hidden">
                <FavoriteButton documentId={doc.id} initialFavorite={favorite} />
              </span>
            )}
          </div>
          {doc.excerpt && (
            <p className="text-xl text-muted-foreground leading-relaxed mt-4">
              {doc.excerpt}
            </p>
          )}
        </header>

        {user && <RecordView documentId={doc.id} />}

        {/* The side column only exists on wide screens; on a phone the same
            links fold away above the text. */}
        {headings.length > 0 && (
          <details className="xl:hidden print:hidden rounded-lg border border-border/60 px-4 py-3">
            <summary className="cursor-pointer select-none text-sm font-medium text-muted-foreground">
              Di halaman ini ({headings.length} bagian)
            </summary>
            <div className="mt-3">
              <TableOfContents headings={headings} />
            </div>
          </details>
        )}

        {/* Document Content Sections */}
        <MarkdownContent content={doc.content} />

        {/* Related Knowledge Section */}
        {relatedDocs.length > 0 && (
          <div className="print:hidden mt-16 pt-10 border-t border-border">
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
        <aside className="hidden xl:block print:hidden w-64 shrink-0 py-10 pr-6 pl-2 sticky top-0 h-screen overflow-y-auto">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
              Di halaman ini
            </h4>
            <TableOfContents headings={headings} />
          </div>
        </aside>
      )}
    </div>
  );
}
