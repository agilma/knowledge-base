import { DocumentType } from "@prisma/client";

/**
 * Starting skeletons for a new document, one per type.
 *
 * An empty editor leaves every author inventing a structure, and the sections
 * that get dropped are the ones a reader needs most under pressure: how to tell
 * the fix worked, and when to stop retrying and escalate. Offering the shape up
 * front costs nothing and makes those sections the default rather than an
 * afterthought.
 */
export const DOCUMENT_TEMPLATES: Record<DocumentType, string> = {
  [DocumentType.PANDUAN]: `## Konteks

Kapan panduan ini dipakai, dan untuk siapa.

## Prasyarat

- Akses atau data apa yang harus disiapkan lebih dulu.

## Langkah

1. Langkah pertama.
2. Langkah kedua.

## Verifikasi

Bagaimana cara tahu langkahnya sudah berhasil.
`,

  [DocumentType.MASALAH]: `## Konteks

Gejalanya seperti apa dari sisi pengguna, dan kapan biasanya muncul.

## Prasyarat

- Akses atau data apa yang dibutuhkan untuk menanganinya.

## Langkah Pemeriksaan

1. Langkah pertama.
2. Langkah kedua.

## Verifikasi

Bagaimana cara tahu masalahnya sudah beres.

## Jika Masih Gagal

Kapan berhenti mencoba sendiri, ke siapa dieskalasi, dan data apa yang harus disertakan.

## Catatan untuk CS

Keluhan ini biasanya masuk dengan kalimat apa, dan pertanyaan penyaring apa yang perlu diajukan lebih dulu.
`,

  [DocumentType.SOLUSI]: `## Konteks

Masalah apa yang diselesaikan oleh solusi ini.

## Langkah Penyelesaian

1. Langkah pertama.
2. Langkah kedua.

## Verifikasi

Bagaimana cara tahu solusinya berhasil.

## Jika Masih Gagal

Kapan dieskalasi, ke siapa, dan data apa yang harus disertakan.
`,

  [DocumentType.REFERENSI]: `## Ringkasan

Informasi apa yang dikumpulkan di sini dan kapan dibutuhkan.

## Rincian

| Nama | Keterangan |
| --- | --- |
|  |  |

## Catatan

Hal yang mudah salah dipahami dari data di atas.
`,
};

/**
 * One line per type, shown under the picker while writing and on the document
 * itself while reading. The four names are not self-explanatory — the seeded
 * document is titled "Panduan …" but filed as "Masalah" — so both sides need
 * the same sentence to stay in step.
 */
export const DOCUMENT_TYPE_HINTS: Record<DocumentType, string> = {
  [DocumentType.PANDUAN]:
    "Cara mengerjakan sesuatu yang rutin, bukan karena ada yang rusak.",
  [DocumentType.MASALAH]:
    "Ada yang tidak berjalan semestinya — gejala, pemeriksaan, dan penanganannya.",
  [DocumentType.SOLUSI]:
    "Penyelesaian satu masalah tertentu, tanpa bagian diagnosis.",
  [DocumentType.REFERENSI]:
    "Data atau daftar untuk dilihat sewaktu-waktu, bukan prosedur.",
};

/**
 * The visual editor rewrites Markdown as it loads it — `- item` comes back as
 * `* item`, blank lines get collapsed — so a byte comparison would report an
 * untouched skeleton as edited. Compare the shape instead.
 */
function normalizeMarkdown(markdown: string): string {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(/^\s*[*+-]\s+/gm, "- ")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** True when `content` is still an untouched template (or simply empty). */
export function isUntouchedTemplate(content: string): boolean {
  const normalized = normalizeMarkdown(content);
  if (normalized === "") return true;
  return Object.values(DOCUMENT_TEMPLATES).some(
    (template) => normalizeMarkdown(template) === normalized
  );
}
