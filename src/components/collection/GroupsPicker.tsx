"use client";

import { useState } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/label";

export interface GroupOption {
  id: string;
  name: string;
  memberCount: number;
}

/**
 * Ticks the groups whose members may read a restricted collection or document, besides the people
 * chosen by name. Sent as repeated hidden-free checkbox fields `fieldName`, with `touchedName` so
 * a form that never loaded the list cannot clear it.
 */
export function GroupsPicker({
  groups,
  initialIds,
  noun = "koleksi",
  fieldName = "groupIds",
  touchedName = "groupsTouched",
}: {
  groups: GroupOption[];
  initialIds: string[];
  noun?: string;
  fieldName?: string;
  touchedName?: string;
}) {
  const [selected, setSelected] = useState(() => new Set(initialIds));

  return (
    <div className="mt-4 space-y-2">
      <Label>Grup yang boleh membaca {noun} ini</Label>
      <input type="hidden" name={touchedName} value="1" />
      {groups.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Belum ada grup. Buat di{" "}
          <Link href="/admin/grup" className="underline underline-offset-2">
            Grup
          </Link>{" "}
          agar tidak perlu memilih orang satu per satu.
        </p>
      ) : (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {groups.map((group) => (
            <li key={group.id}>
              <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  name={fieldName}
                  value={group.id}
                  checked={selected.has(group.id)}
                  onChange={(e) =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(group.id);
                      else next.delete(group.id);
                      return next;
                    })
                  }
                  className="size-4"
                />
                <span className="min-w-0 flex-1 break-words">{group.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{group.memberCount} orang</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Semua anggota grup ikut bisa membaca; orang yang masuk atau keluar grup langsung mendapat atau kehilangan akses.
      </p>
    </div>
  );
}
