import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ChevronRight } from "lucide-react";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import { getDocumentBySlug } from "@/lib/services/documents";
import { getRevision } from "@/lib/services/revisions";
import { MarkdownContent } from "@/components/document/MarkdownContent";
import { RestoreRevisionButton } from "@/components/document/RestoreRevisionButton";
import { RevisionDiff } from "@/components/document/RevisionDiff";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_NAMES: Record<string, string> = {
  DRAFT: "draf",
  PUBLISHED: "terbit",
  ARCHIVED: "diarsipkan",
};

export default async function RevisionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; version: string }>;
  searchParams: Promise<{ tampilan?: string }>;
}) {
  const user = await requireRole([Role.EDITOR, Role.ADMIN]);
  const viewer = { id: user.id, role: user.role };

  const { slug, version } = await params;
  const doc = await getDocumentBySlug(slug, { includeDrafts: true, viewer });
  if (!doc) notFound();

  const revision = await getRevision(doc.id, Number(version), viewer);
  if (!revision) notFound();

  // "isi" shows the version; the other two compare it, with the one before it or with the document as it is now.
  const requested = (await searchParams).tampilan;
  const previous = await getRevision(doc.id, revision.version - 1, viewer);
  const mode = requested === "sebelumnya" && previous ? "sebelumnya" : requested === "sekarang" ? "sekarang" : "isi";
  const tabs = [
    { key: "isi", label: "Isi versi ini", href: `/docs/${doc.slug}/history/${revision.version}` },
    ...(previous ? [{ key: "sebelumnya", label: `Beda dengan versi ${previous.version}`, href: `/docs/${doc.slug}/history/${revision.version}?tampilan=sebelumnya` }] : []),
    { key: "sekarang", label: "Beda dengan sekarang", href: `/docs/${doc.slug}/history/${revision.version}?tampilan=sekarang` },
  ];

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
          {revision.editedBy?.name ?? "penulis yang tidak diketahui"}, saat statusnya{" "}
          {STATUS_NAMES[revision.status] ?? revision.status}. Dokumen yang sekarang
          berlaku ada di{" "}
          <Link href={`/docs/${doc.slug}`} className="underline underline-offset-2">
            halaman dokumen
          </Link>
          .
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Tampilan versi" className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={mode === tab.key ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                mode === tab.key ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        <RestoreRevisionButton slug={doc.slug} version={revision.version} />
      </div>

      {mode !== "isi" && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            {mode === "sebelumnya" && previous
              ? `Perubahan dari versi ${previous.version} ke versi ${revision.version}`
              : `Perubahan dari versi ${revision.version} sampai dokumen sekarang`}
          </h2>
          <RevisionDiff
            before={mode === "sebelumnya" && previous ? previous : revision}
            after={mode === "sebelumnya" ? revision : { title: doc.title, excerpt: doc.excerpt, type: doc.type, content: doc.content }}
          />
        </section>
      )}

      {mode === "isi" && (
        <>
          <header className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight leading-tight">{revision.title}</h1>
            {revision.excerpt && (
              <p className="text-xl text-muted-foreground leading-relaxed">{revision.excerpt}</p>
            )}
          </header>

          <MarkdownContent content={revision.content} />
        </>
      )}
    </div>
  );
}
