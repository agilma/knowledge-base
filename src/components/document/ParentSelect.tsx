"use client";

import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { listParentCandidatesAction } from "@/app/docs/tree-actions";

export interface ParentOption {
  id: string;
  title: string;
}

/**
 * "Induk": the page this document sits under, chosen among the documents of the same
 * collection. The choices are asked of the server when the collection changes, and the
 * chosen one is forgotten then (a parent lives in the same collection). Sent as `parentId`,
 * with `parentTouched` so a form that never loaded this field cannot detach the document.
 */
export function ParentSelect({
  collectionId,
  documentId,
  initialCollectionId,
  initialParent,
}: {
  collectionId: string;
  documentId?: string;
  /** The collection the document is in now; the saved parent belongs to it. */
  initialCollectionId: string;
  initialParent: ParentOption | null;
}) {
  const [options, setOptions] = useState<{ forCollection: string; rows: ParentOption[] } | null>(null);
  // What was picked, with the collection it was picked in: a parent lives in one collection, so a pick
  // does not carry over to another, and the saved parent only counts in the collection it was saved in.
  const [picked, setPicked] = useState<{ collection: string; id: string } | null>(null);
  const latest = useRef(0);

  useEffect(() => {
    const mine = ++latest.current;
    listParentCandidatesAction(collectionId, documentId).then(
      (rows) => mine === latest.current && setOptions({ forCollection: collectionId, rows }),
      () => mine === latest.current && setOptions({ forCollection: collectionId, rows: [] }),
    );
  }, [collectionId, documentId]);

  const value = picked && picked.collection === collectionId ? picked.id : collectionId === initialCollectionId ? (initialParent?.id ?? "") : "";

  const rows = options && options.forCollection === collectionId ? options.rows : [];
  // The saved parent is always offered, even when the list is still loading or was cut short.
  const saved = collectionId === initialCollectionId && initialParent && !rows.some((r) => r.id === initialParent.id) ? [initialParent] : [];

  return (
    <div className="space-y-2">
      <Label htmlFor="parentId">Induk (opsional)</Label>
      <Select id="parentId" name="parentId" value={value} onChange={(e) => setPicked({ collection: collectionId, id: e.target.value })}>
        <option value="">Tanpa induk (di daftar utama koleksi)</option>
        {[...saved, ...rows].map((row) => (
          <option key={row.id} value={row.id}>
            {row.title}
          </option>
        ))}
      </Select>
      <input type="hidden" name="parentTouched" value="1" />
      <p className="text-xs text-muted-foreground">
        Menaruh dokumen ini sebagai bagian dari dokumen lain di koleksi yang sama (misalnya bab di bawah satu panduan), paling banyak 4 tingkat.
      </p>
    </div>
  );
}
