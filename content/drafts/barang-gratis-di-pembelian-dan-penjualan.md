---
title: Menangani Barang Gratis di Pembelian dan Penjualan
slug: barang-gratis-di-pembelian-dan-penjualan
type: PANDUAN
collection: murni-erp
excerpt: Cara mencatat barang gratis saat menerima barang (Purchase Receipt) dan saat menjual (Sales Invoice), dan keterbatasan tampilan diskon pada nota.
---
## Konteks

Supplier sering memberi barang gratis, dan kadang barang gratis ikut dalam penjualan. Dokumen ini menjelaskan cara mencatatnya sesuai log setelah go-live.

## Prasyarat

- Akses ke Purchase Receipt atau Sales Invoice.

## Langkah

**Barang gratis dari supplier (Purchase Receipt):**

1. Di dokumen Purchase Receipt, pastikan ada kolom (table) **is free**. Log mencatat "table is free belum ada" lalu "tambah table is free", tanpa menyebut siapa pelaksananya; jika belum ada, kemungkinan perlu ditambahkan oleh tim sistem.
2. Centang **is free** pada baris barang yang gratis.
3. Barang gratis boleh sama dengan barang di PO atau bukan.
4. Setelah dicentang, rate di price list otomatis menjadi **0**.

**Barang gratis di penjualan (Sales Invoice):**

5. Jangan memasukkan item yang sama di dua baris. Info yang diberikan ke pengguna: input **diskon 100%** jika itu barang gratis. Solusi dari tim (masih perlu info ke pusat): buat **invoice terpisah** untuk barang gratis, atau tetap satu invoice dengan satu baris yang dikurangi diskon.

## Verifikasi

- Barang gratis tercatat di Purchase Receipt dengan rate 0. Sebagai saran (tidak tertulis di log): periksa stok bertambah sesuai qty.
- Sales Invoice tersimpan tanpa error item ganda.

## Perhatian

- Admin kadang ingin menulis rate asli lalu diskon 100% agar sama dengan nota. Mengacu pada training terakhir, rate barang gratis langsung nol. Kalau tampilan harus sama dengan nota, tim admin perlu menyampaikannya ke pusat agar dibuatkan aturan.

## Perlu dikonfirmasi

- Aturan dari pusat untuk menampilkan diskon barang gratis pada nota.
- Apakah kolom **is free** sudah tersedia di semua Purchase Receipt atau perlu ditambahkan per instalasi.

## Sumber

Sheet log isu List Fitur Tambahan Murni (tab LIVE (PROBLEM & SOP); isu 29 Juni, 20 Juni, dan 6 Juli 2026).
