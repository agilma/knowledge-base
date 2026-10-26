---
title: Laporan Sales Payment Summary Lambat Saat Closing Kasir
slug: laporan-sales-payment-summary-lambat
type: MASALAH
collection: murni-erpnext
excerpt: Laporan Sales Payment Summary lama dibuka atau muncul tulisan antrian saat kasir akan closing. Tunggu, lalu pakai POS Shift Closing atau cetak sesi sebagai alternatif.
---
## Konteks

Saat closing, koordinator menarik data kasir dari laporan **Sales Payment Summary**. Di jam ramai laporan ini sering lama dibuka, atau muncul peringatan bahwa laporan masih dalam antrian. Gejala yang dilaporkan CS:

- Laporan Sales Payment Summary loading lama.
- Muncul peringatan bahwa laporan dalam antrian.
- Kasir tidak bisa closing karena data penjualan belum bisa ditarik.

Masalah ini muncul berulang di banyak outlet Murni, sehingga sebaiknya CS menjawab dengan langkah yang sama setiap kali.

## Prasyarat

- Akun **koordinator** (bukan akun kasir).
- Untuk opsi 1: kasir memakai **POS ungu**. Menu cetak sesi tidak ada di POS hijau.

## Langkah Pemeriksaan

1. Minta outlet **menunggu dahulu dan tidak menekan tombol laporan berulang kali**. Menekan berulang membuat laporan makin lama dan antriannya bertambah.
2. Jika masih lama, tawarkan dua opsi untuk closing kasir:
   - **Opsi 1, cetak sesi di POS.** Login ke POS dengan akun koordinator, lalu pakai menu **Cetak Sesi**. Hanya berlaku di POS ungu.
   - **Opsi 2, laporan POS Shift Closing di dashboard.** Buka dashboard dengan akun koordinator, cari **POS Shift Closing** di kotak pencarian, lalu pilih laporan POS Shift Closing. Laporan ini lebih ringan daripada Sales Payment Summary.
3. Jika yang dibutuhkan laporan pembayaran biasa (bukan closing), laporan **Sales Payment** juga lebih ringan dan bisa dipakai sebagai pengganti.

## Verifikasi

- Data kasir yang dibutuhkan untuk closing sudah tampil di salah satu laporan alternatif.
- Kasir bisa melanjutkan closing.

## Jika Masih Gagal

- Jika seluruh sistem lambat atau tidak bisa dibuka (bukan hanya satu laporan), kemungkinan server sedang bermasalah. Eskalasi ke tim Thunderlab dan sertakan: nama outlet, jam kejadian, dan foto layar.
- Jika yang ditanyakan adalah transaksi akun koordinator yang tidak muncul di laporan Sales Payment Summary (semua kasir), muat ulang laporan dahulu. Pada satu tiket, transaksi koordinator ternyata sudah masuk ke laporan.

## Catatan untuk CS

- Jawaban singkat yang dipakai selama ini: "ditunggu dahulu, jangan di-spam", lalu tawarkan dua opsi di atas.
- Penyebab lambatnya laporan belum dijelaskan di tiket.

## Perlu dikonfirmasi

- Apakah ada batas waktu tunggu yang sebaiknya disebut ke outlet sebelum beralih ke opsi 1 atau 2.
- Apakah laporan Sales Payment aman dipakai untuk closing, atau hanya POS Shift Closing dan cetak sesi.

## Sumber

Tiket CS di log tiket (nomor baris): 31, 32, 36, 37, 40, 47, 105.
