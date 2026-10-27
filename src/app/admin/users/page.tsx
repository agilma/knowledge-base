import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import { listUsers } from "@/lib/services/users";
import { InviteUserForm } from "@/components/admin/InviteUserForm";
import { UserRow } from "@/components/admin/UserRow";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const admin = await requireRole(Role.ADMIN);
  const { users, pending } = await listUsers({ id: admin.id, role: admin.role });

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <div className="space-y-2">
        <Link href="/collections" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Koleksi
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Pengguna</h1>
        <p className="text-muted-foreground">Undang orang dan atur apa yang boleh mereka lakukan.</p>
      </div>

      <InviteUserForm />

      {pending.length > 0 && (
        <section aria-labelledby="pending-heading" className="space-y-2">
          <h2 id="pending-heading" className="text-lg font-medium">
            Menunggu masuk ({pending.length})
          </h2>
          <ul className="divide-y divide-border/50">
            {pending.map((p) => (
              <UserRow key={p.id} user={{ email: p.email, role: p.role, invited: true, locked: false, isSelf: false }} />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="users-heading" className="space-y-2">
        <h2 id="users-heading" className="text-lg font-medium">
          Semua pengguna ({users.length})
        </h2>
        <ul className="divide-y divide-border/50">
          {users.map((u) => (
            <UserRow
              key={u.id}
              user={{ ...u, isSelf: u.id === admin.id }}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}
