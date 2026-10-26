---
title: Laporan Sales Payment Summary Lambat Saat Closing Kasir
slug: laporan-sales-payment-summary-lambat
type: MASALAH
collection: murni-erpnext
excerpt: Laporan Sales Payment Summary lama dibuka atau muncul tulisan antrian saat kasir akan closing. Minta outlet menunggu, lalu pakai cetak sesi di POS atau laporan POS Shift Closing sebagai alternatif.
---
## Konteks

Saat closing, outlet menarik data kasir dari laporan **Sales Payment Summary**. Gejala yang dilaporkan ke CS:

- Laporan Sales Payment Summary loading lama.
- Muncul peringatan bahwa laporan masih dalam antrian.
- Kasir tidak bisa closing karena data penjualan belum bisa ditarik.

Masalah ini muncul berulang pada beberapa outlet Murni, jadi sebaiknya CS menjawab dengan langkah yang sama setiap kali.

## Prasyarat

- Akun **koordinator** (bukan akun kasir).
- Untuk opsi 1 di bawah: kasir memakai **POS ungu**. Menu cetak sesi hanya berlaku di POS ungu.

## Langkah Pemeriksaan

1. Minta outlet **menunggu dahulu dan tidak melakukan spam klik atau refresh** saat laporan sedang diproses.
2. Jika masih lama dan yang dibutuhkan adalah closing kasir, tawarkan dua opsi (SOP yang dipakai CS):
   - **Opsi 1, cetak sesi di POS.** Login ke POS dengan akun koordinator, lalu pakai menu **Cetak Sesi**. Hanya berlaku di POS ungu.
   - **Opsi 2, laporan POS Shift Closing di dashboard.** Buka dashboard dengan akun koordinator, cari **POS Shift Closing** di kotak pencarian, lalu pilih laporan POS Shift Closing. Laporan ini lebih ringan daripada Sales Payment Summary. Jika tautan laporan tidak bisa dibuka, cukup cari lewat kotak pencarian.
3. Pada satu tiket closing, CS juga mengarahkan outlet ke laporan **Sales Payment** yang lebih ringan daripada Sales Payment Summary.

## Verifikasi

- Data kasir yang dibutuhkan untuk closing sudah tampil di salah satu laporan alternatif.
- Kasir bisa melanjutkan closing.

## Jika Masih Gagal

- Jika seluruh sistem lambat atau tidak bisa dibuka (bukan hanya satu laporan), pada tiket yang ada penyebabnya adalah server bermasalah. Teruskan ke tim Thunderlab.
- Laporan lain bisa ikut antri. Untuk **Sales by Product**, jawaban CS sama: minta menunggu, jangan spam klik atau refresh, lalu buka laporan lagi setelah menunggu.
- Untuk laporan **Sales Register** yang lambat, belum ada alternatif (tiket masih dalam pengecekan oleh developer).

## Catatan untuk CS

- Jawaban singkat yang dipakai selama ini: "ditunggu dahulu, jangan di-spam", lalu tawarkan opsi di atas.
- Penyebab lambatnya laporan belum dijelaskan di tiket.
- Pada satu tiket, pertanyaannya adalah transaksi akun koordinator yang tidak muncul di Sales Payment Summary semua kasir. Hasil akhirnya: transaksi koordinator sudah masuk ke laporan.

## Perlu dikonfirmasi

- Berapa lama outlet sebaiknya menunggu sebelum beralih ke opsi 1 atau 2.
- Apakah laporan Sales Payment (yang lebih ringan) resmi boleh dipakai untuk closing, atau hanya POS Shift Closing dan cetak sesi.

## Sumber

Tiket CS di log tiket (nomor baris): 31, 32, 36, 37, 40, 47, 50, 61, 71, 105.
