---
title: Koreksi Penerimaan Barang yang Salah (Item, Qty, atau Supplier)
slug: koreksi-penerimaan-barang-yang-salah
type: PANDUAN
collection: bintang-berkat
excerpt: Cara memperbaiki Purchase Receipt yang salah item, qty, atau supplier: cancel dan buat baru, Purchase Return, debit note untuk yang sudah dibayar, dan urutan cancel yang benar.
---
## Konteks

Bagian gudang atau admin kadang salah saat menginput **Purchase Receipt** (penerimaan barang): salah item, qty lebih atau kurang, atau supplier keliru. Cara memperbaikinya bergantung pada apakah barangnya sudah terjual atau terpakai, dan apakah **Purchase Invoice** sudah dibayar.

## Prasyarat

- Nomor Purchase Receipt yang salah dan nilai yang seharusnya.
- Tahu apakah barangnya sudah terjual, terpakai produksi, atau sudah dibayar.

## Langkah

**Pilih jalur sesuai kondisi:**

1. **Belum ada penjualan atau pembayaran.** Cancel Purchase Receipt, lalu buat penerimaan baru yang benar. Kalau Purchase Invoice sudah ada, urutannya: owner cancel Purchase Invoice, bagian gudang cancel Purchase Receipt, lalu gudang input ulang.
2. **Sudah ada penjualan dari faktur itu.** Pakai **Purchase Return** (pembelian kembali): pilih Purchase Receipt, klik **Create**, pilih **Purchase Return**, hapus semua barang kecuali yang ingin diretur, isi qty selisih dengan **tanda minus**, lalu simpan.
   - Qty yang diinput **lebih besar** dari seharusnya (contoh 25.000 padahal 7.500): retur selisihnya.
   - Qty yang diinput **kurang** dari seharusnya: buat Purchase Receipt baru untuk qty yang kurang.
3. **Penerimaan tidak bisa dibatalkan karena barang sudah bergerak.** Buat penerimaan baru yang benar, lalu cancel yang lama.
4. **Stok tersebar di dua gudang.** Pindahkan dulu stoknya ke satu gudang sebelum diretur. Contoh di log: stok dibagi 15.000 di dua gudang, dipindah ke satu gudang, diretur, lalu dibuat penerimaan baru dengan item yang benar.
5. **Retur gagal "stok kurang" karena barang sudah dipakai produksi.** Kalau produksi belum selesai (finish): cancel Work Order, cancel persetujuan desain, dan cancel stock entry pengambilan stok, baru lakukan retur.
6. **Ganti supplier padahal barang sudah bergerak.** Duplikat Purchase Receipt, ganti ke supplier yang benar, simpan, lalu retur penerimaan yang awal.

**Kalau Purchase Invoice sudah dibayar:**

7. **Urutan cancel yang benar:** cancel Payment Entry, lalu cancel Purchase Invoice, lalu cancel Purchase Receipt. **Jangan** membatalkan langsung dari Purchase Invoice kalau sudah ada pembayaran, karena hutang supplier jadi minus (terjadi pada satu kasus di log).
8. Kalau ada **Expense Claim** terkait, klik link-nya dan cancel dulu. Di menu **Isi Harga Pembelian**, hapus filter, cari supplier dan tanggalnya, klik cancel, lalu kembali ke dokumen awal dan cancel Purchase Receipt.
9. **Uang kembali dari retur:** di menu **Input Harga Pembelian**, dokumen berstatus retur dibuatkan **debit note** dengan nominal harga beli sesuai yang diretur, lalu submit. Setelah itu buka menu **Bayar Supplier** untuk mengambil dananya, lalu submit.

## Verifikasi

- Stok item sesuai jumlah yang benar di gudang tujuan.
- Hutang supplier tidak minus dan nominalnya sesuai.
- Purchase Receipt yang benar tercatat, yang salah berstatus cancel atau retur.

## Perhatian

- Stok tidak boleh diubah manual di luar sistem. Selisih lama dikoreksi lewat Adjustment Stock.

## Perlu dikonfirmasi

- Di log ada kasus retur yang tidak mengurangi qty di Purchase Invoice (qty tetap 20.000 padahal diretur 4.000, dan satu faktur yang barangnya sudah diretur tetap muncul untuk dibayar). Log menyebut kasus ini masih ditelusuri, dan aturannya baru disimpulkan: retur boleh dipakai kalau sudah ada pembayaran, kalau belum ada pembayaran penerimaan dibatalkan dan dibuat baru. Perlu dikonfirmasi apakah perilaku sistem sudah diperbaiki.
- Langkah menu rinci untuk Purchase Return dan debit note hanya ditulis ringkas; di log disebut akan dibuat menu khusus untuk menerima pengembalian uang dari retur, tanpa konfirmasi sudah ada atau belum.
- Siapa yang berwenang melakukan cancel Purchase Invoice atau Payment Entry (di log disebut owner) belum dijabarkan.

## Sumber

Sheet log isu go-live Bintang Berkat (tab SEPTEMBER, OKTOBER, NOVEMBER, MEI 2024, dan AGU,SEP 25).
