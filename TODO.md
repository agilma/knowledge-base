# Backlog

Daftar pekerjaan yang sudah teridentifikasi tapi belum dikerjakan, mendesak
maupun tidak. Tujuannya supaya temuan tidak hilang begitu percakapan selesai.

Setiap entri mencantumkan **kenapa** itu penting dan **di mana** letaknya,
supaya bisa dikerjakan tanpa harus menggali ulang konteksnya.

Terakhir diperbarui: 2026-10-24 (koleksi terbatas selesai: penegakan dan layar admin)

---

## Bug

- [ ] **React hydration error #418: satu penyebab sudah diperbaiki, sisanya belum terbukti hilang di production.**
      Penyebab yang terbukti dan diperbaiki (25 Okt 2026): `DocumentForm.tsx` membaca draf lokal dari `localStorage` saat
      render, sehingga server dan klien merender halaman berbeda di `/docs/new` dan `/docs/[slug]/edit` setiap kali ada draf
      tersimpan. Direproduksi di build production lokal (draf ada: galat; tanpa draf: bersih), kini draf dibaca setelah form
      terpasang dan galat hilang pada semua rute yang diuji. **Laporan awal menyebut `/collections` juga.** Itu tidak muncul
      di lokal, dengan atau tanpa draf. Bila galat #418 masih terlihat di production pada halaman selain form dokumen,
      ambil teks lengkapnya dari konsol (bagian `args[]`) dan buka entri ini lagi; kandidat yang masih mungkin: zona waktu server
      UTC vs klien, PWA terpasang, atau service worker lama.

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

- [ ] **Dari review layar admin koleksi terbatas (tanpa blokir):** (1) daftar pemilih anggota memuat maksimal 500 pengguna
      (`listAssignableUsers`); pengguna ke-501 tidak bisa dicari (pemilih memberi tahu bila daftar terpotong); (2) setiap
      simpan koleksi terbatas, juga tanpa perubahan akses, menyentuh `updatedAt` dan mengosongkan cache offline semua
      non-admin (berlebih tetapi aman); (3) lapisan aksi (`restrictedTouched`/`membersTouched`, pesan galat) hanya diuji
      lewat browser, belum ada tes otomatis; (4) pembersihan cache oleh service worker sungguhan belum diuji di perangkat kedua.
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

## Dari log tiket CS (25 Okt 2026)

- [ ] **Tinjau enam draf** yang diimpor dari `content/drafts/` (bagian "Perlu dikonfirmasi" di tiap dokumen): batas selisih harga Purchase
      Invoice (10% atau 50% di tiket) dan cara Area Manager menyetujui; langkah menu menambah permission brand; apakah mencabut kabel LAN aman
      disarankan umum; penyebab diskon nominal kecil yang gagal dibayar; siapa yang boleh membatalkan PO yang sudah disetujui.
- [ ] **Tambahkan ke dokumen terbit `pos-gagal-closing`** (tiket 90 dan 94): saat input Sales Invoice manual untuk transaksi yang gagal,
      centang "ignore pricing rule" dan isi channel dengan "Sales"; dan (tiket 59, 95, 98) retry transaksi offline harus dari komputer yang
      sama saat transaksi, dengan akun koordinator. Tidak diubah otomatis karena dokumennya sudah terbit.
- [ ] **Topik dari log tiket yang belum dibuat** (bahan tipis atau menunggu bug selesai): POS ungu tidak bisa dibuka atau macet; login dan password;
      laporan lambat (Sales By Product, Sales Register); simpan keranjang dan customer "no name"; voucher atau promo tidak berlaku; cetak dan PDF;
      retur dan credit note; selisih angka antar laporan; katalog laporan. Perlu konfirmasi isi dari pemilik pengetahuan.
- [ ] **Kualitas log tiket**: 13 tiket Completed tanpa kolom Penyelesaian, kolom "Berulang" menunjuk nomor baris yang bergeser, dan banyak kolom kosong.

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

## Dari fitur undang pengguna

- [ ] Mencabut akses tidak menghapus akun, dan orang yang lolos lewat domain atau `AUTH_ALLOWED_EMAILS` tetap bisa masuk lagi. Perlu penanda "nonaktif" di `users` (migrasi) bila admin ingin memblokir orang yang domainnya diizinkan.
- [ ] Undangan tidak punya masa berlaku dan tidak mengirim email.
- [ ] Daftar pengguna dibatasi 500 baris terbaru tanpa pencarian.

## Dari Panduan Training POS Ungu

- [ ] `panduan-training-pos-ungu-dan-mode-offline`, draf `mode-offline-pos`, dan dokumen terbit `pos-gagal-closing` membahas topik yang sama (offline, Retry, Input Manual). Setelah ketiganya dibaca pemilik, putuskan: gabung jadi satu, atau saling menaut. Materi training lebih lengkap dan lebih baru (POS ungu).
- [ ] Bagian "Tampilan POS ungu dan POS hijau" di materi training masih kosong; pertanyaan kasir tentang closing minus setelah retur belum terjawab.
- [ ] Penulis dokumen dari Lala: impor dengan `--as lalaagnesta@gmail.com` (editor, harus pernah login). Dokumen yang sudah diimpor atas nama admin tidak berubah penulisnya; ganti manual bila perlu.

## Dari sheet Bintang Berkat dan SMPN 13 (topik yang belum ditulis)

- [ ] Bintang Berkat: retur penjualan dan Down Payment/Tempo; Adjustment Stock dan rekonsiliasi stok antar gudang; alur produksi (Ambil Stok Bahan, QC, surat jalan); mengganti satuan atau menggabung item; membaca laporan stok; mencatat ongkir dan biaya produksi; stok tertahan di gudang yang salah akibat invoice lama. Beberapa topik di sheet tidak punya langkah tertulis (retur POS setelah tutup, SO belum Completed padahal lunas, kasus qty tagihan membengkak karena selisih harga).
- [ ] SMPN 13: akun guru atau panitia tahun lalu (menimpa akun), welcome mail tidak masuk (Forgot Password), import peserta gagal karena duplikat, submit jadwal select all gagal, salah buat jadwal atau sesi dan lembar jawaban dobel, aturan pelanggaran SekolahPro v3.2.4.
- [ ] **Keamanan:** sheet ujian SMPN 13 (tab ujian kelas 9, April 2025) memuat email dan kata sandi akun pengawas. Ganti kata sandinya dan hapus dari sheet; jangan masuk ke dokumen.
- [ ] Penulis dokumen dari sheet dan Google Doc ini adalah Lala; impor dengan `--as lalaagnesta@gmail.com` (editor, harus pernah login).

## Dari tab LIVE (PROBLEM & SOP) sheet List Fitur Tambahan Murni (topik yang belum ditulis)

- [ ] Kupon dan voucher di POS (kupon tersimpan lokal, kupon kedaluwarsa tetap memotong, kupon di-setting untuk company yang keliru, voucher tidak terpotong karena custom diskon), promo/pricing rule tidak bisa dipakai (Default Warehouse di Branch, Disable dicentang), POS status UNKNOWN dan konfigurasi belum lengkap (Outlet, Warehouse, Selling Price List), dan error warehouse di aplikasi BA (hapus default company/branch/warehouse di user permission).
- [ ] Tambahan untuk draf yang sudah ada: PO tidak bisa disetujui (Material Request sudah cancel, Limit Crossed, Not a Valid Workflow action, BrokenPipe banyak tab, PO Page antar CV) ke `po-pr-tidak-bisa-submit`; Purchase Invoice over billing, diskon tidak bisa diubah, nomor invoice supplier ganda, is paid, macet di halaman 2/3 ke `purchase-invoice-gagal-submit-selisih-po`; Gagal menghitung harga (refresh; selisih pembulatan 2 rupiah di POS 2.1.1.13), kurang bayar karena pajak tidak include, dan diskon offline lawan online ke `harga-diskon-pos-tidak-sesuai`.
- [ ] **Keamanan:** sheet itu memuat email, dan satu baris menyebut kata sandi atau kunci bawaan aplikasi HR (versi 1.0.2: ganti license harus login system manager). Ganti nilai bawaan itu dan jangan simpan di sheet.
- [ ] Banyak solusi POS dijanjikan "diperbaiki di versi 2.0.0 atau 2.1"; setelah rilis, periksa dan perbarui draf POS agar tidak usang.

## Dari dokumen terbatas

- [ ] Slug dokumen terbatas masih "terpakai" bagi editor lain saat membuat dokumen dengan slug itu (ruang nama global, sama seperti koleksi); hanya keberadaan slug yang terlihat, bukan judul atau isinya.
- [ ] Perubahan akses (dibatasi, dibuka, daftar anggota) tidak tercatat di riwayat versi.
- [ ] Draf lokal di `localStorage` (`kb:draft:doc:...`) menyimpan isi dokumen yang sedang disunting di perangkat; pada perangkat bersama, isinya tetap ada setelah akun berganti. Kosongkan saat keluar akun.
- [ ] Tautan di isi dokumen terbuka ke slug dokumen terbatas tetap tertulis; pembaca tanpa hak hanya mendapat "tidak ditemukan".
- [ ] Editor yang menjadi anggota koleksi dan dokumen bisa memindahkan dokumen terbatas ke koleksi lain; batas dokumennya ikut, tetapi koleksi tujuan menentukan siapa lagi yang melihat daftarnya.
- [ ] Salinan offline orang yang dicabut dikosongkan baru saat ia membuka aplikasi online berikutnya (sama seperti koleksi).
- [ ] Layar admin untuk melihat semua dokumen terbatas dan siapa saja anggotanya (saat ini harus membuka dokumennya satu per satu).
- [ ] Kunci cache offline memuat semua id dokumen terbatas pada setiap render layout untuk non-admin; bila jumlahnya ribuan, hitung sidik jarinya di SQL (md5 dari id terurut) atau simpan per permintaan.
- [ ] Menyimpan dokumen oleh admin dengan perubahan akses dilakukan dalam dua langkah (isi lalu akses); bila langkah kedua gagal, isi sudah tersimpan dan akses belum berubah (aman: tertutup), tetapi pesannya hanya "gagal memperbarui".

## Dari desain SOP Thunderlab

- [ ] Koleksi `thunderlab` harus sudah ada sebelum `npm run docs:import` (draf SOP memakai `collection: thunderlab`).
- [ ] Desain Canva "6 SOP THUNDERLAB" masih memuat dua versi SOP 01 dan label versi yang tidak konsisten; bersihkan di sumbernya setelah dokumen di Knowledge Base dipublikasikan, agar satu sumber kebenaran.
- [ ] Penyetuju proposal (SOP 03) ditulis dengan nama orang di sumber; tuliskan jabatannya.

## Dari asisten AI admin

- [ ] **Belum diuji dengan kunci API asli.** Alur, kontrak SSE, dan penanganan galat diuji dengan klien palsu. Setelah `ANTHROPIC_API_KEY` diisi di Vercel (Production) dan redeploy, coba satu percakapan nyata: usulan muncul, "Terapkan ke form" mengisi form. Bila API menolak parameter (`output_config`, beta fallback), pesan galatnya generik di UI; lihat log fungsi Vercel.
- [ ] Pembatas laju hanya di memori per instance serverless; bila perlu batas keras, pindahkan ke database atau Redis (lihat keputusan 1 di `docs/ARCHITECTURE.md`) dan pasang batas pengeluaran di akun Anthropic.
- [ ] Belum ada lampiran berkas atau gambar ke chat (bahan hanya teks tempel) dan belum ada pembacaan tautan Google Sheet/Docs langsung.
- [ ] Biaya: Opus dengan thinking dan dokumen panjang tidak murah; bila tagihan jadi masalah, pertimbangkan model lebih kecil untuk perubahan kecil.

## Dari fitur bagikan dan PDF

- [ ] Tautan publik berbunyi rahasia (bisa dibuka tanpa login, bisa dicabut) ditunda: butuh tabel baru, keputusan soal dokumen terbatas, dan perubahan proxy.
- [ ] PDF dari server (satu klik langsung berkas .pdf) ditunda; hari ini lewat dialog cetak browser.
- [ ] Belum diuji di perangkat asli: lembar bagikan HP dan "Simpan sebagai PDF" di Safari iOS.
- [ ] PDF belum memuat daftar isi dan nomor halaman; ekspor banyak dokumen sekaligus belum ada.

## Dari diagram Mermaid

- [x] Pratinjau diagram di editor: selesai.
- [ ] Service worker men-precache semua potongan `_next/static`, termasuk ~22 potongan mermaid (sekitar 3 MB mentah) yang ikut terunduh di setiap perangkat saat service worker dipasang, walau tak pernah membuka diagram. Diagram jadi tampil offline, tetapi bila ukuran unduhan jadi masalah, kecualikan potongan mermaid dari precache (`exclude` di `@serwist/next`) dan cache saat dipakai; konsekuensinya diagram offline hanya bila pernah dibuka.
- [ ] Diagram selalu di kartu putih; belum ada tema gelap. Belum ada jenis diagram selain yang dicoba (flowchart): urutan (sequence) dan lainnya belum diuji.
- [ ] Dokumen "SOP 01: Workflow Produksi" di aplikasi belum tentu memuat diagram; minta Asisten AI membuatnya lalu periksa.

## Dari langkah bergambar

- [x] Pratinjau dan tombol sisip di editor: selesai (butir roadmap 1).
- [ ] Deskripsi langkah hanya teks polos (tanpa tebal, tautan, atau ikon). Tambahkan bila dibutuhkan.
- [ ] Dokumen SOP 01 sampai 06 di aplikasi belum otomatis memakainya; minta Asisten AI mengubah bagian "Alur" ke langkah bergambar.

## Dari riwayat chat AI

- [ ] **Migrasi 8 perlu disetujui pemilik sebelum digabung** (dua tabel baru, aditif).
- [ ] Pembersihan 90 hari hanya berjalan saat ada percakapan baru dibuat; bila tak ada yang memakai AI, riwayat lama menetap lebih lama. Bila perlu kepastian, tambahkan Vercel cron yang memanggil `purgeExpired(Date.now(), true)`.
- [ ] Riwayat tidak dienkripsi di database dan bahan yang ditempel ikut tersimpan 90 hari; pertimbangkan penyaringan (peringatan sudah ada hanya untuk usulan, bukan untuk pesan pengguna).
- [ ] Belum ada pencarian di dalam riwayat, ekspor, atau penggantian nama dari layar (API `PATCH` sudah ada). Daftar dibatasi 30 terbaru.
- [ ] Status "sudah diterapkan" pada kartu usulan tidak ikut tersimpan; kartu usulan terbaru kembali menampilkan tombol Terapkan saat percakapan dibuka lagi. ("Abaikan" sudah tersimpan: usulan dihapus dari percakapan.)
- [ ] Tes basis data (`*.integration.test.ts`, termasuk riwayat chat) tidak dijalankan di CI karena CI tidak punya Postgres; tambahkan layanan Postgres di workflow agar privasi antar pengguna dan urutan pesan ikut dijaga otomatis.
- [ ] Jawaban yang tersimpan setelah browser terputus bergantung pada fungsi serverless yang tetap berjalan; belum diverifikasi di Vercel dan belum memakai `waitUntil`.
- [ ] Belum ada batas jumlah percakapan per pengguna (hanya pembatas laju dan umur 90 hari).

## Dari pengukuran performa (28 Okt 2026)

- [x] Pencarian kata umum lambat pada banyak dokumen: selesai dengan migrasi 9 (11,6 s menjadi 0,25 s pada 20.000 dokumen).
- [ ] Hapus indeks ekspresi lama `documents_search_idx` di migrasi berikutnya setelah tidak ada versi lama yang berjalan; menghemat ruang (indeks kedua yang tidak dipakai lagi).
- [x] Halaman koleksi (3,6 MB) dan pemilih dokumen terkait (500 pertama): selesai, daftar 50 per halaman dan pencarian di seluruh perpustakaan.
- [ ] Cara mengulang pengukuran: Postgres lokal (skill `kb-local-env`), isi 20.000 dokumen dengan `generate_series` (judul, ringkasan, sekitar 900 kata isi, 5% terbatas, 20% draf), lalu panggil `searchDocuments`, `getDocumentsByCollection`, `getRecentlyUpdatedDocuments`, `searchRelationCandidates` dengan `performance.now()` lima kali dan ambil median. Skrip belum disimpan di repo; simpan di `scripts/` bila ingin diulang rutin (butir 42).

## Dari ekspor

- [ ] Ekspor tidak tercatat di log audit (butir roadmap 14); sekarang hanya baris `console.info` berisi id admin dan jumlah dokumen.
- [ ] Zip tidak dienkripsi dan memuat dokumen terbatas; bila cadangan akan disimpan di luar, pertimbangkan enkripsi atau kata sandi.
- [ ] Pembatas laju ekspor per instance serverless (lihat catatan pembatas laju AI).
- [ ] Impor dari zip langsung di aplikasi belum ada (butir roadmap 30); hari ini lewat `content/drafts/` dan `npm run docs:import`.
- [ ] Topik yang belum ada: memuat ulang hasil pencarian menaikkan hitungan (tanpa dedupe per pengguna, sengaja agar tanpa identitas); batas 2000 baris belum punya uji otomatis; pembatas pencatatan per instance tidak ada (pencarian sudah dibatasi login).
- [ ] Topik yang belum ada: nama orang atau token pendek tetap tersimpan (tidak bisa dibedakan dari topik); akun mana pun bisa membanjiri tabel dengan kueri unik (cap 2000 menyingkirkan yang `lastAt` terlama), pembatas pencatatan belum ada.
- [ ] Folder migrasi `10_` diurutkan sebelum `2_` oleh Prisma pada database baru; aman untuk migrasi 10 (tabel mandiri), tetapi migrasi 11 dan seterusnya yang bergantung pada tabel lama perlu penamaan berpadding atau pemeriksaan.
- [ ] Saran salah ketik hanya membandingkan judul, bukan isi dokumen; salah ketik kata yang hanya ada di isi tidak ditolong. Daftar sinonim diubah lewat kode (belum ada layar admin).
- [ ] `CREATE EXTENSION pg_trgm` butuh hak membuat ekstensi di database produksi (Neon: pemilik database punya); bila build gagal di migrasi 11, jalankan `CREATE EXTENSION pg_trgm` sekali dari konsol Neon lalu ulangi.
- [ ] Tempat sampah dibersihkan hanya saat daftar dibuka atau dokumen dihapus (tidak ada penjadwal); entri lewat 30 hari bisa bertahan sampai salah satunya terjadi (tidak terlihat oleh siapa pun lain).
- [ ] Menghapus dan memulihkan dokumen belum tercatat di log audit (butir roadmap 14); menghapus koleksi atau pengguna tidak melewati sampah.
- [ ] Potret sampah memuat seluruh riwayat versi; dokumen dengan ratusan versi besar membuat baris besar. Pertimbangkan batas bila terlihat di data nyata.
- [ ] Tempat sampah: tautan terkait antara dua dokumen yang sama-sama dihapus hilang bila dipulihkan satu per satu (potret hanya memuat tautan yang masih ada saat dihapus); `AiConversation.documentId` tidak dipulihkan; daftar sampah dibatasi 200 tanpa halaman; pesan galat di `?galat=` bisa dipalsukan lewat tautan buatan (hanya teks, dipotong 200 karakter).
- [ ] Dokumen bersarang: tidak ada pohon di sidebar dan tidak ada seret-urut (hanya tombol naik/turun); pencarian dan hasilnya tidak menampilkan jalur induk; halaman koleksi tidak menunjukkan jumlah bab (hitungan akan membocorkan bab yang tidak boleh dilihat).
- [ ] Menghapus induk membuat bab-babnya tingkat atas, dan memulihkan induk tidak mengembalikan mereka ke bawahnya.
- [ ] Daftar pilihan induk di form dibatasi 300 judul per koleksi (urut judul); koleksi yang lebih besar perlu pencarian seperti pemilih dokumen terkait.
- [ ] Pembaca yang mencetak halaman induk tidak mendapat daftar bab (disembunyikan saat cetak, seperti dokumen terkait).
- [ ] Dokumen bersarang: memulihkan dari sampah ke induk yang sementara itu disusun ulang hingga tingkat 4 menaruh dokumen di tingkat 5 (kedalaman tidak diperiksa ulang saat pulih); "Tambah sub-halaman" disembunyikan berdasarkan induk yang terlihat, jadi untuk pohon yang sebagian tersembunyi server yang memutuskan; tombol naik/turun tidak menampilkan galat bila gagal; `getAncestors` memakai beberapa kueri berurutan (maksimal 4).
- [ ] Grup: perubahan keanggotaan, pembuatan, dan penghapusan grup belum tercatat di log audit (butir roadmap 14); grup tidak bersarang (satu grup tidak bisa berisi grup lain) dan tidak punya pemilik selain admin; daftar grup di form dibatasi 100 tanpa pencarian.
- [ ] Grup: kueri pembaca non-admin menambah satu `EXISTS` per koleksi dan dokumen; belum diukur pada 20.000 dokumen dengan banyak grup (indeks `groupId` ada).
- [ ] Mode langkah: kemajuan hanya di perangkat (tidak ada pelacakan oleh penyelia atau riwayat pengerjaan); hanya blok `langkah` dan `peringatan` yang dikenali, bukan daftar bernomor biasa; tidak ada foto per langkah (menunggu lampiran gambar, butir 4); layar tetap menyala memakai Wake Lock API yang tidak ada di semua peramban.
- [ ] Mode langkah: tanda selesai dipisah per pengguna (id pengguna ada di kunci) tetapi tidak dihapus saat keluar akun; blok dengan lebih dari 12 langkah dibuang seluruhnya (sama dengan halaman dokumen, tanpa pesan untuk penulis); membuka lagi setelah ada tanda melompat ke langkah pertama yang belum selesai sehingga peringatan pembuka tidak tampil lagi; hasil `extractStepFlow` dan render halaman memakai dua parser berbeda (dicocokkan lewat tes, bukan kode bersama).
- [ ] Masukan pembaca: tidak ada notifikasi untuk penyunting (kotak masuk harus dibuka; menunggu butir 31) dan tidak ada `@nama` (butir 27 sebagian); tidak ada komentar pada bagian dokumen tertentu; tidak ada pembatas laju balasan (hanya masukan baru, 10 per jam; utas penuh pada 100 balasan); isi masukan bisa memuat data yang tidak seharusnya (peringatan di formulir saja, tidak dipindai seperti usulan AI); admin tidak bisa mencari atau memfilter kotak masuk per dokumen, penulis, atau kata (hanya 50 terbaru per tab).
- [ ] Masukan pembaca: penulis yang dihapus dari sistem meninggalkan masukan tanpa nama (muncul sebagai "Pembaca"); masukan tidak ikut diekspor ke zip cadangan.
- [ ] Masukan pembaca: kuota 10 per jam dihitung dari baris yang masih ada, jadi mengirim lalu menghapus sendiri tidak menghabiskannya (tidak membanjiri kotak masuk, tetapi menulis tanpa batas ke basis data); galat pengiriman (kena batas, terlalu pendek) mengembalikan halaman tanpa isi yang sudah diketik karena formulir tanpa JavaScript; panjang dihitung dalam satuan UTF-16 (emoji bernilai 2); url `/docs/<slug>/masukan/` dengan garis miring akhir tidak termasuk jalur tanpa cache (kelemahan sama dengan `/edit` dan `/history`).
- [ ] Templat: tidak bisa diperbarui dari dokumen sumbernya (buat ulang lalu hapus yang lama); tidak ada pratinjau isi di daftar Templat; tidak ada templat per koleksi atau jenis; templat dari dokumen yang kemudian dibatasi tetap ada dan terbaca semua penyunting (salinan lama): halaman Templat menandainya ("dokumen sumbernya kini dibatasi") tetapi tidak menghapusnya sendiri dan tidak ada peringatan saat dokumen atau koleksi dibatasi; memilih templat di Dokumen Baru membuang isi formulir yang sudah diketik (form dimuat ulang); tombol Hapus templat tidak meminta konfirmasi bila JavaScript mati.
- [ ] Urutan migrasi: Prisma menjalankan folder menurut abjad (`10_` sebelum `2_`). Migrasi 10 ke atas bergantung pada tabel yang dibuat migrasi 0 dan 1 saja; migrasi berikutnya yang butuh objek buatan migrasi 2 sampai 9 (enum, kolom `search_vector`, dsb.) akan gagal pada basis data baru. Periksa selalu dengan `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url ... --exit-code` pada basis data kosong; pertimbangkan menamai ulang folder 2 sampai 9 dengan awalan nol (`02_`...) lewat migrasi pencatatan terpisah.
- [ ] Sematan: hanya Canva, YouTube, Google Slides, dan Figma (tambah penyedia lain = satu fungsi di `embed.ts` dan satu host di `EMBED_FRAME_HOSTS`); tautan pendek `canva.link` tidak bisa disematkan (harus tautan `/design/...`); rasio bingkai tetap; Google Docs dan Sheets belum; bingkai tidak diperiksa apakah tautannya benar-benar bisa dibuka pembaca (penyedia yang menampilkan galat di dalam bingkai); CSP hanya `frame-src`, belum ada `default-src` atau `script-src`; pratinjau di editor ikut memuat bingkai bila tombol Tampilkan ditekan; tidak ada pengaturan oleh admin untuk mematikan sematan atau mengubah daftar host tanpa perubahan kode.
- [ ] Sematan: asisten AI belum tahu blok `sematan` (tidak akan menyarankannya) dan belum ada kasus `sematan` di tes bolak-balik editor; hook status daring memberi nilai awal berbeda dari server saat dokumen dibuka offline dari cache (galat hidrasi di konsol, pulih sendiri).
