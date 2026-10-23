# Backlog

Daftar pekerjaan yang sudah teridentifikasi tapi belum dikerjakan, mendesak
maupun tidak. Tujuannya supaya temuan tidak hilang begitu percakapan selesai.

Setiap entri mencantumkan **kenapa** itu penting dan **di mana** letaknya,
supaya bisa dikerjakan tanpa harus menggali ulang konteksnya.

Terakhir diperbarui: 2026-10-23

---

## Menunggu merge

- [ ] **PR `feat/document-authoring`** — markdown bisa dibaca, dokumen terbit
      bisa disimpan, alur buat dokumen, migrasi jenis dokumen.
      **Merge ini duluan:** database production sudah memakai 3 jenis dokumen
      sementara kode yang berjalan masih mengenal 4. Selama timpang, memilih
      "Solusi" lalu menyimpan akan ditolak Postgres.
- [ ] **PR `fix/platform-perf-offline`** — semantik tombol, hapus komponen mati,
      perf query, cache offline. Tidak ada irisan file dengan PR di atas.
- [ ] Hapus branch `fix/button-link-semantics-sidebar-overflow` di remote —
      isinya kini duplikat dari kedua branch di atas, berisiko keliru di-merge.

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

- [ ] **Tidak ada CI.** Tidak ada `.github/`, jadi tidak ada yang menjalankan
      `tsc`, `eslint`, atau `next build` sebelum merge ke `main`. Perbaikan
      termurah dengan manfaat terbesar di daftar ini.

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

- [ ] **Region Vercel.** `vercel.json` sudah dipin ke `sin1` (database di
      `ap-southeast-1`), tapi region sebelumnya belum terkonfirmasi. Kalau
      memang `iad1` (default, Washington DC), setiap query menyeberangi
      Pasifik — sekitar 220 ms sekali jalan, bukan 50 ms. Itu kemungkinan
      penjelasan utama lambatnya aplikasi di production. Butuh akses dashboard
      Vercel.

- [ ] **19 branch menumpuk di remote**, sebagian besar sisa pekerjaan yang
      sudah di-merge.

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
