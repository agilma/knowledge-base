---
title: Menambah Permission Brand untuk User Penarik Laporan Sell Out
slug: menambah-permission-brand-user
type: PANDUAN
collection: murni-erp
excerpt: Cara kerja permintaan akses brand agar BA atau admin sales bisa menarik laporan sell out. Pendaftaran lewat HRD atau lewat aplikasi BA yang disetujui HR; di tiket, permission brand ditambahkan tim CS.
---
## Konteks

BA dan admin sales melihat laporan sell out (misalnya Sales by Product) sesuai **permission brand** pada akun mereka. Permintaan "tolong ditambahkan brand" masuk berulang ke CS, biasanya dengan isi:

- User baru yang sudah didaftarkan dan meminta akses untuk menarik laporan sell out.
- User lama yang meminta tambahan brand tertentu.
- Daftar brand yang diminta ditulis langsung dalam pesan.

## Prasyarat

- User sudah **terdaftar**.
- Daftar brand yang diminta jelas (nama brand ditulis lengkap).

## Langkah

1. Pastikan user sudah terdaftar. **Menurut pemilik (26 Okt 2026)**, ada dua jalur:
   - **HRD dapat menambahkan permission brand**, atau
   - **User mendaftar sendiri lewat aplikasi BA, lalu pendaftarannya disetujui oleh HR.**
2. **Di tiket yang ada**, permission brand ditambahkan oleh tim CS atau Thunderlab setelah diminta ("tambahkan permission brand di masing-masing user"). Pada satu tiket, pendaftarannya sudah dilakukan HRD dan CS diminta menambahkan akses sales report.
3. Setelah permission ditambahkan, beri tahu peminta lalu minta ia mencoba menarik laporan sell out.

## Verifikasi

- User bisa membuka laporan sell out (misalnya Sales by Product) dan melihat data brand yang diminta.

## Jika Masih Gagal

- Pada satu tiket, BA yang tidak bisa melihat penjualan ternyata **kehabisan sesi login**. Cek login akun itu lebih dulu sebelum menambah permission. Ini kesimpulan sementara dari tiket tersebut.
- Pada tiket lain, email HRD tidak bisa mengakses menu pendaftaran BA (BA registration), dan masalahnya selesai setelah akses ke menu itu ditambahkan.

## Perlu dilengkapi

- **Langkah menu di sistem untuk menambah permission brand** belum tertulis di tiket (hanya "tambahkan permission brand di masing-masing user"). Pemilik pengetahuan perlu menuliskan nama menu dan urutan klik.
- **Kapan CS yang menambah dan kapan cukup HRD**: pemilik menyebut HRD bisa menambahkan, sedangkan tiket menunjukkan CS yang melakukannya.
- Satu tiket juga meminta akses ke satu outlet selain brand. Bagian ini belum dijelaskan.

## Catatan untuk CS

- Satu permintaan bisa memuat banyak brand dalam satu pesan. Catat semuanya agar tidak ada yang terlewat.
- Permintaan yang sama dari orang yang sama pernah muncul dua kali (brand yang sama), dan kolom "Berulang" pada tiket pertama mencatat 8 tiket terkait.

## Sumber

Tiket CS di log tiket (nomor baris): 10, 18, 21, 25, 39, 44, 108, 118, 120.
