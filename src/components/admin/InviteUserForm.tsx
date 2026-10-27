"use client";

import { useActionState } from "react";
import { Role } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/auth/invite";
import { inviteUserAction, type UserActionState } from "@/app/admin/users/actions";

export function InviteUserForm() {
  const [state, formAction, isPending] = useActionState<UserActionState, FormData>(
    async (prev, formData) => {
      if (!navigator.onLine) return { error: "Anda sedang offline." };
      return inviteUserAction(prev, formData);
    },
    {}
  );

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border/50 bg-card p-5">
      <h2 className="text-lg font-medium">Undang pengguna</h2>
      <div className="grid gap-4 sm:grid-cols-[1fr_16rem]">
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email Google</Label>
          <Input id="invite-email" name="email" type="email" required autoComplete="off" placeholder="nama@gmail.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-role">Peran</Label>
          <Select id="invite-role" name="role" defaultValue={Role.VIEWER}>
            {Object.values(Role).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Aplikasi tidak mengirim email. Beri tahu orangnya, lalu ia masuk dengan akun Google yang sama; perannya sudah menunggu.
      </p>
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">{state.ok}</p>}
      <Button type="submit" disabled={isPending}>{isPending ? "Mengundang…" : "Undang"}</Button>
    </form>
  );
}
