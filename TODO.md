# Backlog

Daftar pekerjaan yang sudah teridentifikasi tapi belum dikerjakan, mendesak
maupun tidak. Tujuannya supaya temuan tidak hilang begitu percakapan selesai.

Setiap entri mencantumkan **kenapa** itu penting dan **di mana** letaknya,
supaya bisa dikerjakan tanpa harus menggali ulang konteksnya.

Terakhir diperbarui: 2026-10-24 (koleksi terbatas selesai: penegakan dan layar admin)

---

## Bug

- [ ] **React hydration error #418** — *petunjuk dari review PR #32:* galat muncul di `/docs/new` bila ada
      draf lokal tersimpan (banner draf dibaca dari `localStorage` saat render di `DocumentForm.tsx`), dan
      terjadi juga di `main`. Tanpa draf, tidak muncul di halaman itu. Belum menjelaskan `/collections`. di seluruh aplikasi — muncul di
      `/collections` maupun `/docs/new`, jadi bukan dari editor. Sudah ada
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

- [ ] **4 query sesi tersisa per request** (2 di proxy, 2 di render). React
      `cache()` tidak bisa menyatukannya karena middleware adalah invokasi
      terpisah. Pindah ke JWT session strategy menghilangkannya sepenuhnya,
      dengan konsekuensi: perubahan role baru berlaku setelah login ulang.
      Keputusan produk, bukan teknis.

## Offline

- [ ] **Cache offline masih terbuka bagi orang yang belum login.** Cache dibersihkan saat
      keluar dan saat orang atau peran di browser berganti (`CacheGuard`), tetapi bila
      sesi kedaluwarsa tanpa menekan Keluar dan tidak ada yang login lagi, siapa pun yang
      memakai perangkat itu bisa membuka halaman yang pernah dibaca saat offline, karena
      `proxy.ts` tidak berjalan ketika service worker menjawab dari cache. Itu harga
      "offline-baca"; menutupnya berarti mewajibkan login untuk membaca offline atau
      mengosongkan cache saat sesi habis. Keputusan produk. Celah kedua yang kecil:
      bila jaringan lebih lambat dari 3 detik saat orang baru login, halaman pertamanya
      bisa datang dari cache lama sehingga pembersihan baru terjadi pada pemuatan berikutnya.

## Koleksi terbatas (lanjutan)

- [x] **Pesan "slug dokumen sudah digunakan"** membocorkan bahwa sebuah slug dipakai kepada editor di luar koleksi
      terbatas: diputuskan pemilik (24 Okt 2026) untuk diterima; slug adalah ruang nama global. Dicatat di
      `docs/ARCHITECTURE.md` keputusan 5. Dihapus dari daftar bila entri ini dibersihkan.
- [ ] **Dari review independen koleksi terbatas (tanpa blokir, diterima atau ditunda):** (1) halaman edit dokumen
      mengirim `author.email` dan `emailVerified` ke klien editor, juga untuk dokumen terbuka (sudah ada sebelum fitur
      ini; kirim hanya nama), di `src/app/docs/[slug]/edit/page.tsx`; (2) anggota koleksi terbatas boleh memindahkan
      dokumen ke koleksi terbuka, dan seluruh riwayatnya ikut terbaca semua orang (sesuai "anggota boleh menulis";
      pertimbangkan membatasinya ke admin); (3) bagi non-anggota, ada segmen ketiga di pemilik cache yang
      menandakan adanya koleksi terbatas (hash, tidak bisa dibalik ke id); (4) `setRelatedDocuments` belum punya tes
      balapan; (5) kinerja dua kueri tambahan di layout belum diukur pada data besar.
- [ ] **Cache offline setelah akses dicabut** baru dikosongkan saat orang itu membuka aplikasi online lagi.

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

- [ ] **Editor Tiptap belum dicoba di HP asli.** Diuji hanya di Chromium dengan emulasi layar 390px
      dan `visualViewport` buatan (bilah alat tepat di atas keyboard simulasi). Yang belum terbukti: keyboard
      Android sungguhan (Gboard, IME, koreksi otomatis di dalam editor), mode gelap, dan dokumen panjang. Tautan
      masih memakai `window.prompt`; kalau terasa kasar di HP, ganti dengan isian kecil di bilah alat.
      Belum ada toolbar melayang dekat teks terpilih dan belum ada gambar (menunggu object storage).
      Dari review ulang: pemeriksaan "aman disimpan" hanya jalan saat dokumen dimuat, bukan saat mengetik;
      mengetik `# ` lalu Backspace lalu `# teks` menghasilkan `# # teks` (bug penulisan ulang Tiptap).
      Dokumen dengan tautan yang ditebalkan (`**[a](url)**`) atau kode di dalam daftar bernomor dialihkan ke
      mode Markdown walau maknanya setara (aman, tetapi bisa mengganggu SOP). Test `editor-roundtrip.test.ts`
      memakai `MarkdownManager` di Node yang tidak menjalankan skema ProseMirror penuh, jadi sebagian kasus
      HTML-dalam-tabel berbeda dari di browser; keduanya tetap tertangkap pemeriksaan produksi. Toolbar
      belum bisa dinavigasi dengan panah (15 tombol semuanya masuk urutan Tab). Dokumen dengan gambar,
      catatan kaki, atau HTML kini selalu dibuka sebagai markdown; kalau itu terlalu sering, tambahkan ekstensi
      Image atau catatan kaki yang setia sebagai pekerjaan terpisah.

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
