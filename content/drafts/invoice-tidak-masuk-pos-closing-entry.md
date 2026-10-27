---
title: Penjualan POS Tidak Muncul di POS Closing Entry
slug: invoice-tidak-masuk-pos-closing-entry
type: MASALAH
collection: bintang-berkat
excerpt: Saat mencetak penjualan POS tanggal tertentu, daftar penjualannya kosong atau hilang. Cara memperbaikinya lewat POS Closing Entry: cancel, amend atau duplicate, lalu masukkan ulang invoice.
---
## Konteks

Admin ingin mencetak penjualan POS (menu **Print Penjualan Item POS**) untuk tanggal tertentu, tetapi daftar penjualan tanggal itu hilang atau kosong di **POS Closing Entry**. Di log kejadian ini disebut "cukup sering terjadi" dan biasanya dibantu tim sistem.

## Prasyarat

- Tanggal POS yang bermasalah.
- Akses ke **POS Closing Entry** dan **POS List**.

## Langkah

1. Buka **POS Closing Entry** dan cari dokumen pada tanggal itu.
2. Lihat daftar invoice di dalamnya dan **cek link invoicenya**. Yang benar punya link.
3. Kalau daftar invoice atau link-nya tidak ada, **Cancel** dokumen POS Closing Entry itu, lalu **Duplicate** (atau **Amend**).
4. Pastikan **period end date** dan **posting date** sama.
5. Cari transaksi POS pada tanggal bermasalah di **POS List**.
6. Kembali ke dokumen hasil Amend atau Duplicate, lalu masukkan invoice-nya **satu per satu** lewat **Add row**.
7. Simpan.

## Verifikasi

- Penjualan POS tanggal itu muncul di **Print Penjualan Item POS**.
- Sebagai saran (tidak tertulis di log): cocokkan jumlah invoice di POS Closing Entry dengan transaksi di POS List.

## Perhatian

- Kalau POS tertutup karena komputer sedang update dan transaksi dicatat manual beberapa hari, solusi di log adalah memasukkan semua transaksi itu ke POS pada hari berikutnya.

## Jika Masih Gagal

Minta bantuan tim sistem dengan menyebut tanggal POS dan nomor POS Closing Entry-nya.

## Perlu dikonfirmasi

- Penyebab dokumen atau daftar penjualannya hilang (di log hanya disebut kemungkinan terhapus tidak sengaja).
- Kapan memilih **Amend** dan kapan **Duplicate** (di log keduanya muncul).
- Apakah admin boleh melakukan langkah ini sendiri, atau selalu dibantu tim sistem.

## Sumber

Sheet log isu go-live Bintang Berkat (tab NOVEMBER, APRIL 2024, MEI 2024, JANUARI 2024, dan APRIL,MEI,JUN,jUL 25).
