---
title: Menambah Permission Brand untuk User Penarik Laporan Sell Out
slug: menambah-permission-brand-user
type: PANDUAN
collection: murni-erpnext
excerpt: Cara kerja permintaan akses brand agar BA atau admin sales bisa menarik laporan sell out. HRD menambahkan, atau user mendaftar sendiri lewat aplikasi BA lalu disetujui HR.
---
## Konteks

BA dan admin sales hanya bisa melihat laporan sell out (misalnya Sales by Product) untuk **brand yang diizinkan** di akun mereka. Permintaan "tolong ditambahkan brand" masuk berulang ke CS, biasanya dengan isi:

- User baru yang sudah didaftarkan dan meminta akses untuk menarik laporan sell out.
- User lama yang meminta tambahan brand tertentu.
- Daftar brand yang diminta ditulis langsung dalam pesan.

## Prasyarat

- User sudah **terdaftar** (akun ada di sistem).
- Daftar brand yang diminta jelas (nama brand ditulis lengkap).

## Langkah

1. Pastikan user sudah terdaftar. Ada dua jalur pendaftaran:
   - **HRD mendaftarkan dan menambahkan permission brand** untuk user tersebut, atau
   - **User mendaftar sendiri lewat aplikasi BA**, lalu pendaftarannya **disetujui oleh HR**.
2. Setelah user terdaftar dan disetujui, **tambahkan permission brand** pada akun user itu sesuai daftar yang diminta.
3. Beri tahu peminta bahwa brand sudah ditambahkan, lalu minta ia mencoba menarik laporan sell out.

## Verifikasi

- User bisa membuka laporan sell out (misalnya Sales by Product) dan melihat data brand yang diminta.
- Brand lain yang tidak diminta tidak ikut terbuka.

## Perlu dilengkapi

- **Langkah menu di sistem untuk menambah permission brand** belum tertulis di tiket (hanya "tambahkan permission brand di masing-masing user"). Pemilik pengetahuan perlu menuliskan nama menu dan urutan klik.
- Siapa yang berwenang menambah permission setelah pendaftaran disetujui: HRD sendiri, atau tim yang menangani sistem. Tiket menunjukkan permintaan sering diteruskan ke CS atau tim Thunderlab.
- Pada beberapa tiket peminta juga meminta **akses ke outlet atau gudang tertentu** selain brand. Bagian ini belum dijelaskan.

## Catatan untuk CS

- Satu permintaan bisa memuat banyak brand dalam satu pesan. Catat semuanya agar tidak ada yang terlewat.
- Permintaan yang sama dari orang yang sama sering datang berulang, bila ternyata ada brand yang belum ikut ditambahkan.

## Sumber

Tiket CS di log tiket (nomor baris): 10, 18, 21, 25, 39, 44, 118.
