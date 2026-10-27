import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import { getCollections, listAssignableUsers } from "@/lib/services/collections";
import { getRelationCandidates } from "@/lib/services/documents";
import { DocumentForm } from "@/components/document/DocumentForm";

export const dynamic = "force-dynamic";

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ collection?: string; title?: string }>;
}) {
  const user = await requireRole([Role.EDITOR, Role.ADMIN]);
  const viewer = { id: user.id, role: user.role };

  const { collection: collectionSlug, title: defaultTitle } = await searchParams;
  const collections = await getCollections(viewer);
  const relatedCandidates = await getRelationCandidates(viewer);
  // Only an admin may restrict a document, so only an admin's form carries the section.
  const accessUsers = user.role === Role.ADMIN ? await listAssignableUsers(viewer) : undefined;

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
        accessUsers={accessUsers}
        defaultCollectionId={defaultCollectionId}
        defaultTitle={defaultTitle?.slice(0, 150)}
      />
    </div>
  );
}
