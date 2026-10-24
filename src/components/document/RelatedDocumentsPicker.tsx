"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_RELATED } from "@/lib/related";

export interface RelatedCandidate {
  id: string;
  title: string;
  status: string;
  collection: { name: string } | null;
}

const SUGGESTION_LIMIT = 8;

/**
 * Chooses the documents shown under "Pengetahuan Terkait". The chosen ids are
 * sent as repeated hidden `relatedIds` fields, so this works inside the plain
 * form the document editor already submits.
 */
export function RelatedDocumentsPicker({
  candidates,
  initialIds,
}: {
  candidates: RelatedCandidate[];
  initialIds: string[];
}) {
  const byId = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);
  // An id can point at a document that is no longer listed (past the list's
  // cap): keep it rather than silently dropping the relation on save.
  const [selected, setSelected] = useState<string[]>(initialIds);
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!needle) return [];
    return candidates
      .filter((c) => !selected.includes(c.id) && c.title.toLowerCase().includes(needle))
      .slice(0, SUGGESTION_LIMIT);
  }, [candidates, needle, selected]);

  const full = selected.length >= MAX_RELATED;

  const add = (id: string) => {
    if (full || selected.includes(id)) return;
    setSelected([...selected, id]);
    setQuery("");
  };
  const remove = (id: string) => setSelected(selected.filter((x) => x !== id));

  return (
    <div className="space-y-2">
      <Label htmlFor="related-search">Pengetahuan Terkait (Opsional)</Label>
      <p className="text-xs text-muted-foreground">
        Dokumen yang sebaiknya dibaca bersama ini. Hubungannya dua arah: dokumen
        yang dipilih juga menampilkan dokumen ini. Maksimal {MAX_RELATED}.
      </p>

      {selected.map((id) => (
        <input key={id} type="hidden" name="relatedIds" value={id} />
      ))}

      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selected.map((id) => {
            const doc = byId.get(id);
            return (
              <li
                key={id}
                className="flex items-center gap-1 rounded-full border border-border bg-muted/50 py-1 pl-3 pr-1 text-sm"
              >
                <span className="max-w-[16rem] truncate">{doc?.title ?? "Dokumen lain"}</span>
                {doc && doc.status !== "PUBLISHED" && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    {doc.status === "DRAFT" ? "draf" : "arsip"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => remove(id)}
                  aria-label={`Hapus ${doc?.title ?? "dokumen"} dari terkait`}
                  className="rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Input
        id="related-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        // Enter in this field must not submit the whole document.
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (suggestions[0]) add(suggestions[0].id);
          }
        }}
        placeholder={full ? "Batas tercapai" : "Cari judul dokumen untuk ditambahkan..."}
        disabled={full}
        autoComplete="off"
      />

      {needle && !full && (
        <ul className="rounded-lg border border-border bg-card">
          {suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Tidak ada dokumen yang cocok.</li>
          ) : (
            suggestions.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => add(c.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60"
                >
                  <Plus className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{c.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {c.collection?.name}
                    {c.status !== "PUBLISHED" && ` · ${c.status === "DRAFT" ? "draf" : "arsip"}`}
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
