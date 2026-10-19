# Thunderlab Knowledge Base — Project Status

Terakhir diperbarui: 2026-10-19 oleh Jules (software engineer), setelah mengimplementasikan Rich-Text Markdown Editor menggunakan MDXEditor (`@mdxeditor/editor` `^4.3.3`).

Dokumen ini adalah snapshot. Agent wajib memeriksa GitHub (branch, commit, PR, Vercel) sebelum mempercayai isinya.

---

## Kondisi Repo

- `main`: berisi CRUD Koleksi & Dokumen, autentikasi Google OAuth v5, proxy Next.js 16, helper session RBAC, serta baca data dari Prisma services.
- Branch `feat/rich-text-markdown-editor`:
  - Mengintegrasikan MDXEditor (`@mdxeditor/editor` `^4.3.3`) menggantikan textarea mentah di `MarkdownEditor.tsx` tanpa mengubah antarmuka props atau `DocumentForm.tsx`.
  - Memuat editor secara dinamis dengan `next/dynamic` (`ssr: false`) dan skeleton fallback.
  - Mendukung GFM: Headings, Bold, Italic, List (peluru, nomor, checklist), Link, Quote, Kode inline, Blok Kode (CodeMirror), dan Tabel GFM.
  - Sediakan tombol "Mode Markdown" untuk mengedit markdown mentah dan penanganan *error boundary* yang otomatis jatuh kembali (*fallback*) ke textarea mentah jika terdapat sintaks tidak didukung.
  - Menyesuaikan warna & gaya editor dengan variabel CSS project (`globals.css` / `markdown-editor.css`) termasuk dark mode dan responsivitas layar HP Android (~380px).

## Yang Sudah Ada

- Rich-Text Markdown Editor (`MDXEditor` + Mode Markdown mentah)
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

- Pengelolaan relasi antar-dokumen ("Pengetahuan Terkait").
- Fitur favorit dan riwayat tampilan belum dipersistenkan per user ke database.
- Belum ada PostgreSQL full-text search lanjutan, PWA, atau offline storage.

## Hasil Validasi yang Benar-benar Dijalankan

- `npm ci` — berhasil
- `npm run lint` — bersih, tanpa error (0 error)
- `npx tsc --noEmit` — bersih, tanpa error (0 error)
- `npx next build` — berhasil
- Pengujian round-trip markdown (`pos-gagal-closing`, tabel GFM, blok kode) — berhasil tanpa kehilangan makna semantik.

## Langkah Berikutnya

1. Merge PR `feat/rich-text-markdown-editor` setelah review owner.
2. Pengelolaan relasi antar-dokumen ("Pengetahuan Terkait").
3. Search (PostgreSQL full-text).
4. Favorit & Recent persisten per user.
5. Lanjut sesuai urutan di `project-context.md` bagian 9.

## Riwayat

- 2026-09-08 — `_AI_CONTEXT/` dibuat di `main`
- 2026-09-19 — PR #1 (plan), #2, #3, #4 (prototype UI, deploy fix, dark mode, mock login)
- 2026-09-29 — PR #5 (Prisma schema + migrasi awal)
- 2026-10-18 — Audit kondisi repo; keputusan arsitektur opsi B dan urutan implementasi disepakati
- 2026-10-18 — UI terhubung penuh ke Prisma services, mockData & types dihapus, markdown rendering dengan react-markdown & remark-gfm, searchParams server component, UI berbahasa Indonesia, dan vercel.json ditambahkan.
- 2026-10-19 — Autentikasi Google OAuth sungguhan (Auth.js v5 + Prisma adapter), domain restriction, ADMIN role bootstrap, route proxy protection Next.js 16, dan pembersihan total mock auth.
- 2026-10-19 — CRUD Koleksi & Dokumen dengan validasi Zod, proteksi server actions RBAC, komponen form & markdown editor, serta visibilitas draf untuk editor/admin.
- 2026-10-19 — Rich-Text Markdown Editor (`MDXEditor` `^4.3.3`) dengan mode markdown mentah, fallback error handling, tema token CSS/dark mode, dan responsivitas HP Android.
