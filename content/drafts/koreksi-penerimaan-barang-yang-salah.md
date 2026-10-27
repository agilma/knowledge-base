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

**Aturan terbaru di log (Agustus 2025):** fitur retur (Pembelian Kembali) dipakai kalau **sudah ada pembayaran**. Kalau **belum ada pembayaran**, penerimaan dibatalkan lalu dibuat baru. Sebelum aturan ini, ada kasus retur yang tidak mengurangi qty di faktur sehingga faktur tetap menagih qty penuh (qty 20.000 padahal diretur 4.000) dan satu faktur hampir dibayar penuh padahal barangnya sudah diretur. Karena itu ikuti jalur di bawah sesuai kondisi, dan periksa qty faktur setelah retur.

1. **Belum ada penjualan atau pembayaran.** Cancel Purchase Receipt, lalu buat penerimaan baru yang benar. Kalau Purchase Invoice sudah ada, urutannya: owner cancel Purchase Invoice, bagian gudang cancel Purchase Receipt, lalu gudang input ulang.
2. **Sudah ada penjualan dari faktur itu** (aturan lama di log). Pakai **Purchase Return** (pembelian kembali): pilih Purchase Receipt, klik **Create**, pilih **Purchase Return**, hapus semua barang kecuali yang ingin diretur, isi qty selisih dengan **tanda minus**, lalu simpan.
   - Qty yang diinput **lebih besar** dari seharusnya (contoh 25.000 padahal 7.500): retur selisihnya.
   - Qty yang diinput **kurang** dari seharusnya: buat Purchase Receipt baru untuk qty yang kurang.
3. **Penerimaan tidak bisa dibatalkan karena barang sudah bergerak.** Buat penerimaan baru yang benar, lalu cancel yang lama.
4. **Stok tersebar di dua gudang.** Pindahkan dulu stoknya ke satu gudang sebelum diretur. Contoh di log: total 30.000, masing-masing 15.000 di dua gudang, dipindah ke satu gudang, diretur, lalu dibuat penerimaan baru dengan item yang benar.
5. **Retur gagal "stok kurang" karena barang sudah diteruskan ke produksi.** Pada satu kasus, produksi belum selesai (finish), sehingga cancel Work Order, cancel persetujuan desain, dan cancel stock entry pengambilan stok dilakukan lebih dulu; penyelesaian akhirnya semua Purchase Receipt dicancel lalu dibuat baru oleh gudang. Pada kasus lain (retur gagal karena stok kurang 5.800), penyebabnya selisih stok di sistem yang sudah diberikan ke produksi lain; ditelusuri lewat Proyeksi Stok dan Jadwal Cetak, lalu stok dibereskan antar bagian.
6. **Ganti supplier padahal barang sudah bergerak.** Duplikat Purchase Receipt, ganti ke supplier yang benar, simpan, lalu retur penerimaan yang awal.

**Kalau Purchase Invoice sudah dibayar:**

7. **Urutan cancel yang benar:** cancel Payment Entry, lalu cancel Purchase Invoice, lalu cancel Purchase Receipt. **Jangan** membatalkan langsung dari Purchase Invoice kalau sudah ada pembayaran, karena hutang supplier jadi minus (satu kasus di log: minus Rp3.000.000 setelah pembatalan lewat menu Isi Harga Pembelian).
8. Kalau ada **Expense Claim** terkait, klik link-nya dan cancel dulu (cara yang dipakai owner untuk penerimaan yang belum dibayar: menu **Isi Harga Pembelian**, hapus filter, cari supplier dan tanggalnya, cancel, lalu cancel Purchase Receipt). Untuk yang sudah dibayar, jangan memakai cara itu tanpa membatalkan pembayarannya dulu.
9. **Uang kembali dari retur:** di menu **Input Harga Pembelian**, dokumen berstatus retur dibuatkan **debit note** dengan nominal harga beli sesuai yang diretur, lalu submit. Setelah itu buka menu **Bayar Supplier** untuk mengambil dananya, lalu submit.

## Verifikasi

- Stok item sesuai jumlah yang benar di gudang tujuan.
- Hutang supplier tidak minus dan nominalnya sesuai.
- Purchase Receipt yang benar tercatat, yang salah berstatus cancel atau retur.

## Perhatian

- Di log ada kasus admin mengubah stok manual di Excel tanpa memberi tahu tim sehingga stok berbeda; koreksi stok dilakukan lewat Adjustment Stock oleh pemilik atau dibantu tim.
- Setelah membuat penerimaan susulan untuk qty yang kurang, qty di Purchase Invoice pernah diedit sehingga penerimaan dan faktur berbeda; periksa keduanya cocok.

## Perlu dikonfirmasi

- Apakah retur yang tidak mengurangi qty di Purchase Invoice (kasus Agustus dan Mei 2025) sudah diperbaiki di sistem, atau selalu harus diperiksa manual.
- Langkah menu rinci untuk Purchase Return dan debit note hanya ditulis ringkas; di log disebut akan dibuat menu khusus untuk menerima pengembalian uang dari retur, tanpa konfirmasi sudah ada atau belum.
- Siapa yang berwenang melakukan cancel Purchase Invoice atau Payment Entry (di log disebut owner) belum dijabarkan.

## Sumber

Sheet log isu go-live Bintang Berkat (tab SEPTEMBER, OKTOBER, NOVEMBER, MEI 2024, dan AGU,SEP 25).
