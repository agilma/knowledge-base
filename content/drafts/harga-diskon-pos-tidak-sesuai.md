---
title: Harga atau Diskon di POS Tidak Sesuai
slug: harga-diskon-pos-tidak-sesuai
type: MASALAH
collection: murni-erpnext
excerpt: Kasir melihat harga 0, muncul pesan perubahan harga saat bayar, atau diskon dan harga berbeda antara mode offline dan online. Langkah per gejala dari tiket CS.
---
## Konteks

Kasir POS melaporkan angka yang tidak sesuai saat transaksi. Gejala dan apa yang dilakukan CS pada tiket yang ada:

| Gejala | Yang tercatat di tiket |
| --- | --- |
| Muncul pesan ada perubahan harga saat klik bayar (POS hijau) | Penyebab belum dijelaskan. Diselesaikan dengan simpan keranjang lalu checkout |
| Harga item menjadi 0, atau harga yang tampil tidak sesuai | Pada satu kejadian ada diskon yang diaktifkan tanpa pengaturan company dan brand, sehingga semua item terkena efeknya. Pada kejadian lain harga masih tersetting dengan masa berlaku (valid up to) |
| Jumlah berbeda setelah kembali online | Harga bisa berbeda antara mode offline dan online |
| Transaksi offline gagal setelah sistem normal | Perhitungan diskon saat offline berbeda dengan saat online |
| Transaksi nominal kecil dengan diskon tidak bisa dibayar | Penyebab belum dijelaskan |
| Voucher masih terpakai setelah masa berlaku, atau diskon reguler tidak terhitung | Pada tiket yang ada diarahkan **update ke POS ungu** |

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
6. Catatan: fitur simpan keranjang saat ini **hanya bisa digunakan sekali**, lalu langsung ditransaksikan. Setelah disimpan, keranjang tidak bisa diisi lagi.

**Harga tampil 0 atau tidak sesuai**

1. **Konfirmasi ke tim sales** apakah ada diskon atau harga yang baru diaktifkan, atau yang masa berlakunya (valid up to) masih tersetting.
2. Jika transaksi **belum disubmit**, klik tombol **refresh** di samping tombol belanja untuk memuat harga terbaru.
3. Jika transaksi **sudah terlanjur disubmit**, batalkan (void) transaksinya dengan akun koordinator, lalu buat kembali dengan harga yang benar.

**Harga berbeda antara offline dan online**

1. Jelaskan bahwa perbedaan harga antara mode offline dan online memang mungkin terjadi.
2. Saat POS berpindah dari offline ke online dan muncul peringatan perubahan mode, jangan diabaikan jika ada transaksi yang sedang berjalan, karena akan ada perubahan harga.
3. Selisih yang sudah terlanjur dibayar customer dikoordinasikan dengan tim manajemen: dikembalikan ke customer atau diselesaikan dengan cara lain.

**Transaksi offline gagal karena perhitungan diskon berbeda**

1. Input transaksinya sebagai **Sales Invoice secara manual**, sesuai nominal yang dibayar customer.
2. Saat input Sales Invoice, **centang "ignore pricing rule"** dan **isi channel dengan "Sales"**. Tanpa itu, nominal hasil submit bisa berbeda dari nota (tanpa diskon).
3. Langkah lengkap penanganan transaksi yang gagal ada di dokumen **Panduan Penyelesaian POS Gagal Closing**.

**Voucher atau diskon tidak sesuai (POS hijau)**

1. Pada tiket yang ada, solusinya **update ke POS ungu** (dikerjakan lewat remote oleh tim).
2. Selisih harga yang sudah terjadi dikonfirmasi langsung ke tim manajemen.

## Verifikasi

- Harga dan diskon yang tampil di POS sesuai dengan promo yang berlaku.
- Transaksi tersimpan atau disubmit dengan nominal yang sama dengan yang dibayar customer.

## Jika Masih Gagal

- Pada kasus transaksi nominal kecil dengan diskon yang tidak bisa dibayar, tiket mencatat: edit diskon kembali, tekan refresh, dan **minta kasir merekam video** proses tersebut. Teruskan videonya ke tim Thunderlab.

## Catatan untuk CS

- Pada dua tiket harga 0 atau tidak sesuai, penyebabnya ada di **pengaturan promo atau harga oleh tim sales**. Karena itu CS mengarahkan penanya untuk konfirmasi ke tim sales.
- Bila transaksi sudah dibayar customer dengan nominal berbeda, keputusan soal selisih dikoordinasikan dengan manajemen.

## Perlu dikonfirmasi

- Penyebab dan solusi tetap untuk pesan perubahan harga saat bayar, dan untuk transaksi nominal kecil dengan diskon yang gagal dibayar.
- Apakah "update ke POS ungu" menjadi solusi umum untuk voucher kedaluwarsa dan diskon tidak terhitung, atau hanya untuk kasus-kasus tiket itu.
- Apakah ada panduan resmi untuk pengembalian selisih ke customer.

## Sumber

Tiket CS di log tiket (nomor baris): 29, 48, 78, 82, 83, 85, 90, 93, 94, 96, 101.
