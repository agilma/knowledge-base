import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CollectionMembersPicker } from "@/components/collection/CollectionMembersPicker";
import { ConfirmForm } from "@/app/admin/sampah/ConfirmForm";
import { listAssignableUsers } from "@/lib/services/collections";
import { getGroupMemberIds, GROUP_NAME_MAX, MAX_GROUP_MEMBERS } from "@/lib/services/groups";
import { deleteGroupAction, saveGroupAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ galat?: string | string[] }>;
}) {
  const admin = await requireRole(Role.ADMIN);
  const { id } = await params;
  const query = await searchParams;
  const error = Array.isArray(query.galat) ? query.galat[0] : query.galat;
  const viewer = { id: admin.id, role: admin.role };

  const group = await db.group.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { collections: true, documents: true } } },
  });
  if (!group) notFound();
  const [users, memberIds] = await Promise.all([listAssignableUsers(viewer), getGroupMemberIds(group.id, viewer)]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <div className="space-y-2">
        <Link href="/admin/grup" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Grup
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight break-words">{group.name}</h1>
        <p className="text-muted-foreground">
          Dipakai di {group._count.collections} koleksi dan {group._count.documents} dokumen. Atur grup mana yang boleh membaca di form koleksi atau
          dokumen terbatas.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <form action={saveGroupAction.bind(null, group.id)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nama grup</Label>
          <Input id="name" name="name" required minLength={2} maxLength={GROUP_NAME_MAX} defaultValue={group.name} />
        </div>
        <CollectionMembersPicker users={users} initialIds={memberIds} noun="grup" max={MAX_GROUP_MEMBERS} />
        <div className="flex items-center gap-3">
          <Button type="submit">Simpan</Button>
          <Link href="/admin/grup" className="text-sm text-muted-foreground hover:text-foreground">
            Batal
          </Link>
        </div>
      </form>

      <div className="border-t border-border pt-6">
        <ConfirmForm
          action={deleteGroupAction.bind(null, group.id)}
          message={`Hapus grup "${group.name}"? Orang yang hanya bisa membaca lewat grup ini kehilangan aksesnya.`}
        >
          <Button type="submit" variant="ghost" className="text-destructive">
            <Trash2 className="mr-1.5 h-4 w-4" />
            Hapus grup
          </Button>
        </ConfirmForm>
      </div>
    </div>
  );
}
