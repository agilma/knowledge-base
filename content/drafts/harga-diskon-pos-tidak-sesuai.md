---
title: Harga atau Diskon di POS Tidak Sesuai
slug: harga-diskon-pos-tidak-sesuai
type: MASALAH
collection: murni-erpnext
excerpt: Kasir melihat harga 0, muncul pesan perubahan harga saat bayar, atau diskon berbeda antara mode offline dan online. Penyebab umum adalah pengaturan promo dan harga yang berubah saat transaksi berjalan.
---
## Konteks

Kasir POS melaporkan angka yang tidak sesuai saat transaksi. Gejala dan penyebab yang pernah ditemukan CS:

| Gejala | Penyebab yang ditemukan |
| --- | --- |
| Muncul pesan ada perubahan harga saat klik bayar (POS hijau) | Harga berubah di sistem ketika transaksi sedang disiapkan |
| Harga item yang di-scan menjadi 0, atau tampilan harga tidak sesuai | Ada diskon yang diaktifkan tanpa pengaturan company dan brand sehingga semua item terkena efeknya, atau harga masih tersetting dengan masa berlaku (valid up to) |
| Jumlah berbeda setelah kembali online | Harga dan diskon di mode offline bisa berbeda dengan di mode online |
| Transaksi gagal setelah sistem normal | Perhitungan diskon saat offline tidak sama dengan perhitungan saat online |
| Transaksi nominal kecil dengan diskon tidak bisa dibayar | Penyebab belum dijelaskan |

## Prasyarat

- Akun **koordinator** untuk membatalkan (void) transaksi dan membuat ulang.
- Kontak tim sales atau manajemen untuk memastikan promo dan harga yang berlaku.

## Langkah Pemeriksaan

**Muncul pesan perubahan harga saat bayar**

1. Klik **Simpan keranjang**.
2. **Checkout** item tersebut.
3. Pastikan customer dan metode pembayaran sudah sesuai.
4. Klik **Bayar**.
5. Jika transaksi belum terbentuk, kasir membuat pesanan yang sama dengan harga yang sudah diperbarui.

**Harga tampil 0 atau tidak sesuai**

1. **Konfirmasi ke tim sales** apakah ada diskon atau harga yang baru diaktifkan, atau yang masa berlakunya belum diatur.
2. Jika transaksi **belum disubmit**, klik tombol **refresh** di samping tombol belanja untuk memuat harga terbaru.
3. Jika transaksi **sudah terlanjur disubmit**, batalkan (void) transaksinya dengan akun koordinator, lalu buat kembali dengan harga yang benar.

**Harga berbeda antara offline dan online**

1. Jelaskan bahwa perbedaan harga antara mode offline dan online memang mungkin terjadi.
2. Saat POS berpindah dari offline ke online dan muncul peringatan perubahan mode, jangan diabaikan jika ada transaksi yang sedang berjalan, karena harga pasti berubah.
3. Selisih yang sudah terlanjur dibayar customer dikoordinasikan dengan tim manajemen: dikembalikan ke customer atau diselesaikan dengan cara lain.

**Transaksi offline gagal setelah sistem normal karena diskon berbeda**

1. Input transaksinya sebagai Sales Invoice manual sesuai nominal yang dibayar customer.
2. Detail langkah input manual ada di dokumen **Panduan Penyelesaian POS Gagal Closing**.

## Verifikasi

- Harga dan diskon yang tampil di POS sesuai dengan promo yang berlaku.
- Transaksi tersimpan atau disubmit dengan nominal yang sama dengan yang dibayar customer.

## Jika Masih Gagal

- Pada kasus transaksi nominal kecil dengan diskon yang tidak bisa dibayar, tiket hanya mencatat: edit diskon kembali, tekan refresh, dan **minta kasir merekam video** proses tersebut untuk dianalisis. Eskalasi ke tim Thunderlab dengan video tersebut.
- Jika harga 0 muncul pada banyak item dan banyak outlet sekaligus, segera hubungi tim sales karena kemungkinan ada promo yang diaktifkan tanpa batasan brand.

## Catatan untuk CS

- Banyak kasus harga 0 atau tidak sesuai bersumber dari **pengaturan promo oleh tim sales**, bukan dari POS. Arahkan penanya ke tim sales untuk memastikan.
- Bila transaksi sudah dibayar customer dengan nominal berbeda, keputusan pengembalian selisih ada di manajemen, bukan CS.

## Perlu dikonfirmasi

- Penyebab dan solusi tetap untuk transaksi nominal kecil dengan diskon yang gagal dibayar.
- Apakah ada panduan resmi untuk pengembalian selisih ke customer.

## Sumber

Tiket CS di log tiket (nomor baris): 29, 48, 78, 83, 96, 101.
