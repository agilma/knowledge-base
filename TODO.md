# Backlog

Daftar pekerjaan yang sudah teridentifikasi tapi belum dikerjakan, mendesak
maupun tidak. Tujuannya supaya temuan tidak hilang begitu percakapan selesai.

Setiap entri mencantumkan **kenapa** itu penting dan **di mana** letaknya,
supaya bisa dikerjakan tanpa harus menggali ulang konteksnya.

Terakhir diperbarui: 2026-10-23

---

## Bug

- [ ] **Banner draf palsu.** Editor MDX menormalkan markdown saat memuat
      (`_italic_` → `*italic*`, `- item` → `* item`), autosave 1 detik
      menangkapnya sebagai perubahan, lalu kunjungan berikutnya memperingatkan
      ada "draf belum tersimpan" yang isinya identik dengan versi terbit.
      Melatih orang menekan "Buang" tanpa membaca — sampai suatu hari draf yang
      dibuang benar-benar berisi pekerjaan.
      Perbaikannya: bandingkan bentuk, bukan byte. Helper-nya sudah ada di
      `src/lib/document-templates.ts` (`normalizeMarkdown`).
      Lihat `src/components/document/DocumentForm.tsx` (autosave ~baris 126).

- [ ] **React hydration error #418** di seluruh aplikasi — muncul di
      `/collections` maupun `/docs/new`, jadi bukan dari editor MDX. Sudah ada
      sebelum pekerjaan Oktober 2026 (diverifikasi dengan build di commit
      `049c9f8`). Tidak merusak fungsi, tapi React membuang HTML server dan
      merender ulang di klien — memperlambat setiap halaman. Curigai
      `layout.tsx` atau theme provider.

- [ ] **`requireRole` menolak tanpa penjelasan.** `src/lib/auth/session.ts:23`
      memanggil `redirect("/")` saat role tidak cukup. Seorang VIEWER yang
      mencoba aksi EDITOR hanya terlempar ke beranda — terlihat seperti bug,
      bukan penolakan izin.

- [ ] **`shadcn` ada di `dependencies`, bukan `devDependencies`** (1.9 MB).
      Itu CLI, tidak pernah di-import kode. Memindahkannya memangkas install
      production di Vercel tanpa efek ke runtime.

## Jaring pengaman

- [ ] **Tidak ada CI sendiri.** Tidak ada `.github/`. Preview deployment Vercel
      menjalankan `next build` di setiap PR, dan karena `next.config.ts` tidak
      mematikan pengecekan tipe, error tipe dan build memang tertangkap di
      sana. Yang belum ada: `eslint`, dan gerbang yang tidak bergantung pada
      deploy — begitu ada test, tidak ada tempat untuk menjalankannya.

- [ ] **Tidak ada test sama sekali.** Dua area paling menuntut:
      - `src/app/sw.ts` — `isTargetPageRoute()` dan matcher-nya punya
        percabangan yang tidak sedikit, semuanya fungsi murni, dan kalau salah
        efeknya senyap (halaman ter-cache padahal tidak seharusnya, atau
        sebaliknya).
      - `src/auth.ts` callback `signIn` — menentukan siapa boleh masuk.
        Salah sedikit berarti orang luar bisa membaca knowledge base internal.

- [ ] **Tidak ada `error.tsx`, `not-found.tsx`, `loading.tsx`.** Kalau query
      Prisma gagal di server component, pengguna dapat layar error bawaan Next.
      Janggal untuk aplikasi yang menjual diri sebagai tahan-offline.
      `loading.tsx` juga akan mengaktifkan streaming UI yang sekarang tidak
      terpakai.

- [ ] **Env tidak divalidasi.** `src/auth.ts:37` mengoper
      `process.env.AUTH_GOOGLE_ID` langsung ke provider. Kalau kosong, yang
      muncul HTTP 500 `There was a problem with the server configuration` —
      butuh beberapa langkah untuk melacak penyebabnya. `zod` sudah terpasang.

## Skala

- [ ] **Pencarian akan melambat.** `src/lib/services/documents.ts:97` memakai
      `contains` + `mode: "insensitive"` pada `title`, `excerpt`, dan `content`.
      Itu `ILIKE '%kata%'` — tidak bisa memakai index, selalu full scan, dan
      `content` kolom teks panjang. Tidak ada index teks di tabel `documents`.
      Pencarian adalah fitur yang paling sering dipakai; begitu lambat, orang
      berhenti memakai knowledge base-nya. Solusinya Postgres full-text
      (`tsvector` + index GIN), didukung Neon.

- [ ] **Tidak ada catatan penyunting terakhir.** `Document` punya `authorId`
      tapi tidak `lastEditedById` atau riwayat versi. Begitu beberapa orang
      menyunting, "ini terakhir diubah siapa, dan kenapa" jadi pertanyaan
      rutin.

- [ ] **4 query sesi tersisa per request** (2 di proxy, 2 di render). React
      `cache()` tidak bisa menyatukannya karena middleware adalah invokasi
      terpisah. Pindah ke JWT session strategy menghilangkannya sepenuhnya,
      dengan konsekuensi: perubahan role baru berlaku setelah login ulang.
      Keputusan produk, bukan teknis.

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
