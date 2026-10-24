# Katalog Fitur

Status: **selesai** · **sebagian** (ada yang belum) · **direncanakan**

Tambahkan atau ubah satu baris di sini setiap kali sebuah fitur masuk. Detail
rencana per fase ada di bagian bawah.

## Sudah berjalan

| Fitur | Status | Kode | Catatan |
| --- | --- | --- | --- |
| Login Google (Auth.js v5) | selesai | `src/auth.ts`, `src/proxy.ts` | Akses dibatasi `AUTH_ALLOWED_DOMAIN` dan `AUTH_ALLOWED_EMAILS` |
| Peran VIEWER / EDITOR / ADMIN | selesai | `src/lib/auth/session.ts` | ADMIN otomatis lewat `AUTH_ADMIN_EMAILS` |
| Koleksi: buat, ubah, arsip | selesai | `src/app/collections/`, `src/lib/services/collections.ts` | |
| Dokumen: buat, ubah, terbit, arsip | selesai | `src/app/docs/`, `src/lib/services/documents.ts` | Tipe: Panduan, Masalah, Referensi. Status: Draf, Terbit, Arsip |
| Template per tipe dokumen | selesai | `src/lib/document-templates.ts` | Kerangka bagian untuk tiap tipe |
| Editor rich-text + mode markdown | selesai | `src/components/editor/`, `src/components/document/MarkdownEditor.tsx`, `src/lib/editor-content.ts` | Tiptap (ProseMirror) ala Outline: tampilan langsung WYSIWYG, ketikan markdown (`## `, `- `, `**tebal**`) langsung menjadi format, menu `/` untuk menyisipkan blok (judul, daftar, centang, kutipan, kode, tabel, garis), toolbar yang menempel di atas keyboard HP. Isi tetap disimpan sebagai markdown (tanpa migrasi). Baris kosong dari Enter berlebih tidak disimpan. Dokumen yang memuat sintaks yang akan berubah atau hilang bila disimpan ulang dari editor visual (gambar, catatan kaki, HTML mentah, pagar kode bersarang, karakter yang di-escape, daftar yang dipisah baris kosong) otomatis dibuka dalam Mode Markdown dengan penjelasan, supaya tidak ada yang hilang. Tombol **Mode Markdown** tetap ada. Belum ada: gambar (menunggu object storage), kolaborasi real-time, toolbar melayang di dekat teks terpilih |
| Draf lokal otomatis | selesai | `src/components/document/DocumentForm.tsx` | Draf yang hanya beda format dari versi tersimpan tidak disimpan dan tidak memunculkan banner |
| Test otomatis dan CI | selesai | `npm test`, `.github/workflows/ci.yml` | Aturan route service worker, izin login, normalisasi markdown. CI: lint, tsc, test, build |
| Validasi env | selesai | `src/lib/env.ts` | Kredensial Google kosong memberi pesan yang menyebut nama variabelnya. `DATABASE_URL` yang hilang atau salah format sudah memberi galat jelas dari Prisma (diperiksa), jadi tidak divalidasi ulang |
| Pencarian full-text | selesai | `src/app/search/page.tsx`, `searchDocuments` di `documents.ts`, `src/lib/search-query.ts`, migrasi `3_fulltext_search` | Postgres full-text (`tsvector` + GIN, stemmer Indonesia): kata berimbuhan cocok, urut menurut relevansi, kutip untuk frasa, filter jenis dan koleksi, kata cocok disorot. Maksimal 50 hasil teratas |
| Pengetahuan Terkait | selesai | `src/components/document/RelatedDocumentsPicker.tsx`, `src/lib/related.ts`, `getRelatedDocuments`/`setRelatedDocuments` di `documents.ts` | Editor memilih dokumen terkait di form (cari judul, maksimal 20). Hubungannya dua arah dan satu pasangan satu baris. Pembaca hanya melihat dokumen terbit. Pilihan terkait belum ikut draf lokal otomatis |
| PWA dan offline-baca | selesai | `src/app/sw.ts`, `src/app/manifest.ts` | Halaman yang pernah dibuka bisa dibaca offline |
| Penjaga offline pada form | selesai | `src/lib/use-online-status.ts` | Tombol simpan nonaktif saat offline |
| Mode terang / gelap | selesai | `src/components/theme/` | |
| Identitas aplikasi (nama, logo, favicon) | selesai | `src/components/brand/Mark.tsx` | PR #19 |
| Halaman galat, tidak ditemukan, dan memuat | selesai | `src/app/error.tsx`, `global-error.tsx`, `not-found.tsx`, `loading.tsx` | Pesan berbahasa Indonesia, membedakan offline dari galat server |
| Favorit per pengguna | selesai | `src/lib/services/favorites.ts`, `src/components/document/FavoriteButton.tsx`, `src/app/favorites/page.tsx` | Tombol di halaman dokumen; draf dan arsip hanya muncul untuk editor/admin; nonaktif saat offline; halaman `/favorites` tidak di-cache service worker (data pribadi) |
| Terakhir dibuka per pengguna | selesai | `src/lib/services/recent-views.ts`, `src/components/document/RecordView.tsx`, `src/app/recent/page.tsx` | Dicatat dari klien setelah halaman tampil (bukan saat prefetch); satu baris per dokumen (aman terhadap dua permintaan bersamaan), 50 terbaru disimpan dan ditampilkan; `/recent` tidak di-cache service worker |
| Daftar isi dan tautan ke bagian | selesai | `src/lib/markdown.ts`, `src/components/document/TableOfContents.tsx`, `SectionHeading.tsx`, `src/app/docs/[slug]/page.tsx` | Bagian (`##`) dan sub-bagian (`###`); kolom samping di layar lebar, lipatan di atas teks di HP; ikon salin tautan di setiap judul bagian. Id sama dengan yang dibuat halaman, termasuk judul kembar, dan baris di dalam blok kode tidak dihitung |
| Tanggal konsisten (zona Jakarta) | selesai | `src/lib/format.ts` | Server (UTC) dan browser menampilkan hari yang sama di dekat tengah malam |
| Cache offline per pemilik | selesai | `src/lib/cache-owner.ts`, `src/components/layout/CacheGuard.tsx`, `src/lib/sw-routes.ts` | Cache halaman dikosongkan bila orang atau perannya di browser berganti, supaya draf yang dibuka editor tidak terlihat oleh pengguna berikutnya; `/search` tidak di-cache. Masih terbuka bagi orang yang belum login di perangkat itu (lihat `TODO.md`) |
| Penyunting terakhir dan riwayat revisi | selesai | `prisma/migrations/4_document_revisions`, `src/lib/services/revisions.ts`, `src/lib/revisions.ts`, `src/app/docs/[slug]/history/` | Halaman dokumen menampilkan "diperbarui ... oleh ..."; editor/admin membuka Riwayat (daftar versi, selisih karakter) dan melihat isi tiap versi (hanya baca). Simpan yang tidak mengubah isi tidak mencatat versi; maksimal 100 versi per dokumen. Perubahan status (terbitkan, arsipkan, kembali ke draf) juga menjadi versi dengan label di daftar ("Diterbitkan", "Diarsipkan", "Dikembalikan ke draf"); status yang sama tidak dicatat, dan perubahan status bersama teks hanya satu versi. Karena tiap perubahan status menyalin isi dan ikut batas 100, dokumen yang sering berganti status mendorong versi teks lama keluar lebih cepat. Memulihkan versi belum ada |
| Penolakan izin yang jelas | selesai | `src/app/akses-ditolak/`, `requireRole` di `src/lib/auth/session.ts` | VIEWER yang mencoba aksi EDITOR melihat penjelasan, bukan dilempar ke beranda |

## Dipertimbangkan (belum diputuskan dipakai atau tidak)

### Ekspor dokumen ke `.md` di GitHub
Status: **ide**, 24 Okt 2026; pemilik belum memutuskan akan dipakai. Belum ada kode. Catatan rancangan
supaya tidak dibahas dari nol:

- Tujuannya belum dipilih: **cadangan di luar database** atau **bisa dibaca di Obsidian**. Cadangan
  cukup dengan ekspor sederhana; untuk Obsidian struktur (folder per koleksi, tautan antar dokumen) perlu dirancang.
- Satu arah, database ke Git. Kalau berkas diedit di GitHub, database tidak ikut berubah, jadi repo harus
  tertulis sebagai hasil ekspor.
- Repo privat terpisah dari repo kode (isinya prosedur internal).
- Semua dokumen bukan draf, bukan hanya yang diarsipkan, dengan status di frontmatter (judul, slug, jenis,
  koleksi, status, tanggal, penyunting) agar bisa diimpor kembali dan dokumen yang dibuka dari arsip tidak jadi kasus khusus.
- Urutan yang dianjurkan: (1) tombol **Ekspor** khusus admin yang mengunduh zip `.md`, tanpa infrastruktur
  dan tanpa token; (2) baru kemudian sinkronisasi terjadwal ke repo privat, yang butuh token GitHub dan
  tempat menyimpan rahasia, dan sebaiknya berjalan sebagai pekerjaan terpisah, bukan dari tombol Arsipkan
  (GitHub bisa gagal atau lambat saat tombol ditekan).

### Kolaborasi real-time di editor
Status: **ide**, 24 Okt 2026. Editor sekarang (Tiptap/ProseMirror) bisa dikembangkan ke penyuntingan bersama lewat
Yjs, tetapi butuh server WebSocket yang tetap hidup (Hocuspocus atau sejenisnya); Vercel serverless tidak cocok
untuk itu. Belum ada kode. Cukup bernilai hanya bila sering ada dua editor di dokumen yang sama pada saat yang sama;
saat ini penyunting terakhir dan riwayat sudah menutup kebutuhan "siapa mengubah apa".

## Direncanakan

### Fase 0 — Jaring pengaman
Sudah: pesan penolakan izin, halaman `error`/`not-found`/`loading`, banner draf palsu, validasi env Google, test (`npm test`), dan CI GitHub Actions (hijau di PR #21; belum diwajibkan lewat branch protection).
Belum: hydration error #418 (tidak bisa direproduksi lokal, lihat `TODO.md`) dan pemisahan database Preview.

### Fase 1 — Mudah dipakai
Pencarian full-text Postgres dengan filter dan sorotan hasil (sudah) · UI Pengetahuan
Terkait (sudah) · penyunting terakhir dan
riwayat revisi (sudah; pemulihan versi belum). Penanda kesegaran dibatalkan (lihat "Diputuskan tidak dikerjakan").

### Fase 2 — Lampiran
Object storage untuk gambar dan file, upload dari editor, dan cache gambar untuk
baca offline.

### Fase 3 — Jika terbukti perlu
Redis (rate limit, antrean), ekspor cermin Obsidian, antrean sinkron tulis-offline.

## Diputuskan tidak dikerjakan

### Penanda kesegaran dokumen ("perlu ditinjau")
Diputuskan pemilik 24 Okt 2026: **tidak dibangun.** Alasannya: dokumen prosedur diperbarui bersamaan
dengan perubahan di POS, jadi dokumen yang usang tanpa disadari tidak diperkirakan terjadi, dan
penanda tinjau hanya menambah pekerjaan. Rancangan yang sempat dibahas, bila suatu hari dibutuhkan lagi:
`reviewedAt` dan `reviewedById` di `documents` (migrasi aditif), pemilik = pembuat dokumen (`authorId`,
tanpa kolom baru), ambang 90 hari terhitung dari yang terbaru antara tanggal tinjau dan tanggal
diperbarui, hanya dokumen terbit yang ditandai, EDITOR/ADMIN bisa menandai "sudah ditinjau"
tanpa mengubah tanggal "Diperbarui", plus halaman "Perlu Ditinjau" khusus editor.
