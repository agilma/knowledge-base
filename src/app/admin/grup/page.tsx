import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GROUP_NAME_MAX, listGroups, MAX_GROUPS } from "@/lib/services/groups";
import { createGroupAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function GroupsPage({ searchParams }: { searchParams: Promise<{ galat?: string | string[] }> }) {
  const user = await requireRole(Role.ADMIN);
  const params = await searchParams;
  const error = Array.isArray(params.galat) ? params.galat[0] : params.galat;
  const groups = await listGroups({ id: user.id, role: user.role });

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <div className="space-y-2">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Beranda
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Grup</h1>
        <p className="text-muted-foreground">
          Kelompok orang (misalnya Tim CS atau Koordinator Toko) yang bisa dipilih sebagai pembaca koleksi atau dokumen terbatas, sehingga tidak perlu
          memilih orang satu per satu. Orang yang masuk atau keluar grup langsung mendapat atau kehilangan akses.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <form action={createGroupAction} className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="name">Grup baru</Label>
          <Input id="name" name="name" required minLength={2} maxLength={GROUP_NAME_MAX} placeholder="Misalnya: Tim CS" />
        </div>
        <Button type="submit" disabled={groups.length >= MAX_GROUPS}>
          Buat grup
        </Button>
      </form>

      {groups.length === 0 ? (
        <div className="py-12 text-center border rounded-xl border-dashed border-border bg-muted/20">
          <p className="text-muted-foreground">Belum ada grup.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {groups.map((group) => (
            <li key={group.id}>
              <Link href={`/admin/grup/${group.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium break-words">{group.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {group.memberCount} orang · dipakai di {group.collectionCount} koleksi dan {group.documentCount} dokumen
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
