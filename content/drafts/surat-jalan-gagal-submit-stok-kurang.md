---
title: Surat Jalan Tidak Bisa Disubmit karena Stok atau Item Kurang
slug: surat-jalan-gagal-submit-stok-kurang
type: MASALAH
collection: bintang-berkat
excerpt: Surat jalan gagal disubmit dengan error item atau stok kurang padahal produksi dan QC sudah selesai. Cara mengecek Work Order dan Manufactured Qty, serta penyebab lain yang pernah ditemukan.
---
## Konteks

Admin gagal men-submit **Surat Jalan** dengan error seperti "item X kurang" atau "item X tidak ada dalam jadwal produksi", sering kali padahal barangnya menurut produksi dan QC sudah selesai. Dokumen ini merangkum cara memeriksa dan penyebab yang pernah ditemukan di log isu setelah go-live.

## Prasyarat

- Akses melihat Surat Jalan, Sales Order (SO), dan Work Order (WO).
- Nomor SO dan nama item yang error.

## Langkah Pemeriksaan

1. **Cek dulu apakah surat jalan untuk SO itu sudah pernah dibuat.** Buka SO, lalu **Connection**, lalu **Surat Jalan**. Beberapa error "tidak ada dalam jadwal produksi" ternyata karena surat jalannya sudah dibuat sebelumnya lalu ditarik lagi.
2. **Baca error yang tampil.** Kalau isinya "item kurang", ada dua kemungkinan:
   - **Barang belum selesai di produksi atau masih di QC (belum disubmit).** Cara cek: dari Surat Jalan buka tab **Connection**, klik **Sales Order**, buka tab **Connection**, klik **Work Order**, buka tab **Overview**, lalu lihat kolom **Manufactured Qty**. Bandingkan dengan yang mau dikirim.
   - **Stok di gudang yang kurang.** Kalau Manufactured Qty sudah cocok tapi tetap tidak bisa disubmit, tanyakan ke bagian gudang.
3. **Cara membandingkan Manufactured Qty.**
   - Contoh 1: mau kirim 2.000, Manufactured Qty 1.000. Berarti 1.000 belum selesai (tanyakan ke produksi).
   - Contoh 2 (kirim bertahap): jumlahkan yang sudah dikirim dengan yang mau dikirim, lalu kurangi dengan Manufactured Qty. Hasilnya selisih yang masih di produksi. Contoh di log: Manufactured Qty 43.000, sudah dikirim 40.000, mau menambah 8.000, jadi 48.000 dikurangi 43.000 sama dengan 5.000 yang belum selesai. Cara cepat yang tercatat: lihat apakah WO masih berstatus **In progress**.
4. **Kalau perlu, cari tahu stok sebenarnya.** Tanyakan stok nyata item itu di produksi dan setelah produksi, cocokkan dengan sistem. Kalau ketemu selisihnya, pindahkan ke gudang pengirim supaya bisa diambil surat jalan.

## Penyebab lain yang pernah ditemukan

- **Qty di surat jalan lebih besar dari hasil QC.** Contoh: surat jalan 2.000, padahal setelah QC hanya 1.997.
- **Item non-produksi diset sebagai item produksi.** Item yang bukan produksi tapi pengaturannya produksi memicu error jadwal produksi.
- **Item sebenarnya produksi, tapi customer meminta polosan.** Saat menarik SO menjadi Surat Jalan, hapus item itu, lalu **Add row** dan masukkan item tersebut secara manual, kemudian submit.
- **Finish produksi dicatat pada SO yang keliru.** Contoh: dua SO customer yang sama punya item dan qty yang sama; produksi menyelesaikan SO yang satu, sedangkan surat jalan dibuat dari SO yang lain. Disepakati menunggu SO satunya selesai lalu menyamakan.
- **Item dihapus lalu ditambahkan lagi lewat Add row.** Sistem membaca item itu sebagai item baru, tidak terhubung ke Work Order. Setelah kasus ini, dibuat aturan bonus lewat Add row dibatasi 4%.
- **Stock entry berstatus draft yang dihapus gudang** tetap terhitung di WO (jawaban sementara dari hasil uji).
- **Invoice dan surat jalan di sistem lama masih satu paket.** Pada SO lama, invoice sudah mengurangi stok, jadi surat jalan tidak perlu dibuat lagi; SO cukup ditutup.
- **Surat jalan hanya berisi item non-produksi** dari SO yang punya item produksi dan non-produksi: surat jalan tidak terhubung ke SO (tidak terlihat di tab Connection). Telusuri lewat dokumen surat jalan langsung, atau lewat laporan Mutasi Stock Order dengan rentang tanggal minimal satu minggu ke belakang.

## Verifikasi

- Surat jalan berhasil disubmit.
- Stok gudang pengirim berkurang sesuai qty surat jalan.

## Jika Masih Gagal

- Hubungi produksi atau QC untuk menyelesaikan WO yang tertinggal, atau bagian gudang untuk memastikan stok.
- Beberapa kasus di log disebut "indikasi kelolosan sistem" dan diteruskan ke tim sistem. Sertakan nomor SO, nomor surat jalan, nama item, dan pesan error.

## Perlu dikonfirmasi

- Penyebab pasti item yang lolos tanpa terhubung ke Work Order, dan apakah sudah diperbaiki di sistem.
- Cara mengubah pengaturan item dari produksi ke non-produksi (tidak ditulis di log).
- Apakah admin boleh mengganti item sendiri atau harus lewat pemilik atau tim sistem.

## Sumber

Sheet log isu go-live Bintang Berkat (tab JUNI 2024, JULI 2024, AGUSTUS 2024, MEI 2024, dan CATATAN PENYELESAIAN).
