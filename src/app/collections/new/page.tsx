import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import { listAssignableUsers } from "@/lib/services/collections";
import { CollectionForm } from "@/components/collection/CollectionForm";

export const dynamic = "force-dynamic";

export default async function NewCollectionPage() {
  const admin = await requireRole(Role.ADMIN);
  const users = await listAssignableUsers({ id: admin.id, role: admin.role });

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Koleksi Baru</h1>
        <p className="text-muted-foreground mt-1">
          Buat koleksi baru untuk mengelompokkan dokumen.
        </p>
      </div>

      <CollectionForm users={users} />
    </div>
  );
}
