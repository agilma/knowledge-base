# Thunderlab Knowledge Base — Project Status

Terakhir diperbarui: 2026-10-19 oleh Jules (software engineer), setelah mengimplementasikan CRUD Koleksi & Dokumen dengan validasi Zod dan proteksi hak akses berbasis role (RBAC).

Dokumen ini adalah snapshot. Agent wajib memeriksa GitHub (branch, commit, PR, Vercel) sebelum mempercayai isinya.

---

## Kondisi Repo

- `main`: berisi autentikasi Google OAuth v5, proxy Next.js 16, helper session RBAC, serta baca data dari Prisma services.
- Branch `feat/crud-collections-documents`:
  - Mengimplementasikan CRUD lengkap untuk Koleksi (`/collections/new`, `/collections/[slug]/edit`) dan Dokumen (`/docs/new`, `/docs/[slug]/edit`).
  - Skema validasi Zod ditambahkan di `src/lib/validation/collection.ts` dan `src/lib/validation/document.ts`.
  - Utility slugify di `src/lib/slug.ts` dengan dukungan penguncian slug pada server/service jika dokumen pernah/sedang PUBLISHED.
  - Penegakan hak akses berbasis role di Server Actions (`src/app/collections/actions.ts` dan `src/app/docs/actions.ts`) serta server components.
  - Komponen UI dasar baru: `Label`, `Textarea`, `Select`, `MarkdownEditor` (titik ganti editor rich-text), `CollectionForm`, `DocumentForm`, `CollectionActions`, dan `DocumentActions`.
  - Visibilitas draf & arsip dengan badge status khusus untuk EDITOR & ADMIN, serta penanganan `notFound()` untuk VIEWER.

## Yang Sudah Ada

- CRUD Koleksi & Dokumen dengan validasi Zod dan proteksi server actions RBAC
- Autentikasi Google OAuth dengan Auth.js v5 + `@auth/prisma-adapter`
- Proteksi rute via `src/proxy.ts` (Next.js 16)
- Pembatasan domain & allowlist email untuk login internal
- Role bootstrap (`ADMIN` via `AUTH_ADMIN_EMAILS`)
- Halaman UI: `/`, `/search`, `/collections`, `/collections/[slug]`, `/collections/new`, `/collections/[slug]/edit`, `/docs/[slug]`, `/docs/new`, `/docs/[slug]/edit`, `/favorites`, `/recent`, `/login`
- Komponen layout: Sidebar, MobileNav, UserMenu, ThemeToggle
- `prisma/schema.prisma` + migrasi `0_init` & `1_auth`
- `src/lib/db.ts` (Prisma client singleton)
- `src/lib/services/collections.ts` & `src/lib/services/documents.ts` (Read/Write services)
- `src/components/document/MarkdownContent.tsx` + `src/lib/markdown.ts`
- `prisma/seed.ts` (Seed idempoten data awal)
- `vercel.json` (`"framework": "nextjs"`)

## Yang Masih Belum Ada / Belum Dikerjakan

- Belum ada editor rich-text (Tiptap / MDXEditor) — akan menggantikan `MarkdownEditor`.
- Pengelolaan relasi antar-dokumen ("Pengetahuan Terkait").
- Fitur favorit dan riwayat tampilan belum dipersistenkan per user ke database.
- Belum ada PostgreSQL full-text search lanjutan, PWA, atau offline storage.

## Hasil Validasi yang Benar-benar Dijalankan

- `npm ci` — berhasil
- `npx prisma validate` — berhasil
- `npm run lint` — bersih, tanpa error
- `node node_modules/typescript/lib/tsc.js --noEmit` — bersih, tanpa error
- `npx next build` **tanpa** env secrets `AUTH_*` dan `DATABASE_URL` — berhasil
- `grep -rn "lib/db" src --include=*.ts --include=*.tsx` — hanya menghasilkan `src/auth.ts:4:import { db } from "@/lib/db";`

## Pertanyaan Terbuka

1. Pilihan editor markdown: Tiptap atau MDXEditor?
2. Jalur ekspor Obsidian (opsional, tahap akhir): via MacBook + Syncthing, atau tombol download.

## Langkah Berikutnya

1. Merge PR `feat/crud-collections-documents` setelah review owner.
2. Integrasi Rich-Text Editor (Tiptap / MDXEditor) menggantikan `MarkdownEditor`.
3. Pengelolaan relasi antar-dokumen ("Pengetahuan Terkait").
4. Search (PostgreSQL full-text).
5. Favorit & Recent persisten per user.
6. Lanjut sesuai urutan di `project-context.md` bagian 9.

## Riwayat

- 2026-09-08 — `_AI_CONTEXT/` dibuat di `main`
- 2026-09-19 — PR #1 (plan), #2, #3, #4 (prototype UI, deploy fix, dark mode, mock login)
- 2026-09-29 — PR #5 (Prisma schema + migrasi awal)
- 2026-10-18 — Audit kondisi repo; keputusan arsitektur opsi B dan urutan implementasi disepakati
- 2026-10-18 — UI terhubung penuh ke Prisma services, mockData & types dihapus, markdown rendering dengan react-markdown & remark-gfm, searchParams server component, UI berbahasa Indonesia, dan vercel.json ditambahkan.
- 2026-10-19 — Autentikasi Google OAuth sungguhan (Auth.js v5 + Prisma adapter), domain restriction, ADMIN role bootstrap, route proxy protection Next.js 16, dan pembersihan total mock auth.
- 2026-10-19 — CRUD Koleksi & Dokumen dengan validasi Zod, proteksi server actions RBAC, komponen form & markdown editor, serta visibilitas draf untuk editor/admin.
