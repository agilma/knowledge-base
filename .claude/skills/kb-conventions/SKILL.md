---
name: kb-conventions
description: Konvensi kerja di repo Knowledge Base - aturan branch dan PR, dokumentasi wajib, struktur kode, urutan migrasi, perintah verifikasi, dan jebakan Next.js 16. Pakai di awal setiap tugas coding atau perubahan di repo ini.
---

# Konvensi Knowledge Base

Konteks lengkap ada di `_AI_CONTEXT/` (baca semua file) dan `docs/`. Ringkasan di bawah adalah hal yang
paling sering terlewat.

## Sebelum menulis kode

- `AGENTS.md` benar: **Next.js 16 di sini berbeda** dari yang umum. Baca bagian terkait di
  `node_modules/next/dist/docs/` sebelum menyentuh kode Next.js. Contoh: `src/proxy.ts` (bukan
  `middleware.ts`), `params` berupa Promise, error boundary menerima `retry()`.
- Jangan mengedit `AGENTS.md` atau `CLAUDE.md`: file itu di-generate ulang oleh `next dev`.
- Cari pola yang sudah ada dan pakai ulang. Akses data lewat `src/lib/services/`, bukan Prisma di
  komponen. Logika murni dipisah ke modul tersendiri agar bisa diuji (contoh: `src/lib/sw-routes.ts`,
  `src/lib/auth/access.ts`, `src/lib/user-documents.ts`).
- UI berbahasa Indonesia, minimalis (`_AI_CONTEXT/ui-ux-principles.md`).
- Jangan menambah dependency tanpa alasan di deskripsi PR. Test memakai `node:test` + `tsx`
  (`npm test`, berkas `src/**/*.test.ts`), bukan vitest/jest.

## Branch dan PR

- Kerjakan hanya di branch yang ditugaskan. Jangan push ke branch lain, jangan force push, jangan
  menghapus branch. Bila branch tugas sudah ter-merge, mulai ulang dari `origin/main` dengan nama sama
  (riwayat lama adalah leluhur `main`, jadi push-nya fast-forward tanpa force).
- Satu PR per perubahan yang koheren. Pakai `.github/pull_request_template.md` (bagian Ringkasan,
  Dokumentasi, Verifikasi). Dalam Verifikasi tulis perintah yang **benar-benar dijalankan** dan hasilnya,
  dan tulis jelas apa yang **belum teruji**.
- Jangan merge PR sendiri kecuali diizinkan eksplisit. PR dengan migrasi selalu menunggu pemilik repo.

## Dokumentasi (wajib, di PR yang sama)

- Fitur baru atau berubah: baris di `docs/FEATURES.md`. Terlihat pengguna: `docs/USER-GUIDE.md`.
  Keputusan arsitektur/model data: `docs/ARCHITECTURE.md`. Status: `_AI_CONTEXT/project-status.md`.
- Hapus entri `TODO.md` yang selesai; tambahkan temuan baru dengan **kenapa** penting dan **di mana**.
- Jangan menulis "selesai" untuk yang baru sebagian; pakai status `sebagian` dan jelaskan sisanya.

## Migrasi Prisma

- Folder `prisma/migrations/<n>_<nama>/` dengan nomor berurutan (sekarang sampai `2_`; sesi lain bisa
  sedang membuat `3_`; periksa `origin/main` dan PR terbuka sebelum memilih nomor).
- Build Vercel menjalankan `prisma migrate deploy` di setiap PR dan database Preview kemungkinan sama
  dengan production: migrasi harus **aditif dan aman di data yang ada**, dan dijelaskan di deskripsi PR.

## Verifikasi sebelum push

```bash
npm run lint && npx tsc --noEmit && npm test && npx next build --webpack
```

Build **harus** `--webpack`. Untuk perubahan UI/data, uji juga di browser dengan skill `kb-local-env`.
CI (`.github/workflows/ci.yml`, check `check`) menjalankan hal yang sama; push hanya bila hasil lokal bersih.

## Jebakan yang pernah terjadi

- `reset()` pada error boundary tidak mengambil data ulang; pakai `retry()`.
- `error.tsx` tidak menangkap galat layout; itu tugas `global-error.tsx`.
- Menulis data di render server ikut terpicu prefetch; catat dari klien setelah halaman tampil.
- Autosave draf yang menghapus draf selama banner pemulihan masih tampil menghilangkan pekerjaan penulis.
- Halaman yang menampilkan data satu pengguna tidak boleh di-cache service worker (kunci cache = URL saja).
- Server action bisa dipanggil lewat POST langsung: validasi tipe argumen, jangan percaya tipe TypeScript.
- Penulisan "hapus lalu buat" tanpa unique key tidak aman terhadap permintaan bersamaan; serialkan
  (`pg_advisory_xact_lock`) atau beri unique key lewat migrasi.
- `pkill -f`/`pgrep -f` dengan pola yang ada di baris perintahnya mematikan shell sendiri.
