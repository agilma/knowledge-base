# Knowledge Base — Project Status

Terakhir diperbarui: 2026-10-23, setelah merge PR #19 (identitas aplikasi) dan #20 (backlog), dan penyusunan folder `docs/`.

Dokumen ini adalah snapshot. Agent wajib memeriksa GitHub (branch, commit, PR, Vercel) sebelum mempercayai isinya.

Katalog fitur yang selalu diperbarui: [`docs/FEATURES.md`](../docs/FEATURES.md). Backlog: [`TODO.md`](../TODO.md).

---

## Kondisi Repo

- `main` berisi CRUD Koleksi & Dokumen, login Google (Auth.js v5), proxy Next.js 16, RBAC, PWA offline-baca, draf lokal, pencarian full-text Postgres, Favorit dan Terakhir Dibuka per pengguna, template dokumen per tipe, dan identitas aplikasi "Knowledge Base".
- Production di Vercel region `sin1`, database Neon `ap-southeast-1`.
- CI GitHub Actions (`check`: lint, tsc, test, build) dan test `node:test` (`npm test`). Test berbasis database ada di `*.integration.test.ts`, dilewati di CI, dijalankan dengan `KB_DB_TESTS=1`.

## Belum ada

- Pemulihan versi dari riwayat revisi (riwayat bisa dibaca).
- Lampiran (object storage).
- `error.tsx`, `not-found.tsx`, `loading.tsx`.

## Rencana

Fase 0 (jaring pengaman), Fase 1 (mudah dipakai), Fase 2 (lampiran), Fase 3 (hanya jika perlu). Rinciannya di `docs/FEATURES.md`; keputusan infrastruktur (Redis ditunda, object storage diusulkan) di `docs/ARCHITECTURE.md`.

## Validasi terakhir yang benar-benar dijalankan

Pada branch `feat/own-identity` sebelum merge (2026-10-23): `npx tsc --noEmit` bersih, `npx eslint src` bersih, `npx next build --webpack` berhasil. `next build` tanpa `--webpack` gagal ("Call retries were exceeded"); script `build` memang memakai `--webpack`.

## Riwayat ringkas

- 2026-09 — konteks proyek, prototype UI, skema Prisma awal
- 2026-10-18/19 — UI terhubung ke Prisma, login Google, CRUD, editor MDX, PWA offline-baca, draf lokal
- 2026-10 — perbaikan performa dan offline, backlog `TODO.md`
- 2026-10-23 — identitas aplikasi (PR #19), backlog terverifikasi (PR #20), folder `docs/`
- 2026-10-24 — pencarian full-text, riwayat revisi dan status, editor Tiptap, koleksi terbatas (penegakan dan layar admin)
