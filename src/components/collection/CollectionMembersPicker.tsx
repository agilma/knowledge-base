"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_COLLECTION_MEMBERS } from "@/lib/collection-access";

export interface AssignableUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

const SUGGESTION_LIMIT = 8;

/**
 * Chooses who may read a restricted collection. The chosen ids go out as
 * repeated hidden `memberIds` fields in the form the collection editor already
 * submits; `membersTouched` tells the server this form really carries the list.
 */
export function CollectionMembersPicker({
  users,
  initialIds,
}: {
  users: AssignableUser[];
  initialIds: string[];
}) {
  const byId = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const [selected, setSelected] = useState<string[]>(initialIds);
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!needle) return [];
    return users
      .filter(
        (u) =>
          !selected.includes(u.id) &&
          (u.email.toLowerCase().includes(needle) || (u.name ?? "").toLowerCase().includes(needle))
      )
      .slice(0, SUGGESTION_LIMIT);
  }, [users, needle, selected]);

  const full = selected.length >= MAX_COLLECTION_MEMBERS;

  const add = (id: string) => {
    if (full || selected.includes(id)) return;
    setSelected([...selected, id]);
    setQuery("");
  };
  const remove = (id: string) => setSelected(selected.filter((x) => x !== id));

  return (
    <div className="space-y-2">
      <Label htmlFor="member-search">Anggota yang boleh membaca</Label>
      <p className="text-xs text-muted-foreground">
        Admin selalu bisa. Viewer yang dipilih bisa membaca; editor yang dipilih bisa membaca dan menulis. Yang tidak
        dipilih tidak melihat koleksi ini sama sekali. Hanya orang yang pernah masuk ke aplikasi yang bisa dipilih
        (maksimal {MAX_COLLECTION_MEMBERS} anggota{users.length >= 500 ? "; daftar ini menampilkan 500 pengguna pertama" : ""}).
      </p>

      <input type="hidden" name="membersTouched" value="1" />
      {selected.map((id) => (
        <input key={id} type="hidden" name="memberIds" value={id} />
      ))}

      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {selected.map((id) => {
            const user = byId.get(id);
            return (
              <li
                key={id}
                className="flex items-center gap-1 rounded-full border border-border bg-muted/50 py-1 pl-3 pr-1 text-sm"
              >
                <span className="max-w-[16rem] truncate">{user ? user.name || user.email : "Pengguna lain"}</span>
                {user && (
                  <span className="text-xs text-muted-foreground">
                    {user.role === "EDITOR" ? "editor" : user.role === "ADMIN" ? "admin" : "viewer"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => remove(id)}
                  aria-label={`Hapus ${user ? user.name || user.email : "pengguna"} dari anggota`}
                  className="rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Belum ada anggota: hanya admin yang bisa membaca.</p>
      )}

      <Input
        id="member-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        // Enter in this field must not submit the whole collection form.
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (suggestions[0]) add(suggestions[0].id);
          }
        }}
        placeholder={full ? "Batas anggota tercapai" : "Cari nama atau email untuk ditambahkan..."}
        disabled={full}
        autoComplete="off"
      />

      {needle && !full && (
        <ul className="rounded-lg border border-border bg-card">
          {suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Tidak ada pengguna yang cocok.</li>
          ) : (
            suggestions.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => add(u.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60"
                >
                  <Plus className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{u.name || u.email}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {u.name ? `${u.email} · ` : ""}
                    {u.role === "EDITOR" ? "editor" : u.role === "ADMIN" ? "admin" : "viewer"}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
