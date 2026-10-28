import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import {
  getDocumentBySlug,
  getDocumentMemberIds,
  getRelatedCandidates,
} from "@/lib/services/documents";
import { getCollections, listAssignableUsers } from "@/lib/services/collections";
import { DocumentForm } from "@/components/document/DocumentForm";

export const dynamic = "force-dynamic";

export default async function EditDocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireRole([Role.EDITOR, Role.ADMIN]);
  const viewer = { id: user.id, role: user.role };

  const { slug } = await params;
  const document = await getDocumentBySlug(slug, { includeDrafts: true, viewer });

  if (!document) {
    notFound();
  }

  const [collections, initialRelated] = await Promise.all([
    getCollections(viewer),
    getRelatedCandidates(document.id, viewer),
  ]);

  // Only an admin may restrict a document, so only an admin's form carries the section.
  const [accessUsers, initialMemberIds] =
    user.role === Role.ADMIN
      ? await Promise.all([listAssignableUsers(viewer), getDocumentMemberIds(document.id, viewer)])
      : [undefined, undefined];

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Edit Dokumen</h1>
        <p className="text-muted-foreground mt-1">
          Perbarui dokumen {document.title}.
        </p>
      </div>

      <DocumentForm
        collections={collections}
        initialRelated={initialRelated}
        accessUsers={accessUsers}
        aiEnabled={user.role === Role.ADMIN}
        initialRestricted={document.restricted}
        initialMemberIds={initialMemberIds}
        initialData={document}
      />
    </div>
  );
}
