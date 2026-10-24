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
| Validasi env | sebagian | `src/lib/env.ts` | Kredensial Google kosong memberi pesan jelas; `DATABASE_URL` belum divalidasi |
| Pencarian full-text | selesai | `src/app/search/page.tsx`, `searchDocuments` di `documents.ts`, `src/lib/search-query.ts`, migrasi `3_fulltext_search` | Postgres full-text (`tsvector` + GIN, stemmer Indonesia): kata berimbuhan cocok, urut menurut relevansi, kutip untuk frasa, filter jenis dan koleksi, kata cocok disorot. Maksimal 50 hasil teratas |
| Pengetahuan Terkait | sebagian | `getRelatedDocuments` di `documents.ts` | Tampil jika data relasi ada, belum ada UI untuk mengelola relasi |
| PWA dan offline-baca | selesai | `src/app/sw.ts`, `src/app/manifest.ts` | Halaman yang pernah dibuka bisa dibaca offline |
| Penjaga offline pada form | selesai | `src/lib/use-online-status.ts` | Tombol simpan nonaktif saat offline |
| Mode terang / gelap | selesai | `src/components/theme/` | |
| Identitas aplikasi (nama, logo, favicon) | selesai | `src/components/brand/Mark.tsx` | PR #19 |
| Halaman galat, tidak ditemukan, dan memuat | selesai | `src/app/error.tsx`, `global-error.tsx`, `not-found.tsx`, `loading.tsx` | Pesan berbahasa Indonesia, membedakan offline dari galat server |
| Penolakan izin yang jelas | selesai | `src/app/akses-ditolak/`, `requireRole` di `src/lib/auth/session.ts` | VIEWER yang mencoba aksi EDITOR melihat penjelasan, bukan dilempar ke beranda |

## Halaman yang belum aktif

| Halaman | Status | Keterangan |
| --- | --- | --- |
| Favorit (`/favorites`) | direncanakan | Model `Favorite` ada, tapi halaman masih placeholder dan belum ada yang menulis datanya |
| Terakhir dilihat (`/recent`) | direncanakan | Model `RecentView` ada, belum ada yang menulis datanya |

## Direncanakan

### Fase 0 — Jaring pengaman
Sudah: pesan penolakan izin, halaman `error`/`not-found`/`loading`, banner draf palsu, validasi env Google, test (`npm test`), dan CI GitHub Actions (hijau di PR #21; belum diwajibkan lewat branch protection).
Belum: hydration error #418 (tidak bisa direproduksi lokal, lihat `TODO.md`) dan pemisahan database Preview.

### Fase 1 — Mudah dipakai
Pencarian full-text Postgres dengan filter dan sorotan hasil (sudah) · UI Pengetahuan
Terkait · Favorit dan Terakhir dilihat per pengguna · penyunting terakhir dan
riwayat revisi · penanda kesegaran (pemilik dan tanggal ditinjau) · daftar isi
dan tautan ke bagian.

### Fase 2 — Lampiran
Object storage untuk gambar dan file, upload dari editor, dan cache gambar untuk
baca offline.

### Fase 3 — Jika terbukti perlu
Redis (rate limit, antrean), ekspor cermin Obsidian, antrean sinkron tulis-offline.
