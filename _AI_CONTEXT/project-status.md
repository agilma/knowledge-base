# Thunderlab Knowledge Base — Project Status

Terakhir diperbarui: 2026-10-18 oleh Claude (planner), berdasarkan pemeriksaan langsung repo `agilma/knowledge-base`.

Dokumen ini adalah snapshot. Agent wajib memeriksa GitHub (branch, commit, PR, Vercel) sebelum mempercayai isinya.

---

## Kondisi Repo (terverifikasi 2026-10-18)

- `main`: hanya berisi `_AI_CONTEXT/` (4 dokumen prinsip) dan `.obsidian/`. Belum ada kode aplikasi.
- Ada 5 PR dari Jules, **belum ada yang di-merge** ke `main`:
  - PR #1 — Interactive Plan, tanpa perubahan kode
  - PR #2, #3, #4 — versi prototype yang sudah tergantikan oleh #5
  - **PR #5** — versi paling lengkap: UI prototype, tipografi, dark mode, mock login, Prisma schema + migrasi `0_init`
- PR #5 adalah superset dari #4 (diff hanya menambah file Prisma).

## Yang Sudah Ada (di PR #5)

- Halaman: `/`, `/search`, `/collections`, `/collections/[slug]`, `/docs/[slug]`, `/favorites`, `/recent`, `/login`
- Komponen layout: Sidebar, MobileNav, UserMenu, ThemeToggle
- `prisma/schema.prisma` + `prisma/migrations/0_init/migration.sql`
- `src/lib/db.ts` (Prisma client singleton)
- Auth context dan ProtectedRoute berbasis **mock**

## Yang Masih Mock / Belum Ada

- **Semua halaman masih membaca `src/lib/mockData.ts`**. Belum ada query ke database.
- Login masih mock, belum ada autentikasi sungguhan.
- Belum ada CRUD, editor, search sungguhan, PWA, atau offline.
- Belum pernah terverifikasi deploy di Vercel. `vercel.json` yang dibuat di PR #3 (fix 404) **tidak ada** di PR #5 — perlu dicek saat deploy.
- `package.json` masih bernama `temp-app`; `README.md` masih boilerplate create-next-app.

## Hasil Validasi yang Benar-benar Dijalankan (2026-10-18, branch PR #5)

- `npm ci` — berhasil
- `npx tsc --noEmit` — bersih, tanpa error
- `npx eslint src` — bersih, tanpa error
- `npm run build` — **gagal di lingkungan pemeriksa** karena tidak bisa mengakses Google Fonts dan binary Prisma (pembatasan jaringan sandbox), **bukan** karena error kode. Build di Vercel belum diverifikasi.

## Pertanyaan Terbuka

1. Relasi Solution ↔ Project: dipertahankan lewat Problem saja, atau ditambah relasi langsung?
2. Pilihan editor markdown: Tiptap atau MDXEditor?
3. Mekanisme autentikasi: belum diputuskan (kandidat: Auth.js / NextAuth dengan provider yang sesuai kebutuhan tim).
4. Jalur ekspor Obsidian (opsional, tahap akhir): via MacBook + Syncthing, atau tombol download.

## Langkah Berikutnya

1. Owner merge PR #5 ke `main`, tutup PR #1–#4 sebagai superseded.
2. Task Jules: tambah `_AI_CONTEXT/project-context.md` dan `project-status.md`, rename package, perbarui README.
3. Deploy ke Vercel + Neon, verifikasi build dan routing.
4. Lanjut sesuai urutan di `project-context.md` bagian 7.

## Riwayat

- 2026-09-08 — `_AI_CONTEXT/` dibuat di `main`
- 2026-09-19 — PR #1 (plan), #2, #3, #4 (prototype UI, deploy fix, dark mode, mock login)
- 2026-09-29 — PR #5 (Prisma schema + migrasi awal)
- 2026-10-18 — Audit kondisi repo; keputusan arsitektur opsi B dan urutan implementasi disepakati
