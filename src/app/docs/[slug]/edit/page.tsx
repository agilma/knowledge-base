import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { documentReadableWhere } from "@/lib/collection-access";
import {
  getDocumentBySlug,
  getDocumentMemberIds,
  getRelatedCandidates,
} from "@/lib/services/documents";
import { getCollections, listAssignableUsers } from "@/lib/services/collections";
import { getDocumentGroupIds, listGroups } from "@/lib/services/groups";
import { saveMode } from "@/lib/services/reviews";
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
  const reviewMode = (await saveMode(document.id, viewer)) === "review";
  const parent = document.parentId
    ? await db.document.findFirst({ where: { id: document.parentId, ...documentReadableWhere(viewer) }, select: { id: true, title: true } })
    : null;

  // Only an admin may restrict a document, so only an admin's form carries the section.
  const [accessUsers, initialMemberIds, accessGroups, initialGroupIds] =
    user.role === Role.ADMIN
      ? await Promise.all([
          listAssignableUsers(viewer),
          getDocumentMemberIds(document.id, viewer),
          listGroups(viewer),
          getDocumentGroupIds(document.id, viewer),
        ])
      : [undefined, undefined, undefined, undefined];

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
        initialParent={parent}
        reviewMode={reviewMode}
        accessUsers={accessUsers}
        aiEnabled={user.role === Role.ADMIN}
        initialRestricted={document.restricted}
        initialMemberIds={initialMemberIds}
        accessGroups={accessGroups}
        initialGroupIds={initialGroupIds}
        initialData={document}
      />
    </div>
  );
}
