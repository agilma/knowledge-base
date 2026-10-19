# Thunderlab Knowledge Base — Project Status

Terakhir diperbarui: 2026-10-19 oleh Jules (software engineer), setelah perbaikan PWA hasil uji Android (favicon, background document HTML cache, dan offline auth session).

Dokumen ini adalah snapshot. Agent wajib memeriksa GitHub (branch, commit, PR, Vercel) sebelum mempercayai isinya.

---

## Kondisi Repo

- `main`: berisi CRUD Koleksi & Dokumen, autentikasi Google OAuth v5, proxy Next.js 16, helper session RBAC, serta baca data dari Prisma services.
- Branch `fix/pwa-android-issues`:
  - Mengganti favicon Vercel bawaan dengan ikon "T" kuning (`src/app/icon.png`) via konvensi file Next.js 16 metadata dan menambahkan `manifest: "/manifest.webmanifest"` di `layout.tsx`.
  - Mengimplementasikan caching dokumen HTML latar belakang pada `sw.ts` saat navigasi client RSC, dengan pencatatan `pages-rsc-cache` dan deduplikasi 5 menit.
  - Mengonfigurasi `GET /api/auth/session` ke `NetworkFirst` (cached di `pages-rsc-cache`, timeout 3s) agar status login pengguna tidak hilang saat offline, dan tetap dibersihkan saat logout.

## Yang Sudah Ada

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
- Belum ada PostgreSQL full-text search lanjutan atau offline-tulis/antrian sinkron.

## Hasil Validasi yang Benar-benar Dijalankan

- `npm ci` — berhasil
- `npm run lint` — bersih, tanpa error (0 error)
- `npx tsc --noEmit` — bersih, tanpa error (0 error)
- `npx next build --webpack` — berhasil (menghasilkan Service Worker `public/sw.js` & `manifest.webmanifest`)
- Pengujian Playwright & Visual Verification — berhasil (`/offline`, `/login`, `/manifest.webmanifest`).

## Langkah Berikutnya

1. Merge PR `feat/pwa-offline-read` setelah review owner.
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
