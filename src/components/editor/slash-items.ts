import type { Editor, Range } from "@tiptap/core";

export interface SlashItem {
  title: string;
  hint: string;
  /** extra words that should also find the item, lowercase */
  keywords: string;
  run: (editor: Editor, range: Range) => void;
}

const at = (editor: Editor, range: Range) => editor.chain().focus().deleteRange(range);

export const SLASH_ITEMS: SlashItem[] = [
  { title: "Judul besar", hint: "H2", keywords: "heading judul h2", run: (e, r) => at(e, r).setHeading({ level: 2 }).run() },
  { title: "Sub judul", hint: "H3", keywords: "heading subjudul h3", run: (e, r) => at(e, r).setHeading({ level: 3 }).run() },
  { title: "Daftar poin", hint: "-", keywords: "bullet list daftar poin", run: (e, r) => at(e, r).toggleBulletList().run() },
  { title: "Daftar nomor", hint: "1.", keywords: "number ordered nomor langkah", run: (e, r) => at(e, r).toggleOrderedList().run() },
  { title: "Daftar centang", hint: "[ ]", keywords: "task todo centang checklist", run: (e, r) => at(e, r).toggleTaskList().run() },
  { title: "Kutipan", hint: ">", keywords: "quote kutipan catatan", run: (e, r) => at(e, r).toggleBlockquote().run() },
  { title: "Blok kode", hint: "```", keywords: "code kode", run: (e, r) => at(e, r).toggleCodeBlock().run() },
  {
    title: "Tabel",
    hint: "3×3",
    keywords: "table tabel",
    run: (e, r) => at(e, r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  { title: "Garis pemisah", hint: "---", keywords: "divider garis hr pemisah", run: (e, r) => at(e, r).setHorizontalRule().run() },
];

export function filterSlashItems(query: string): SlashItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter((i) => i.title.toLowerCase().includes(q) || i.keywords.includes(q));
}
