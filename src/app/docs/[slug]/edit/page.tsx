import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import { getDocumentBySlug } from "@/lib/services/documents";
import { getCollections } from "@/lib/services/collections";
import { DocumentForm } from "@/components/document/DocumentForm";

export const dynamic = "force-dynamic";

export default async function EditDocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireRole([Role.EDITOR, Role.ADMIN]);

  const { slug } = await params;
  const document = await getDocumentBySlug(slug, { includeDrafts: true });

  if (!document) {
    notFound();
  }

  const collections = await getCollections();

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
        initialData={document}
      />
    </div>
  );
}
