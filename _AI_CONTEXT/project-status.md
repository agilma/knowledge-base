# Thunderlab Knowledge Base — Project Status

Terakhir diperbarui: 2026-10-18 oleh Jules (software engineer), setelah menghubungkan UI ke lapisan service Prisma, merender markdown, dan memperbarui bahasa UI.

Dokumen ini adalah snapshot. Agent wajib memeriksa GitHub (branch, commit, PR, Vercel) sebelum mempercayai isinya.

---

## Kondisi Repo

- `main`: berisi base UI prototype dan struktur dasar project.
- Branch `feat/pages-use-services`:
  - Schema Prisma diselaraskan ke model Collection → Document (`prisma/schema.prisma`).
  - Migrasi `prisma/migrations/0_init/migration.sql` diperbarui dari schema baru.
  - Lapisan service `src/lib/services/collections.ts` dan `src/lib/services/documents.ts` diperluas.
  - Seed idempoten `prisma/seed.ts` dibuat (runner `tsx`).
  - Halaman UI (`/`, `/collections`, `/collections/[slug]`, `/docs/[slug]`, `/search`, `/favorites`, `/recent`) sudah terhubung ke database via `src/lib/services/`.
  - Konten markdown dirender menggunakan `react-markdown`, `remark-gfm`, dan `rehype-slug`.
  - Pencarian dilakukan secara server-side melalui `searchParams`.
  - `src/lib/mockData.ts` dan `src/lib/types.ts` telah dihapus total.
  - `vercel.json` ditambahkan di root untuk memastikan Vercel mendeteksi framework `nextjs` (memperbaiki masalah 404 pada Next.js 16.3.5).

## Yang Sudah Ada

- Halaman UI: `/`, `/search`, `/collections`, `/collections/[slug]`, `/docs/[slug]`, `/favorites`, `/recent`, `/login`
- Komponen layout: Sidebar, MobileNav, UserMenu, ThemeToggle
- `prisma/schema.prisma` + `prisma/migrations/0_init/migration.sql` (Model Collection → Document)
- `src/lib/db.ts` (Prisma client singleton)
- `src/lib/services/collections.ts` & `src/lib/services/documents.ts` (Read services dengan filter `PUBLISHED`)
- `src/components/document/MarkdownContent.tsx` + `src/lib/markdown.ts` (Render markdown & ekstraksi heading TOC)
- `prisma/seed.ts` (Seed idempoten data awal)
- `vercel.json` (`"framework": "nextjs"`) untuk kestabilan deployment Vercel
- Auth context dan ProtectedRoute berbasis **mock**

## Yang Masih Mock / Belum Ada

- Login masih mock, belum ada autentikasi sungguhan (fitur favorit dan riwayat tampilan belum persisten per user).
- Belum ada CRUD, editor, full-text search PostgreSQL lanjutan, PWA, atau offline.

## Hasil Validasi yang Benar-benar Dijalankan

- `npm ci` — berhasil
- `npm run lint` — bersih, tanpa error
- `npx tsc --noEmit` — bersih, tanpa error
- `npx next build` (langsung, tanpa `migrate deploy`/`seed` karena `force-dynamic` digunakan sehingga build tidak mengakses database) — berhasil
- `grep -r "mockData\|lib/types" src` — hasil **kosong** (0 match)

## Catatan Deploy Vercel (Penyebab 404 & Solusi)

Sebelumnya Vercel gagal mendeteksi framework preset untuk Next.js 16.3.5, sehingga hasil deploy mengembalikan 404 pada semua halaman meski build sukses.
Masalah tersebut telah diperbaiki dengan:
1. Mengatur Framework Preset ke **Next.js** di Dashboard Settings Vercel.
2. Menambahkan file `vercel.json` di root repository dengan isi:
   ```json
   {
     "framework": "nextjs"
   }
   ```

## Pertanyaan Terbuka

1. Pilihan editor markdown: Tiptap atau MDXEditor?
2. Mekanisme autentikasi: belum diputuskan (kandidat: Auth.js / NextAuth dengan provider yang sesuai kebutuhan tim).
3. Jalur ekspor Obsidian (opsional, tahap akhir): via MacBook + Syncthing, atau tombol download.

## Langkah Berikutnya

1. Autentikasi sungguhan + RBAC (VIEWER / EDITOR / ADMIN)
2. CRUD Document / Collection + editor markdown
3. Search (PostgreSQL full-text)
4. Favorit & Recent persisten per user
5. Lanjut sesuai urutan di `project-context.md` bagian 7.

## Riwayat

- 2026-09-08 — `_AI_CONTEXT/` dibuat di `main`
- 2026-09-19 — PR #1 (plan), #2, #3, #4 (prototype UI, deploy fix, dark mode, mock login)
- 2026-09-29 — PR #5 (Prisma schema + migrasi awal)
- 2026-10-18 — Audit kondisi repo; keputusan arsitektur opsi B dan urutan implementasi disepakati
- 2026-10-18 — Konfigurasi build Vercel-ready dengan script `postinstall` (`prisma generate`) dan verifikasi skenario build tanpa/dengan `DATABASE_URL`
- 2026-10-18 — Model Prisma diganti ke Collection → Document, service layer & seed idempoten ditambahkan, script build Vercel diperbarui untuk running migration + seed.
- 2026-10-18 — UI terhubung penuh ke Prisma services, mockData & types dihapus, markdown rendering dengan react-markdown & remark-gfm, searchParams server component, UI berbahasa Indonesia, dan vercel.json ditambahkan.
