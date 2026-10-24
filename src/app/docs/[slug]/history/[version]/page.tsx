import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ChevronRight } from "lucide-react";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import { getDocumentBySlug } from "@/lib/services/documents";
import { getRevision } from "@/lib/services/revisions";
import { MarkdownContent } from "@/components/document/MarkdownContent";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RevisionPage({
  params,
}: {
  params: Promise<{ slug: string; version: string }>;
}) {
  await requireRole([Role.EDITOR, Role.ADMIN]);

  const { slug, version } = await params;
  const doc = await getDocumentBySlug(slug, { includeDrafts: true });
  if (!doc) notFound();

  const revision = await getRevision(doc.id, Number(version));
  if (!revision) notFound();

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <Link href={`/docs/${doc.slug}`} className="hover:text-foreground transition-colors">
          {doc.title}
        </Link>
        <ChevronRight className="w-4 h-4" />
        <Link href={`/docs/${doc.slug}/history`} className="hover:text-foreground transition-colors">
          Riwayat
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground">Versi {revision.version}</span>
      </div>

      <div className="flex items-start gap-2 p-3 text-sm rounded-lg border bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>
          Ini versi {revision.version}, disimpan {formatDate(revision.createdAt)} oleh{" "}
          {revision.editedBy?.name ?? "penulis yang tidak diketahui"}. Dokumen yang sekarang
          berlaku ada di{" "}
          <Link href={`/docs/${doc.slug}`} className="underline underline-offset-2">
            halaman dokumen
          </Link>
          . Untuk memakai isi versi ini, salin dari sini ke editor.
        </span>
      </div>

      <header className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight leading-tight">{revision.title}</h1>
        {revision.excerpt && (
          <p className="text-xl text-muted-foreground leading-relaxed">{revision.excerpt}</p>
        )}
      </header>

      <MarkdownContent content={revision.content} />
    </div>
  );
}
