---
title: Sales Invoice Tidak Bisa Disimpan: Item Entered Multiple Times
slug: sales-invoice-item-entered-multiple-times
type: MASALAH
collection: murni-erp
excerpt: Sales Invoice gagal disimpan dengan error item entered multiple times karena item yang sama ada di dua baris. Penyebabnya pengaturan Allow multiple item, dan cara menanganinya termasuk untuk barang gratis.
---
## Konteks

Admin atau koordinator gagal menyimpan **Sales Invoice** dengan error seperti "item X entered multiple times". Penyebabnya ada item yang sama di dua baris atau lebih. Sejak pengaturan penjualan diubah agar **Allow multiple item** aktif (untuk kebutuhan scan barcode "pencetitan"), invoice dengan item sama di beberapa baris tidak bisa disimpan.

## Prasyarat

- Nomor invoice atau item yang error.

## Langkah

1. Periksa apakah item yang sama muncul di dua baris atau lebih.
2. **Hapus salah satu baris** item yang sama, lalu simpan (solusi yang dicatat di log). Sebagai saran (tidak tertulis di log): pastikan qty yang dihapus tidak hilang dengan menggabungkannya ke baris yang tersisa.
3. **Kalau salah satunya barang gratis** (kasus 29 Juni 2026):
   - Info yang diberikan ke pengguna: input **diskon 100%** jika itu barang gratis.
   - Solusi dari tim (masih ditandai perlu info ke pusat): buat **invoice terpisah** untuk barang gratis; atau, kalau tetap satu invoice, pakai **satu baris** item dengan diskon yang mengurangi bagian barang gratis.
4. **Scan barcode barang yang sama** (30 April 2026). Penyebab yang dicatat: pengaturan penjualan mengizinkan item ditambahkan berkali-kali dan item belum diisi barcodenya. Log menulis sudah ada pembaruan agar scan item yang sama menambah qty di baris yang sama, tetapi kalimatnya terpotong sehingga cakupannya (termasuk di Sales Invoice) belum jelas.

## Verifikasi

- Invoice berhasil disimpan dan disubmit.
- Total dan diskon sesuai nota.

## Perlu dikonfirmasi

- Kapan boleh memakai "diskon 100% dalam satu baris" dan kapan harus invoice terpisah; di log keduanya muncul sebagai saran tim.
- Aturan dari pusat untuk menampilkan barang gratis di nota (di log disebut perlu info ke pusat).
- Apakah pembaruan scan barcode yang menambah qty di baris yang sama sudah berlaku di semua versi.

## Sumber

Sheet log isu List Fitur Tambahan Murni (tab LIVE (PROBLEM & SOP); isu 30 April, 1 Mei, dan 29 Juni 2026).
