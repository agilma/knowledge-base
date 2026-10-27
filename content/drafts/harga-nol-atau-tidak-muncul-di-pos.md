---
title: Harga 0, Harga Tidak Muncul, atau Item Disabled di POS
slug: harga-nol-atau-tidak-muncul-di-pos
type: MASALAH
collection: murni-erp
excerpt: Barang yang punya harga tampil Rp0 saat add to cart, harga tidak muncul untuk toko tertentu, atau item disabled masih tampil di POS. Penyebab dan langkah penanganannya.
---
## Konteks

Kasir melaporkan harga item tampil **0**, harga tidak muncul sama sekali, harga berbeda dari nota, atau item yang sudah disabled masih muncul di POS dan error saat dipakai.

## Prasyarat

- Kode item dan cabang atau toko yang terdampak.
- Akses ke master item dan item price (tim sales atau tim sistem).

## Langkah Pemeriksaan

1. **Item ada harganya, tapi saat add to cart jadi 0.** Periksa satuan (UOM). Penyebab di log: UOM default penjualan di master item adalah ST, sedangkan harganya diinput untuk UOM Pcs. Ubah **satuan UOM default sales** di master item.
2. **Harga tidak muncul untuk toko tertentu.** Harga mungkin belum diinput untuk price list toko itu. Contoh di log: harga dan modal untuk dua toko tidak lagi terpusat, sehingga tim sales harus menginput harga di **Item Price** dengan memilih price list toko tersebut (contoh "M10 HET").
3. **Harga 0 saat di-scan.** Periksa masa berlaku harga (**valid up to**). Pada satu kasus di log harga habis masa berlakunya.
4. **Harga di POS berbeda dengan harga di nota.** Dicatat karena ada perubahan harga dari tim sales. Teruskan ke kasir sebagai informasi dari tim sales.
5. **Error "item ... is disabled".** Pada satu kasus, item itu duplikat dan salah satunya didisable administrator. Pakai kode item yang tidak didisable. Di POS 1.8.0 item disabled memang belum difilter sehingga tetap tampil. Kalau item memang tidak boleh dijual lagi: hapus dari keranjang, informasikan ke pelanggan, dan ganti dengan item pengganti.

## Verifikasi

- Harga item tampil benar saat add to cart dan sama dengan nota.
- Item yang disabled tidak lagi dipakai untuk transaksi.

## Jika Masih Gagal

Sampaikan ke tim sales (untuk harga) atau tim sistem (untuk UOM dan data item) dengan menyebut kode item, cabang, dan versi POS.

## Perlu dikonfirmasi

- Pengubahan massal satuan item ke Pcs sudah diminta dan dicatat "fix" di log, tetapi hasil akhirnya tidak diuraikan.
- Filter agar item disabled tidak tampil dijanjikan di POS 2.0.0. Perlu dikonfirmasi apakah sudah berlaku di POS 2.1.
- Siapa yang menjaga harga per price list toko (log menyebut tim sales).

## Sumber

Sheet log isu List Fitur Tambahan Murni (tab LIVE (PROBLEM & SOP); isu 10 Juni sampai 7 Agustus 2026).
