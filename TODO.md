# Backlog

Daftar pekerjaan yang sudah teridentifikasi tapi belum dikerjakan, mendesak
maupun tidak. Tujuannya supaya temuan tidak hilang begitu percakapan selesai.

Setiap entri mencantumkan **kenapa** itu penting dan **di mana** letaknya,
supaya bisa dikerjakan tanpa harus menggali ulang konteksnya.

Terakhir diperbarui: 2026-10-24 (pencarian full-text selesai)

---

## Bug

- [ ] **React hydration error #418** di seluruh aplikasi — muncul di
      `/collections` maupun `/docs/new`, jadi bukan dari editor MDX. Sudah ada
      sebelum pekerjaan Oktober 2026 (diverifikasi dengan build di commit
      `049c9f8`). Tidak merusak fungsi, tapi React membuang HTML server dan
      merender ulang di klien — memperlambat setiap halaman. Curigai
      `layout.tsx` atau theme provider.
      **Belum bisa direproduksi lokal:** build production dengan sesi login,
      database lokal, mode terang dan gelap, zona waktu Asia/Jakarta — tidak ada
      error di konsol pada `/`, `/collections`, `/docs/new`, `/docs/[slug]`,
      `/search`. Kemungkinan hanya muncul di Vercel (zona waktu server UTC vs
      klien, PWA terpasang, atau service worker lama). Ambil teks lengkap error
      dari konsol production atau build dev. Kandidat yang sudah ditutup tanpa
      bukti: `formatDate` kini memakai zona Asia/Jakarta (server UTC dan klien
      bisa beda hari di dekat tengah malam). Bila #418 tetap muncul di production
      setelah itu, penyebabnya di tempat lain.

## Jaring pengaman

- [ ] **Cakupan test masih tipis.** Ada test untuk aturan route service worker
      (`src/lib/sw-routes.ts`), aturan izin login (`src/lib/auth/access.ts`), dan
      normalisasi markdown. Belum ada untuk server action, service Prisma, dan
      komponen. Jalankan dengan `npm test` (`node:test` + `tsx`, tanpa dependensi baru).

- [ ] **`check` belum menjadi syarat merge.** Workflow `.github/workflows/ci.yml`
      (lint, tsc, test, build) sudah terbukti hijau di PR #21, tapi branch
      protection di `main` belum mewajibkannya, jadi PR yang merah masih bisa
      di-merge. Pengaturannya di GitHub: Settings → Branches → Require status
      checks → `check`. Hanya pemilik repo yang bisa mengubahnya.

## Skala

- [ ] **Favorit pada dokumen yang di-unpublish tertinggal.** Baris `Favorite` tetap ada
      bila dokumen kembali ke draf, karena tombol hapus hanya ada di halaman
      dokumen yang sudah tidak terlihat bagi VIEWER; baris muncul lagi saat dokumen
      dipublikasikan ulang. Tidak merusak, hanya tidak bisa dibersihkan oleh
      pemiliknya. Daftar `/favorites` juga belum dibatasi jumlahnya.

- [ ] **Halaman dokumen yang ter-cache memuat status favorit lama.** Setelah favorit
      diubah, salinan `/docs/<slug>` di service worker menampilkan status sebelumnya
      sampai ada fetch jaringan berikutnya (terlihat saat offline). Kecil.

- [ ] **Database mati terlihat seperti logout.** Saat database tidak terjangkau,
      pencarian sesi gagal dan `auth()` memperlakukan pengguna sebagai belum
      login, jadi yang tampil halaman login, bukan pesan galat. Terlihat saat
      menguji lokal dengan database dimatikan. `src/app/global-error.tsx` ada
      untuk kegagalan layout, tapi belum teruji di runtime karena jalur ini
      tidak sampai melemparkan galat.

- [ ] **Tidak ada catatan penyunting terakhir.** `Document` punya `authorId`
      tapi tidak `lastEditedById` atau riwayat versi. Begitu beberapa orang
      menyunting, "ini terakhir diubah siapa, dan kenapa" jadi pertanyaan
      rutin.

- [ ] **4 query sesi tersisa per request** (2 di proxy, 2 di render). React
      `cache()` tidak bisa menyatukannya karena middleware adalah invokasi
      terpisah. Pindah ke JWT session strategy menghilangkannya sepenuhnya,
      dengan konsekuensi: perubahan role baru berlaku setelah login ulang.
      Keputusan produk, bukan teknis.

## Offline

- [ ] **`/search` di-cache service worker dan memuat draf untuk EDITOR.**
      Pencarian EDITOR menyertakan draf dan arsip, dan halamannya masuk
      `pages-rsc-cache` per URL. Jika perangkat lalu dipakai VIEWER tanpa lewat
      tombol keluar (sesi kedaluwarsa, orang lain login) dan sedang offline,
      `/search?q=...` dari cache menampilkan judul draf. Online tidak bocor
      (NetworkFirst, proxy tetap menegakkan sesi). Bukan regresi pencarian
      full-text: `/docs/<draf>` bocor dengan cara yang sama, dan `CLEAR_PAGE_CACHE`
      hanya dipanggil dari `UserMenu`. Opsi: `/search` network-only (masuk
      `isPersonalRoute` di `src/lib/sw-routes.ts`) dan samakan dengan `/docs/*`.

## Perlu dicek sendiri

- [ ] **Preview deployment kemungkinan menyentuh database production.** Script
      build adalah `prisma migrate deploy && prisma db seed && next build`, dan
      Vercel menjalankannya di **setiap** PR, bukan hanya di `main` — PR #18
      yang isinya cuma satu file markdown pun ikut menjalankannya. Kalau
      `DATABASE_URL` di environment Preview menunjuk ke database yang sama
      dengan production, maka setiap PR menjalankan migrasi ke sana.
      Praktisnya selama ini aman (`migrate deploy` idempoten, seed berhenti
      kalau sudah ada data), tapi satu migrasi yang salah akan terlanjur jalan
      sebelum PR-nya sempat di-review. Cek env var Preview di dashboard Vercel;
      kalau memang sama, pisahkan databasenya atau keluarkan langkah prisma
      dari build untuk Preview.

- [ ] **Deploy production 23 Okt 2026 — sebagian sudah terverifikasi.**
      Build-nya **sukses**, dan header `x-vercel-id` menunjukkan `sin1::`,
      jadi pemindahan region memang berlaku. Yang belum diperiksa: tampilan
      dokumen setelah perubahan typography, dan apakah service worker lama di
      perangkat yang sudah pernah membuka aplikasi benar-benar tergantikan
      (skema kunci cache-nya berubah, jadi cache lama akan dibangun ulang).

- [ ] **18 branch menumpuk di remote**, sisa pekerjaan yang sudah di-merge.
      Empat branch dari pekerjaan Oktober 2026 sudah dihapus; sisanya dari
      pekerjaan sebelumnya dan belum diperiksa satu per satu.

## Dokumen yang belum lengkap

Dua dokumen punya bagian bertanda
`_Bagian ini masih perlu dilengkapi oleh pemilik pengetahuan._`
Penanda itu sengaja — lubangnya terlihat, bukan ditutup tebakan. Tapi kalau
dibiarkan lama, penandanya kehilangan arti dan orang berhenti memperhatikannya.

- [ ] `pos-gagal-closing` → **Jika Retry Masih Gagal**: pesan error yang
      mungkin muncul, batas percobaan wajar, jalur eskalasi.
- [ ] `voucher-labore-tidak-bisa-memotong-harga-di-transaksi` → **Jika Kupon
      Masih Berlaku**: syarat lain selain tanggal berlaku (batas pemakaian,
      minimum pembelian, pembatasan item/outlet), di menu mana data kupon
      dibuka, dan ke siapa dieskalasi.
