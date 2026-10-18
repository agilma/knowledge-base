# Thunderlab Knowledge Base — Project Status

Terakhir diperbarui: 2026-10-19 oleh Jules (software engineer), setelah mengimplementasikan autentikasi sungguhan Google OAuth dengan pembatasan domain dan bootstrap role ADMIN.

Dokumen ini adalah snapshot. Agent wajib memeriksa GitHub (branch, commit, PR, Vercel) sebelum mempercayai isinya.

---

## Kondisi Repo

- `main`: berisi base UI, lapisan service Prisma, dan render markdown.
- Branch `feat/google-auth`:
  - Mengimplementasikan Auth.js v5 (`next-auth@5.0.0-beta.32`) dan `@auth/prisma-adapter@2.11.3`.
  - Schema Prisma diperluas dengan model `Account`, `Session`, `VerificationToken`, serta field `emailVerified` & `image` pada `User`.
  - Migrasi `prisma/migrations/1_auth/migration.sql` ditambahkan tanpa mengubah `0_init`.
  - Konfigurasi `src/auth.ts` dengan Google OAuth, pembatasan domain (`AUTH_ALLOWED_DOMAIN` & `AUTH_ALLOWED_EMAILS`), dan bootstrap role `ADMIN` (`AUTH_ADMIN_EMAILS`).
  - Helper server session dibuat di `src/lib/auth/session.ts` (`getCurrentUser`, `requireUser`, `requireRole`).
  - Proteksi rute diimplementasikan di `src/proxy.ts` menggunakan konvensi Next.js 16.
  - Halaman login (`src/app/login/page.tsx`) dan `UserMenu.tsx` diperbarui untuk autentikasi Google sungguhan dan penanganan error bertulisan bahasa Indonesia.
  - Seluruh komponen auth mock (`auth-context.tsx`, `ProtectedRoute.tsx`) telah dihapus total.

## Yang Sudah Ada

- Autentikasi Google OAuth dengan Auth.js v5 + `@auth/prisma-adapter`
- Proteksi rute via `src/proxy.ts` (Next.js 16)
- Pembatasan domain & allowlist email untuk login internal
- Role bootstrap (`ADMIN` via `AUTH_ADMIN_EMAILS`)
- Halaman UI: `/`, `/search`, `/collections`, `/collections/[slug]`, `/docs/[slug]`, `/favorites`, `/recent`, `/login`
- Komponen layout: Sidebar, MobileNav, UserMenu, ThemeToggle
- `prisma/schema.prisma` + migrasi `0_init` & `1_auth`
- `src/lib/db.ts` (Prisma client singleton)
- `src/lib/services/collections.ts` & `src/lib/services/documents.ts` (Read services)
- `src/components/document/MarkdownContent.tsx` + `src/lib/markdown.ts`
- `prisma/seed.ts` (Seed idempoten data awal)
- `vercel.json` (`"framework": "nextjs"`)

## Yang Masih Belum Ada / Belum Dikerjakan

- Belum ada CRUD Document/Collection & editor markdown.
- Fitur favorit dan riwayat tampilan belum dipersistenkan per user ke database.
- Belum ada PostgreSQL full-text search lanjutan, PWA, atau offline storage.

## Hasil Validasi yang Benar-benar Dijalankan

- `npm ci` — berhasil
- `npx prisma validate` — berhasil
- `npm run lint` — bersih, tanpa error
- `npx tsc --noEmit` — bersih, tanpa error
- `npx next build` **tanpa** env secrets `AUTH_*` dan `DATABASE_URL` — berhasil
- `grep -r "auth-context\|ProtectedRoute" src` — hasil **kosong** (0 match)

## Pertanyaan Terbuka

1. Pilihan editor markdown: Tiptap atau MDXEditor?
2. Jalur ekspor Obsidian (opsional, tahap akhir): via MacBook + Syncthing, atau tombol download.

## Langkah Berikutnya

1. Merge PR `feat/google-auth` setelah review owner.
2. CRUD Document / Collection + editor markdown.
3. Search (PostgreSQL full-text).
4. Favorit & Recent persisten per user.
5. Lanjut sesuai urutan di `project-context.md` bagian 8.

## Riwayat

- 2026-09-08 — `_AI_CONTEXT/` dibuat di `main`
- 2026-09-19 — PR #1 (plan), #2, #3, #4 (prototype UI, deploy fix, dark mode, mock login)
- 2026-09-29 — PR #5 (Prisma schema + migrasi awal)
- 2026-10-18 — Audit kondisi repo; keputusan arsitektur opsi B dan urutan implementasi disepakati
- 2026-10-18 — UI terhubung penuh ke Prisma services, mockData & types dihapus, markdown rendering dengan react-markdown & remark-gfm, searchParams server component, UI berbahasa Indonesia, dan vercel.json ditambahkan.
- 2026-10-19 — Autentikasi Google OAuth sungguhan (Auth.js v5 + Prisma adapter), domain restriction, ADMIN role bootstrap, route proxy protection Next.js 16, dan pembersihan total mock auth.
