# Thunderlab Knowledge Base — Project Status

Terakhir diperbarui: 2026-10-18 oleh Jules (software engineer), berdasarkan implementasi model Collection → Document dan service layer.

Dokumen ini adalah snapshot. Agent wajib memeriksa GitHub (branch, commit, PR, Vercel) sebelum mempercayai isinya.

---

## Kondisi Repo

- `main`: berisi base UI prototype dan struktur dasar project.
- Branch `feat/schema-collection-document`:
  - Schema Prisma diselaraskan ke model Collection → Document (`prisma/schema.prisma`).
  - Migrasi `prisma/migrations/0_init/migration.sql` diperbarui dari schema baru.
  - Lapisan service `src/lib/services/collections.ts` dan `src/lib/services/documents.ts` dibuat.
  - Seed idempoten `prisma/seed.ts` dibuat (runner `tsx`).
  - Script build dikonfigurasi untuk `prisma migrate deploy && prisma db seed && next build`.

## Yang Sudah Ada

- Halaman UI prototype: `/`, `/search`, `/collections`, `/collections/[slug]`, `/docs/[slug]`, `/favorites`, `/recent`, `/login`
- Komponen layout: Sidebar, MobileNav, UserMenu, ThemeToggle
- `prisma/schema.prisma` + `prisma/migrations/0_init/migration.sql` (Model Collection → Document)
- `src/lib/db.ts` (Prisma client singleton)
- `src/lib/services/collections.ts` & `src/lib/services/documents.ts` (Read services dengan filter `PUBLISHED`)
- `prisma/seed.ts` (Seed idempoten data awal)
- Auth context dan ProtectedRoute berbasis **mock**

## Yang Masih Mock / Belum Ada

- **Halaman UI masih membaca `src/lib/mockData.ts`**. Menghubungkan UI ke `src/lib/services` adalah task berikutnya.
- Login masih mock, belum ada autentikasi sungguhan.
- Belum ada CRUD, editor, full-text search sungguhan, PWA, atau offline.

## Hasil Validasi yang Benar-benar Dijalankan

- `npm ci` — berhasil
- `npx prisma format` — formatted & verified
- `npm run lint` — bersih, tanpa error
- `npx tsc --noEmit` — bersih, tanpa error
- `npx next build` (langsung, tanpa `migrate deploy`/`seed` karena tidak ada DB lokal) — berhasil

Catatan: `npm run build` penuh (`prisma migrate deploy && prisma db seed && next build`) memerlukan koneksi PostgreSQL aktif (misal Neon) dan akan diverifikasi otomatis saat deploy ke Vercel.

## Pertanyaan Terbuka

1. Pilihan editor markdown: Tiptap atau MDXEditor?
2. Mekanisme autentikasi: belum diputuskan (kandidat: Auth.js / NextAuth dengan provider yang sesuai kebutuhan tim).
3. Jalur ekspor Obsidian (opsional, tahap akhir): via MacBook + Syncthing, atau tombol download.

## Langkah Berikutnya

1. Owner/Vercel melakukan deploy untuk menjalankan migrasi dan seed di database Neon.
2. Menghubungkan halaman UI ke `src/lib/services` menggantikan pemakaian `mockData.ts`.
3. Lanjut sesuai urutan di `project-context.md` bagian 7.

## Riwayat

- 2026-09-08 — `_AI_CONTEXT/` dibuat di `main`
- 2026-09-19 — PR #1 (plan), #2, #3, #4 (prototype UI, deploy fix, dark mode, mock login)
- 2026-09-29 — PR #5 (Prisma schema + migrasi awal)
- 2026-10-18 — Audit kondisi repo; keputusan arsitektur opsi B dan urutan implementasi disepakati
- 2026-10-18 — Konfigurasi build Vercel-ready dengan script `postinstall` (`prisma generate`) dan verifikasi skenario build tanpa/dengan `DATABASE_URL`
- 2026-10-18 — Model Prisma diganti ke Collection → Document, service layer & seed idempoten ditambahkan, script build Vercel diperbarui untuk running migration + seed.
