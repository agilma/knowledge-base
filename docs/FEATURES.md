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
| Editor rich-text + mode markdown | selesai | `src/components/document/` | MDXEditor, mendukung dark mode |
| Draf lokal otomatis | selesai | `src/components/document/DocumentForm.tsx` | Draf yang hanya beda format dari versi tersimpan tidak disimpan dan tidak memunculkan banner |
| Test otomatis dan CI | selesai | `npm test`, `.github/workflows/ci.yml` | Aturan route service worker, izin login, normalisasi markdown. CI: lint, tsc, test, build |
| Validasi env | selesai | `src/lib/env.ts` | Kredensial Google kosong memberi pesan yang menyebut nama variabelnya. `DATABASE_URL` yang hilang atau salah format sudah memberi galat jelas dari Prisma (diperiksa), jadi tidak divalidasi ulang |
| Pencarian | sebagian | `src/app/search/page.tsx`, `documents.ts` | Memakai `ILIKE`, melambat seiring data bertambah |
| Pengetahuan Terkait | sebagian | `getRelatedDocuments` di `documents.ts` | Tampil jika data relasi ada, belum ada UI untuk mengelola relasi |
| PWA dan offline-baca | selesai | `src/app/sw.ts`, `src/app/manifest.ts` | Halaman yang pernah dibuka bisa dibaca offline |
| Penjaga offline pada form | selesai | `src/lib/use-online-status.ts` | Tombol simpan nonaktif saat offline |
| Mode terang / gelap | selesai | `src/components/theme/` | |
| Identitas aplikasi (nama, logo, favicon) | selesai | `src/components/brand/Mark.tsx` | PR #19 |
| Halaman galat, tidak ditemukan, dan memuat | selesai | `src/app/error.tsx`, `global-error.tsx`, `not-found.tsx`, `loading.tsx` | Pesan berbahasa Indonesia, membedakan offline dari galat server |
| Favorit per pengguna | selesai | `src/lib/services/favorites.ts`, `src/components/document/FavoriteButton.tsx`, `src/app/favorites/page.tsx` | Tombol di halaman dokumen; draf dan arsip hanya muncul untuk editor/admin; nonaktif saat offline; halaman `/favorites` tidak di-cache service worker (data pribadi) |
| Terakhir dibuka per pengguna | selesai | `src/lib/services/recent-views.ts`, `src/components/document/RecordView.tsx`, `src/app/recent/page.tsx` | Dicatat dari klien setelah halaman tampil (bukan saat prefetch); satu baris per dokumen (aman terhadap dua permintaan bersamaan), 50 terbaru disimpan dan ditampilkan; `/recent` tidak di-cache service worker |
| Daftar isi dan tautan ke bagian | selesai | `src/lib/markdown.ts`, `src/components/document/TableOfContents.tsx`, `SectionHeading.tsx`, `src/app/docs/[slug]/page.tsx` | Bagian (`##`) dan sub-bagian (`###`); kolom samping di layar lebar, lipatan di atas teks di HP; ikon salin tautan di setiap judul bagian. Id sama dengan yang dibuat halaman, termasuk judul kembar, dan baris di dalam blok kode tidak dihitung |
| Tanggal konsisten (zona Jakarta) | selesai | `src/lib/format.ts` | Server (UTC) dan browser menampilkan hari yang sama di dekat tengah malam |
| Penolakan izin yang jelas | selesai | `src/app/akses-ditolak/`, `requireRole` di `src/lib/auth/session.ts` | VIEWER yang mencoba aksi EDITOR melihat penjelasan, bukan dilempar ke beranda |

## Direncanakan

### Fase 0 — Jaring pengaman
Sudah: pesan penolakan izin, halaman `error`/`not-found`/`loading`, banner draf palsu, validasi env Google, test (`npm test`), dan CI GitHub Actions (hijau di PR #21; belum diwajibkan lewat branch protection).
Belum: hydration error #418 (tidak bisa direproduksi lokal, lihat `TODO.md`) dan pemisahan database Preview.

### Fase 1 — Mudah dipakai
Pencarian full-text Postgres dengan filter dan sorotan hasil · UI Pengetahuan
Terkait · penyunting terakhir dan
riwayat revisi · penanda kesegaran (pemilik dan tanggal ditinjau).

### Fase 2 — Lampiran
Object storage untuk gambar dan file, upload dari editor, dan cache gambar untuk
baca offline.

### Fase 3 — Jika terbukti perlu
Redis (rate limit, antrean), ekspor cermin Obsidian, antrean sinkron tulis-offline.
