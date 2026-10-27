---
title: Revisi atau Cancel Sales Order yang Sudah Disubmit
slug: revisi-atau-cancel-sales-order-yang-sudah-submit
type: PANDUAN
collection: bintang-berkat
excerpt: Cara mengubah item, qty, atau harga pada Sales Order yang sudah disubmit, termasuk yang sudah punya invoice, DP, Work Order, atau item subkon, dan kapan lebih baik menutup SO lalu membuat SO baru.
---
## Konteks

Sales Order (SO) yang sudah disubmit kadang perlu direvisi: salah item, salah qty, salah harga, atau customer membatalkan. Langkahnya berbeda bergantung pada dokumen apa saja yang sudah terhubung ke SO itu (invoice, pembayaran DP, Work Order, Material Request subkon, atau surat jalan).

## Prasyarat

- Nomor SO dan perubahan yang diminta.
- Cek tab **Connection** di SO untuk melihat dokumen yang sudah terhubung.

## Langkah

1. **SO sudah ada invoice dan pembayaran (salah item):** cancel Payment, cancel Invoice, lalu **Update Item** di SO, kemudian tarik Invoice dan Payment ulang.
2. **SO sudah ada invoice dan DP, perlu revisi:** versi awal: cancel Invoice, buka Payment Entry (kwitansi) dan cancel DP lama, input DP lagi, lalu tarik SO menjadi Invoice lagi. Versi yang lebih sederhana di log: cancel Invoice lalu **Amend**.
3. **Invoice dobel DP setelah dicancel:** sistem sempat membaca DP lama ditambah DP di invoice baru. Di log disebut sudah dibenahi; cara kerjanya cancel Invoice lalu tarik lagi.
4. **SO berisi item produksi:** pada kasus di log, Work Order dicancel dulu, lalu Update Item (pada satu kasus dibantu tim lewat akun administrator).
5. **SO berisi item subkon dan muncul error "not allowed to change quantity after submission":** SO yang sudah disubmit masuk ke menu **Pesan ke Subkontraktor** (Material Request). Cancel Material Request-nya dulu, baru Update Item SO.
6. **Surat jalan sudah dibuat:** cancel surat jalan dulu sebelum SO dibuka lagi dan dibenahi.
7. **Qty SO berbeda dengan yang dikirim nyata:** surat jalan harus dibuat **sesuai qty yang keluar secara nyata**. Kalau laporan produksinya juga ingin dirapikan, semua dokumen terkait harus dicancel dan SO direvisi.
8. **Saran tim untuk satu kasus (Mei 2026):** kalau item subkon sudah di-PO-kan dan surat jalan belum terbit, **tutup SO** lalu buat SO baru khusus item yang berubah. Alasannya, mengedit item di SO membuat dokumen PO subkon ikut ter-cancel di sistem sehingga pekerjaan pembuatan PO harus diulang. Ini saran untuk kondisi itu, bukan aturan umum; di kasus lain (Agustus 2024, Februari 2025) caranya cancel Material Request lalu Update Item.
9. **Customer membatalkan SO (salah cetak):** saat SO dicancel, item akan kembali ke stok sistem. Tanyakan dulu apakah barang yang salah cetak akan dibuang atau dijual lagi. Kalau dijual lagi atau dicetak ulang, SO boleh dicancel dan stoknya kembali. Untuk kekeliruan cetak pada retur, log lain menyarankan SO di-close lalu dibuat SO baru untuk item cetak yang benar.
10. **Update Item (langkah dari log Januari 2024):** pilih SO, klik **Update Item**, hapus item yang salah, tambah baris dan item baru. Hak mengubahnya tercatat ada pada pemilik; untuk sementara tim sistem membantu bila pemilik sedang sibuk.
11. **Hanya satu item di surat jalan yang batal:** kalau SO sudah ada invoice, item itu bisa diretur; kalau belum, satu-satunya cara adalah membatalkan dokumen, yang berarti semua item di dalamnya.
12. **Harga invoice lebih murah dari harga SO:** selisihnya pernah dibaca sistem sebagai kekurangan qty (qty yang ditawarkan 3.125 padahal seharusnya 3.000). Dicatat selesai pada 29 Agustus 2025 lewat close otomatis; detail perbaikannya tidak ditulis.

## Verifikasi

- Item, qty, dan harga di SO sudah sesuai.
- Invoice, DP, dan surat jalan yang baru terhubung ke SO yang benar dan tidak dobel.
- Stok sesuai dengan barang yang benar-benar ada.

## Perhatian

- Beberapa kasus di log dikerjakan oleh tim sistem lewat akun administrator, misalnya karena pemilik sedang sibuk dan item di SO perlu segera diubah.

## Perlu dikonfirmasi

- Apakah admin gudang boleh diberi akses **Update Item** (di log ada pertanyaan itu, tanpa jawaban tertulis).
- Langkah menu untuk menghapus tutup SO dan membuka kembali SO tidak ditulis di log.
- Permintaan update item dan hapus tutup SO di bulan Mei 2025 hanya tercatat tanpa penyelesaian.

## Sumber

Sheet log isu go-live Bintang Berkat (tab OKTOBER, JUNI 2024, AGUSTUS 2024, FEBRUARY 25, APRIL,MEI,JUN,jUL 25, dan AGU,SEP 25).
