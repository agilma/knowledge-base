"use client";

import { useState, useTransition } from "react";
import { Role } from "@prisma/client";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/auth/invite";
import { setUserRoleAction, revokeInvitationAction } from "@/app/admin/users/actions";

export interface UserRowData {
  /** Absent for an invitation nobody has used yet, which has no account to change. */
  id?: string;
  email: string;
  name?: string | null;
  role: Role;
  invited: boolean;
  locked: boolean;
  isSelf: boolean;
}

export function UserRow({ user }: { user: UserRowData }) {
  const [role, setRole] = useState<Role>(user.role);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();
  const waiting = user.id === undefined;
  const canRevoke = user.invited && !user.locked && !user.isSelf;

  const change = (next: Role) => {
    if (!user.id) return;
    const id = user.id;
    const previous = role;
    setRole(next);
    setMessage(null);
    startTransition(async () => {
      const result = await setUserRoleAction(id, next);
      if (result.error) {
        setRole(previous);
        setMessage({ text: result.error, error: true });
      } else {
        setMessage({ text: "Tersimpan", error: false });
      }
    });
  };

  const revoke = () => {
    const question = waiting
      ? `Batalkan undangan untuk ${user.email}?`
      : `Cabut akses ${user.email}? Ia dikeluarkan dan tidak bisa masuk lagi, kecuali domain email perusahaan masih mengizinkannya.`;
    if (!window.confirm(question)) return;
    startTransition(async () => {
      const result = await revokeInvitationAction(user.email);
      if (result.error) setMessage({ text: result.error, error: true });
    });
  };

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium">{user.name ?? user.email}</p>
        {user.name && <p className="truncate text-sm text-muted-foreground">{user.email}</p>}
        <p className="mt-1 text-xs text-muted-foreground">
          {waiting && "Diundang, belum pernah masuk. "}
          {user.locked && "Admin dari pengaturan environment. "}
          {user.isSelf && "Ini akun Anda."}
        </p>
      </div>
      <div className="flex flex-col gap-1 sm:w-80">
        <div className="flex items-center gap-2">
          <Select
            aria-label={`Peran ${user.email}`}
            value={role}
            disabled={waiting || user.locked || user.isSelf || isPending}
            onChange={(e) => change(e.target.value as Role)}
          >
            {Object.values(Role).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
          {canRevoke && (
            <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={revoke}>
              {waiting ? "Batal" : "Cabut"}
            </Button>
          )}
        </div>
        {message && (
          <p role={message.error ? "alert" : "status"} className={`text-xs ${message.error ? "text-destructive" : "text-muted-foreground"}`}>
            {message.text}
          </p>
        )}
      </div>
    </li>
  );
}
