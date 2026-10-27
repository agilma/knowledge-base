---
title: Mengambil Data Sell Out dan Sell In Antar Cabang
slug: laporan-sell-out-dan-sell-in
type: PANDUAN
collection: murni-erp
excerpt: Laporan mana yang dipakai untuk penjualan antar cabang (sell out), pembelian (sell in), dan data penjualan toko per bulan, serta catatan tentang laporan Sales Analytics yang berubah.
---
## Konteks

Tim operasional dan purchasing kantor pusat sering perlu data penjualan antar cabang Murni (misalnya untuk menghitung pajak pembelian antar CV), data pembelian, dan data penjualan toko per bulan. Dokumen ini merangkum laporan yang dipakai menurut log.

## Prasyarat

- Akses ke laporan ERP yang bersangkutan.
- Customer sesama Murni sudah diberi customer group yang sesuai.

## Langkah

1. **Sell out ke sesama Murni:** buka laporan **Sales Register**, lalu filter **customer group** sesuai daerah Murni yang dicari.
2. Supaya data mudah diambil, **setiap customer sesama Murni perlu diubah customer group-nya** menjadi group Murni.
3. **Sell in (data pembelian):** lihat dari laporan **Purchase by Product**.
4. **Data penjualan toko per bulan:** patokannya adalah **Sales Register** (bukan payment).

## Catatan

- Laporan **Sales Analytics** bisa berubah-ubah hasilnya karena otomatis menjadi **prepared report** bila pemuatan data lebih dari 15 detik (mekanisme ERPNext). Perbaikan yang dicatat: hook sebelum job untuk memasukkan filter customer internal.

## Verifikasi

- Total penjualan di Sales Register untuk periode dan customer group sesuai harapan.

## Perlu dikonfirmasi

- Cara melihat item yang harga modal atau harga belinya masih 0: pertanyaan ini muncul dua kali di log tanpa jawaban yang bisa dipakai.
- Daftar customer group Murni per daerah (log hanya menyebut "sesuai daerah").

## Sumber

Sheet log isu List Fitur Tambahan Murni (tab LIVE (PROBLEM & SOP); isu 18, 23, dan 26 Juni 2026).
