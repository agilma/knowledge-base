import { collapseUnchanged, diffLines, diffStats } from "@/lib/text-diff";

export interface Snapshot {
  title: string;
  excerpt: string | null;
  type: string;
  content: string;
}

const TYPE_NAMES: Record<string, string> = { PANDUAN: "Panduan", MASALAH: "Masalah", REFERENSI: "Referensi" };

/** What differs between two versions of a document: title, summary and type as before and after, the text line by line. */
export function RevisionDiff({ before, after }: { before: Snapshot; after: Snapshot }) {
  const lines = diffLines(before.content, after.content);
  const { added, removed } = diffStats(lines);
  const items = collapseUnchanged(lines);

  const meta: { label: string; from: string; to: string }[] = [];
  if (before.title !== after.title) meta.push({ label: "Judul", from: before.title, to: after.title });
  if ((before.excerpt ?? "") !== (after.excerpt ?? "")) meta.push({ label: "Ringkasan", from: before.excerpt ?? "(kosong)", to: after.excerpt ?? "(kosong)" });
  if (before.type !== after.type) meta.push({ label: "Jenis", from: TYPE_NAMES[before.type] ?? before.type, to: TYPE_NAMES[after.type] ?? after.type });

  if (meta.length === 0 && added === 0 && removed === 0) {
    return <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Tidak ada perbedaan.</p>;
  }

  return (
    <div className="space-y-4">
      {meta.length > 0 && (
        <dl className="space-y-2 rounded-lg border border-border p-4 text-sm">
          {meta.map((m) => (
            <div key={m.label} className="space-y-1">
              <dt className="font-medium">{m.label}</dt>
              <dd className="rounded bg-rose-500/10 px-2 py-1 text-rose-900 dark:text-rose-200 break-words">
                <span className="sr-only">Dihapus: </span>- {m.from}
              </dd>
              <dd className="rounded bg-emerald-500/10 px-2 py-1 text-emerald-900 dark:text-emerald-200 break-words">
                <span className="sr-only">Ditambah: </span>+ {m.to}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <p className="text-sm text-muted-foreground">
        Isi: <span className="font-medium text-emerald-700 dark:text-emerald-300">{added} baris ditambah</span>,{" "}
        <span className="font-medium text-rose-700 dark:text-rose-300">{removed} baris dihapus</span>.
      </p>

      <div className="overflow-x-auto rounded-lg border border-border font-mono text-xs leading-relaxed" aria-label="Perbedaan isi">
        {items.map((item, i) =>
          item.type === "skip" ? (
            <div key={i} className="bg-muted/50 px-3 py-1 text-center text-muted-foreground">
              … {item.count} baris tidak berubah …
            </div>
          ) : (
            <div
              key={i}
              className={`whitespace-pre-wrap break-words px-3 py-0.5 ${
                item.type === "add"
                  ? "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                  : item.type === "del"
                    ? "bg-rose-500/10 text-rose-900 dark:text-rose-200"
                    : ""
              }`}
            >
              <span className="select-none pr-2 opacity-60" aria-hidden="true">
                {item.type === "add" ? "+" : item.type === "del" ? "-" : " "}
              </span>
              <span className="sr-only">{item.type === "add" ? "Ditambah: " : item.type === "del" ? "Dihapus: " : ""}</span>
              {item.text || " "}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
