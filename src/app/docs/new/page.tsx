import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import { getCollections, listAssignableUsers } from "@/lib/services/collections";
import { getDocumentBySlug } from "@/lib/services/documents";
import { listGroups } from "@/lib/services/groups";
import { DocumentForm } from "@/components/document/DocumentForm";

export const dynamic = "force-dynamic";

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ collection?: string; title?: string; parent?: string }>;
}) {
  const user = await requireRole([Role.EDITOR, Role.ADMIN]);
  const viewer = { id: user.id, role: user.role };

  const { collection: collectionSlug, title: defaultTitle, parent: parentSlug } = await searchParams;
  const collections = await getCollections(viewer);
  // Only an admin may restrict a document, so only an admin's form carries the section.
  const [accessUsers, accessGroups] =
    user.role === Role.ADMIN ? await Promise.all([listAssignableUsers(viewer), listGroups(viewer)]) : [undefined, undefined];

  let defaultCollectionId: string | undefined;
  if (collectionSlug) {
    const matched = collections.find((c) => c.slug === collectionSlug);
    if (matched) {
      defaultCollectionId = matched.id;
    }
  }

  // "Tambah sub-halaman" on a page: its collection and the page itself come ready-filled.
  let initialParent: { id: string; title: string } | null = null;
  if (parentSlug) {
    const parent = await getDocumentBySlug(parentSlug, { includeDrafts: true, viewer });
    if (parent) {
      initialParent = { id: parent.id, title: parent.title };
      defaultCollectionId = parent.collectionId;
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
        accessUsers={accessUsers}
        accessGroups={accessGroups}
        aiEnabled={user.role === Role.ADMIN}
        defaultCollectionId={defaultCollectionId}
        initialParent={initialParent}
        defaultTitle={defaultTitle?.slice(0, 150)}
      />
    </div>
  );
}
