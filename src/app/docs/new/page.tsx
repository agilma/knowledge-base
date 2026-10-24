import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import { getCollections } from "@/lib/services/collections";
import { getRelationCandidates } from "@/lib/services/documents";
import { DocumentForm } from "@/components/document/DocumentForm";

export const dynamic = "force-dynamic";

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ collection?: string; title?: string }>;
}) {
  await requireRole([Role.EDITOR, Role.ADMIN]);

  const { collection: collectionSlug, title: defaultTitle } = await searchParams;
  const collections = await getCollections();
  const relatedCandidates = await getRelationCandidates();

  let defaultCollectionId: string | undefined;
  if (collectionSlug) {
    const matched = collections.find((c) => c.slug === collectionSlug);
    if (matched) {
      defaultCollectionId = matched.id;
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dokumen Baru</h1>
        <p className="text-muted-foreground mt-1">
          Tulis pengetahuan atau panduan baru dalam format Markdown.
        </p>
      </div>

      <DocumentForm
        collections={collections}
        relatedCandidates={relatedCandidates}
        defaultCollectionId={defaultCollectionId}
        defaultTitle={defaultTitle?.slice(0, 150)}
      />
    </div>
  );
}
