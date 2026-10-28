import { DocumentStatus, DocumentType } from "@prisma/client";

export interface ExportedDocument {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  type: DocumentType;
  status: DocumentStatus;
  restricted: boolean;
  createdAt: Date;
  updatedAt: Date;
  collection: { slug: string; name: string };
  author: { name: string | null } | null;
  lastEditedBy: { name: string | null } | null;
}

const oneLine = (text: string) => text.replace(/\s*\n\s*/g, " ").trim();

/** Where a document sits in the archive: a folder per collection, one file per document. */
export function exportPath(doc: Pick<ExportedDocument, "slug" | "collection">): string {
  return `${doc.collection.slug}/${doc.slug}.md`;
}

/**
 * One document as a Markdown file with a header of `key: value` lines. The first five keys are
 * the ones `npm run docs:import` reads (the same format as content/drafts), so an exported file
 * can be put back as a draft; the others record what the import ignores.
 */
export function documentToMarkdown(doc: ExportedDocument): string {
  const header = [
    `title: ${oneLine(doc.title)}`,
    `slug: ${doc.slug}`,
    `type: ${doc.type}`,
    `collection: ${doc.collection.slug}`,
    `excerpt: ${oneLine(doc.excerpt ?? "")}`,
    `status: ${doc.status}`,
    `restricted: ${doc.restricted}`,
    `created: ${doc.createdAt.toISOString()}`,
    `updated: ${doc.updatedAt.toISOString()}`,
    ...(doc.author?.name ? [`author: ${oneLine(doc.author.name)}`] : []),
    ...(doc.lastEditedBy?.name ? [`last_edited_by: ${oneLine(doc.lastEditedBy.name)}`] : []),
  ];
  return `---\n${header.join("\n")}\n---\n${doc.content.replace(/\r\n/g, "\n").replace(/\s+$/, "")}\n`;
}

export function exportReadme(info: { exportedAt: Date; count: number; collection?: string }): string {
  return [
    "Cadangan Knowledge Base",
    "",
    `Dibuat: ${info.exportedAt.toISOString()}`,
    `Jumlah dokumen saat ekspor dimulai: ${info.count}${info.collection ? ` (hanya koleksi ${info.collection})` : ""}`,
    "",
    "Isi: satu folder per koleksi, satu berkas .md per dokumen (nama berkas = alamat dokumen).",
    "Semua status ikut (draf, terbit, diarsipkan), termasuk dokumen dan koleksi terbatas.",
    "Berkas ini memuat isi yang tidak boleh dilihat semua orang: simpan dengan aman.",
    "",
    "Setiap berkas diawali baris `kunci: nilai` di antara dua garis `---`:",
    "title, slug, type, collection, excerpt (dibaca saat impor), lalu status, restricted,",
    "created, updated, author, last_edited_by (catatan saja).",
    "",
    "Mengembalikan: ekstrak zip ini ke folder di luar repositori (jangan ke content/drafts, isinya",
    "bisa memuat data yang tidak boleh masuk Git) lalu jalankan di folder proyek:",
    "  npm run docs:import -- --dir <folder hasil ekstrak>",
    "Dokumen yang alamatnya sudah ada dilewati, dan yang baru masuk sebagai draf. Satu berkas yang",
    "tidak terbaca menghentikan seluruh impor sebelum apa pun ditulis.",
    "manifest.json memuat daftar semua dokumen dengan statusnya (daftar yang paling akurat).",
    "",
  ].join("\n");
}

export function exportManifest(docs: ExportedDocument[]): string {
  return JSON.stringify(
    docs.map((d) => ({ path: exportPath(d), title: d.title, status: d.status, restricted: d.restricted, updatedAt: d.updatedAt.toISOString() })),
    null,
    2,
  );
}
