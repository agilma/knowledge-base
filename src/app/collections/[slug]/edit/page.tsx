import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import {
  getCollectionBySlug,
  getCollectionMemberIds,
  listAssignableUsers,
} from "@/lib/services/collections";
import { CollectionForm } from "@/components/collection/CollectionForm";

export const dynamic = "force-dynamic";

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const admin = await requireRole(Role.ADMIN);

  const { slug } = await params;
  const collection = await getCollectionBySlug(slug, { id: admin.id, role: admin.role });

  if (!collection) {
    notFound();
  }

  const [users, memberIds] = await Promise.all([
    listAssignableUsers({ id: admin.id, role: admin.role }),
    getCollectionMemberIds(collection.id, { id: admin.id, role: admin.role }),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Edit Koleksi</h1>
        <p className="text-muted-foreground mt-1">
          Ubah informasi koleksi {collection.name}.
        </p>
      </div>

      <CollectionForm initialData={collection} users={users} initialMemberIds={memberIds} />
    </div>
  );
}
