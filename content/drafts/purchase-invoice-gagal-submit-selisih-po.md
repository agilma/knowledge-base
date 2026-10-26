---
title: Purchase Invoice Gagal Submit Karena Harga Berbeda dari PO
slug: purchase-invoice-gagal-submit-selisih-po
type: MASALAH
collection: murni-erpnext
excerpt: Purchase Invoice tidak bisa disubmit dengan pesan over limit karena harga atau selisih harga berbeda dari PO. Cek perbedaannya, lalu minta Area Manager menyetujui bila memang sengaja berbeda.
---
## Konteks

Saat admin outlet atau purchasing men-submit **Purchase Invoice (PI)**, sistem menolaknya. Pesan yang muncul, misalnya:

> This document is over limit by Amount ... for item ...

Artinya harga item di PI lebih tinggi daripada harga di **Purchase Order (PO)** yang menjadi dasarnya, dan selisihnya melewati batas yang diizinkan. Gejala lain dari tiket yang sama:

- PI tidak bisa disubmit padahal tidak ada data yang kembar.
- Muncul pemberitahuan kenaikan harga salah satu item lebih dari batas persen tertentu.
- PI tidak bisa disetujui karena ada perbedaan harga antara PO dan PI.

## Prasyarat

- Akses melihat dokumen PO dan PI yang bersangkutan.
- Tahu siapa yang berhak menyetujui selisih harga: **Area Manager** (role manager operasional).

## Langkah Pemeriksaan

1. Buka dokumen **PO** yang menjadi dasar.
2. Buka dokumen **PI** yang gagal disubmit.
3. Cari **nomor item** yang disebut di pesan error.
4. Bandingkan harga item itu di PO dan di PI. Cek apakah ada perbedaan.
5. Jika ada perbedaan, tanyakan ke pembuat PI: apakah harganya memang berbeda (misalnya mengikuti faktur) atau salah input?
6. Jika salah input, perbaiki harga di PI lalu submit ulang.
7. Jika memang berbeda dan sah, PI perlu **disetujui Area Manager** sebelum bisa disubmit.

## Verifikasi

- PI berhasil disubmit setelah harga diperbaiki, atau setelah disetujui Area Manager.
- Tidak ada pesan over limit lagi untuk item tersebut.

## Jika Masih Gagal

- Jika PI dibuat dengan tanggal mundur (backdate) dan tidak bisa disetujui, penyebabnya berbeda dan butuh penambahan akses approve untuk tanggal mundur.
- Jika pembuat PI tidak yakin harga mana yang benar, jangan paksa submit. Minta konfirmasi dulu ke pembuat PO atau purchasing.
- Eskalasi ke tim Thunderlab hanya bila pesan error berbeda dari yang di atas. Sertakan nomor PO, nomor PI, nomor item, dan foto layar.

## Catatan untuk CS

- Dalam tiket sebelumnya, penyelesaiannya sering ditulis "akun purchasing dibukakan akses untuk approve". Sesuai konfirmasi pemilik, yang berhak menyetujui selisih adalah Area Manager (role manager operasional).
- Satu tiket menyebut bahwa submit selisih harga (over billing) hanya bisa dilakukan oleh purchasing. Jangan membuka akses submit ke admin outlet tanpa persetujuan.
- Pesan error yang sama pernah berulang pada banyak outlet. Jawab dengan langkah di atas, bukan dengan membuka akses terlebih dahulu.

## Perlu dikonfirmasi

- Batas selisih harga yang membuat PI ditolak. Dalam tiket tertulis 10 persen pada satu kejadian dan 50 persen pada kejadian lain, jadi angkanya belum jelas dan mungkin berbeda per pengaturan.
- Apakah Area Manager atau purchasing yang melakukan submit setelah menyetujui, dan bagaimana cara persetujuannya dilakukan di sistem.

## Sumber

Tiket CS di log tiket (nomor baris): 62, 64, 76, 81, 92, 107, 115, 124.
