# Thunderlab Knowledge Base — Project Status

Terakhir diperbarui: 2026-10-19 oleh Jules (software engineer), setelah perbaikan editor dark mode, penanganan offline guard pada form, dan draf lokal autosave/restore pada form dokumen.

Dokumen ini adalah snapshot. Agent wajib memeriksa GitHub (branch, commit, PR, Vercel) sebelum mempercayai isinya.

---

## Kondisi Repo

- `main`: berisi CRUD Koleksi & Dokumen, autentikasi Google OAuth v5, proxy Next.js 16, helper session RBAC, PWA offline-baca, serta baca data dari Prisma services.
- Branch `fix/editor-dark-mode-offline-save`:
  - Mengimplementasikan penyesuaian tema dark mode MDXEditor 4.3.2 melalui pemetaan variabel CSS internal (`--baseBg`, `--baseText`, `--baseBorder`, `--accentBg`, dll.) ke design tokens project di `markdown-editor.css` dan penerapan class `dark-theme` dari `next-themes` pada `InitializedMDXEditor.tsx`.
  - Membuat hook `useOnlineStatus` di `src/lib/use-online-status.ts` dan merefaktor `OfflineIndicator.tsx`.
  - Menambahkan guard offline pada `DocumentForm` & `CollectionForm` untuk menonaktifkan tombol submit saat offline, memblokir pengiriman via Enter, serta menangkap error jaringan client tanpa error page browser.
  - Menambahkan fitur draf lokal (`localStorage`) otomatis dengan debounce ~1 detik pada `DocumentForm` (`kb:draft:doc:<id>` / `kb:draft:doc:new:<collection>`), banner pemulihan draf ("Pulihkan" / "Buang"), dan pembersihan otomatis saat form berhasil disimpan.

## Yang Sudah Ada

- Editor Dark Mode & Pemetaan CSS Variables MDXEditor
- Simpan saat Offline (Guard Offline & Draf Lokal `localStorage`)
- PWA & Offline-Baca (Serwist, Web App Manifest, Service Worker, Offline Banner, Auto-Refresh, Logout Cache Purge)
- Rich-Text Markdown Editor (`MDXEditor` + Mode Markdown mentah)
- CRUD Koleksi & Dokumen dengan validasi Zod dan proteksi server actions RBAC
- Autentikasi Google OAuth dengan Auth.js v5 + `@auth/prisma-adapter`
- Proteksi rute via `src/proxy.ts` (Next.js 16)
- Pembatasan domain & allowlist email untuk login internal
- Role bootstrap (`ADMIN` via `AUTH_ADMIN_EMAILS`)
- Halaman UI: `/`, `/search`, `/collections`, `/collections/[slug]`, `/collections/new`, `/collections/[slug]/edit`, `/docs/[slug]`, `/docs/new`, `/docs/[slug]/edit`, `/favorites`, `/recent`, `/login`, `/offline`
- Komponen layout: Sidebar, MobileNav, UserMenu, ThemeToggle, OfflineIndicator
- `prisma/schema.prisma` + migrasi `0_init` & `1_auth`
- `src/lib/db.ts` (Prisma client singleton)
- `src/lib/services/collections.ts` & `src/lib/services/documents.ts` (Read/Write services)
- `src/components/document/MarkdownContent.tsx` + `src/lib/markdown.ts`
- `prisma/seed.ts` (Seed idempoten data awal)
- `vercel.json` (`"framework": "nextjs"`)

## Yang Masih Belum Ada / Belum Dikerjakan

- Pengelolaan relasi antar-dokumen ("Pengetahuan Terkait").
- Fitur favorit dan riwayat tampilan belum dipersistenkan per user ke database.
- Belum ada PostgreSQL full-text search lanjutan atau antrian sinkron otomatis offline-tulis.

## Hasil Validasi yang Benar-benar Dijalankan

- `npm ci` — berhasil
- `npm run lint` — bersih, tanpa error (0 error)
- `npx tsc --noEmit` — bersih, tanpa error (0 error)
- `npx next build --webpack` — berhasil (menghasilkan Service Worker `public/sw.js` & `manifest.webmanifest`)

## Langkah Berikutnya

1. Merge PR `fix/editor-dark-mode-offline-save` setelah review owner.
2. Pengelolaan relasi antar-dokumen ("Pengetahuan Terkait").
3. Search (PostgreSQL full-text).
4. Favorit & Recent persisten per user.
5. Lanjut sesuai urutan di `project-context.md` bagian 10.

## Riwayat

- 2026-09-08 — `_AI_CONTEXT/` dibuat di `main`
- 2026-09-19 — PR #1 (plan), #2, #3, #4 (prototype UI, deploy fix, dark mode, mock login)
- 2026-09-29 — PR #5 (Prisma schema + migrasi awal)
- 2026-10-18 — Audit kondisi repo; keputusan arsitektur opsi B dan urutan implementasi disepakati
- 2026-10-18 — UI terhubung penuh ke Prisma services, mockData & types dihapus, markdown rendering dengan react-markdown & remark-gfm, searchParams server component, UI berbahasa Indonesia, dan vercel.json ditambahkan.
- 2026-10-19 — Autentikasi Google OAuth sungguhan (Auth.js v5 + Prisma adapter), domain restriction, ADMIN role bootstrap, route proxy protection Next.js 16, dan pembersihan total mock auth.
- 2026-10-19 — CRUD Koleksi & Dokumen dengan validasi Zod, proteksi server actions RBAC, komponen form & markdown editor, serta visibilitas draf untuk editor/admin.
- 2026-10-19 — Rich-Text Markdown Editor (`MDXEditor` `4.3.2`) dengan mode markdown mentah, fallback error handling, tema token CSS/dark mode, dan responsivitas HP Android.
- 2026-10-19 — PWA & Offline-Baca dengan Serwist (`9.5.13`), Web App Manifest (`manifest.ts`), ikon kustom 192/512/SVG, Service Worker NetworkFirst strategy, offline page & indicator banner, auto-refresh on reconnect, dan logout cache purge.
- 2026-10-19 — Perbaikan PWA hasil uji Android: ikon favicon kustom (`src/app/icon.png`), caching dokumen HTML di latar belakang saat navigasi client RSC, dan `GET /api/auth/session` NetworkFirst untuk menjaga status sesi offline.
- 2026-10-19 — Editor dark mode theme mapping (MDXEditor CSS variables) dan graceful offline handling dengan auto-save local draft (localStorage) pada DocumentForm.
