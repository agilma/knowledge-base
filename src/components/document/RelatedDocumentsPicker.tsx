"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_RELATED } from "@/lib/related";
import { searchRelatedAction } from "@/app/docs/related-actions";

export interface RelatedCandidate {
  id: string;
  title: string;
  status: string;
  collection: { name: string } | null;
}

const SEARCH_DELAY_MS = 250;

/**
 * Chooses the documents shown under "Pengetahuan Terkait". The chosen ids are
 * sent as repeated hidden `relatedIds` fields, so this works inside the plain
 * form the document editor already submits.
 */
export function RelatedDocumentsPicker({
  initialRelated,
  documentId,
}: {
  /** The documents already related, with their titles. */
  initialRelated: RelatedCandidate[];
  /** The document being edited, so it is never offered to itself. */
  documentId?: string;
}) {
  // Titles of everything chosen or seen, so a chip can be drawn for any id.
  const [known, setKnown] = useState(() => new Map(initialRelated.map((c) => [c.id, c])));
  const byId = known;
  const [selected, setSelected] = useState<string[]>(() => initialRelated.map((c) => c.id));
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<RelatedCandidate[]>([]);
  const [state, setState] = useState<"idle" | "searching" | "error">("idle");
  const latest = useRef(0);

  const needle = query.trim();
  // The server searches the whole library; the answer for an earlier keystroke must not replace a newer one.
  useEffect(() => {
    const mine = ++latest.current;
    if (needle.length < 2) return;
    const timer = window.setTimeout(() => {
      setState("searching");
      searchRelatedAction(needle, documentId).then(
        (rows) => {
          if (mine !== latest.current) return;
          setFound(rows);
          setKnown((prev) => new Map([...prev, ...rows.map((r): [string, RelatedCandidate] => [r.id, r])]));
          setState("idle");
        },
        () => mine === latest.current && setState("error"),
      );
    }, SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [needle, documentId]);

  // Results belong to the text they were found for; with less than two letters there is nothing to show.
  const suggestions = needle.length >= 2 ? found.filter((c) => !selected.includes(c.id)) : [];

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

      {/* Tells the server this form really carries the list. Without it a form
          posted by hand, or from a tab opened before this field existed, would
          read as "no related documents" and wipe the existing ones. */}
      <input type="hidden" name="relatedTouched" value="1" />
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

      {needle.length >= 2 && !full && (
        <ul className="rounded-lg border border-border bg-card" aria-live="polite">
          {state === "searching" && suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Mencari…</li>
          ) : state === "error" ? (
            <li className="px-3 py-2 text-sm text-destructive">Pencarian gagal. Periksa koneksi Anda.</li>
          ) : suggestions.length === 0 ? (
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
