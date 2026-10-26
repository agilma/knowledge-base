---
title: Purchase Invoice Gagal Submit Karena Harga Berbeda dari PO
slug: purchase-invoice-gagal-submit-selisih-po
type: MASALAH
collection: murni-erpnext
excerpt: Purchase Invoice tidak bisa disubmit dengan pesan over limit karena harga berbeda dari PO. Cek perbedaannya dengan PO; bila memang berbeda, perlu persetujuan. Menurut pemilik penyetujunya Area Manager, sedangkan tiket mencatat akun purchasing.
---
## Konteks

Saat admin outlet men-submit **Purchase Invoice (PI)**, sistem menolaknya. Pesan yang muncul, misalnya:

> This document is over limit by Amount ... for item ...

Artinya ada perbedaan harga antara dokumen **Purchase Order (PO)** dan PI. Gejala lain dari tiket yang sama:

- PI tidak bisa disubmit padahal tidak ada data yang kembar.
- Muncul pesan bahwa kenaikan harga salah satu item melebihi batas persen tertentu.
- PI tidak bisa disetujui karena ada perbedaan harga antara PO dan PI.
- PI tidak bisa disetujui karena tanggalnya mundur (backdate).

## Prasyarat

- Akses melihat dokumen PO dan PI yang bersangkutan.
- Tahu siapa yang menyetujui selisih (lihat Langkah 6 dan "Perlu dikonfirmasi").

## Langkah Pemeriksaan

1. Buka dokumen **PO** yang menjadi dasar.
2. Buka dokumen **PI** yang gagal disubmit.
3. Cari **nomor item** yang disebut di pesan error.
4. Cek apakah ada perbedaan harga item itu di PO dan di PI.
5. Jika ada perbedaan, tanyakan ke pembuat PI: apakah harganya memang berbeda, atau salah input.
6. Jika memang berbeda, PI perlu **persetujuan** sebelum bisa disubmit.
   - **Menurut pemilik (26 Okt 2026): yang menyetujui adalah Area Manager (role manager operasional).**
   - **Di tiket sampai sekarang**, penyelesaiannya adalah meminta **purchasing** menyetujui atau men-submit. Salah satu tiket menyebut bahwa hanya purchasing yang bisa submit selisih harga (over billing), dan beberapa tiket lain mencatat "akun purchasing dibukakan akses untuk approve".
7. PI yang tanggalnya mundur (backdate) butuh akses approve tambahan. Tiket menyelesaikannya dengan menambahkan akses approve.

## Verifikasi

- PI berhasil disubmit setelah mendapat persetujuan.
- Tidak ada pesan over limit lagi untuk item tersebut.

## Jika Masih Gagal

- Jika pembuat PI tidak yakin harga mana yang benar, jangan paksa submit. Pada satu tiket, CS mengarahkan untuk memastikan ke pembuat dokumen apakah harga memang berbeda atau salah ketik.
- Jika pesan error berbeda dari yang di atas, teruskan ke tim Thunderlab.

## Catatan untuk CS

- Pesan error yang sama muncul berulang pada beberapa outlet Murni.
- Tiket yang sama bisa muncul sebagai "tidak bisa submit" atau "tidak bisa approve". Keduanya mengacu pada perbedaan harga PO dan PI.
- Ada permintaan kebijakan PI (belum diterapkan, status masih menunggu): jika harga berbeda, qty berbeda, atau PI tanpa PO, persetujuan perlu dari Purchasing, Area Manager (Manager Operasional), serta Manager Keuangan dan Controller.
- Sesuai tiket lain, role manager operasional sudah diberi izin membatalkan (cancel) Purchase Invoice Receipt (TT).
- PI antar-Murni yang tidak muncul di akun koordinator pernah diselesaikan dengan menambahkan permission agar akun koordinator bisa mengakses dokumen itu.

## Perlu dikonfirmasi

- **Siapa penyetuju yang resmi**: Area Manager (kata pemilik), purchasing (praktik di tiket), atau ketiga pihak (permintaan kebijakan di tiket yang masih menunggu).
- **Batas selisih harga** yang membuat PI ditolak. Satu tiket menyebut kenaikan harga lebih dari 10 persen. Tiket lain berbunyi "kenaikan harganya kurang 50%", dan maksudnya tidak jelas.
- Apa yang dilakukan bila ternyata salah input, dan siapa yang memperbaikinya.

## Sumber

Tiket CS di log tiket (nomor baris): 62, 64, 65, 76, 81, 92, 107, 115, 116, 123, 124.
