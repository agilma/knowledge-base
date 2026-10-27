---
title: Panduan Training POS Ungu dan Mode Offline untuk Kasir
slug: panduan-training-pos-ungu-dan-mode-offline
type: PANDUAN
collection: murni-erp
excerpt: Bahan training kasir untuk POS ungu: pindah online ke offline, beda harga offline, Belanja Banyak, closing gagal karena transaksi failed, donasi, retur, credit note, dan jawaban pertanyaan kasir.
---
## Konteks

Panduan untuk kasir dan koordinator toko yang memakai POS ungu. Isinya disusun dari materi training tim dan mencakup cara kerja mode offline, fitur-fitur kasir, penyelesaian closing yang gagal, serta kumpulan pertanyaan kasir saat training.

## Tampilan POS ungu dan POS hijau

_Bagian ini masih perlu dilengkapi: di materi training, bagian perbandingan tampilan POS ungu dan POS hijau belum ada isinya._

## Pindah dari online (ungu) ke offline (hitam)

POS baru pindah ke offline kalau **tiga syarat** ini terpenuhi semua:

1. Internet mati.
2. POS sudah dibuka.
3. Ada aktivitas di POS, contoh: klik add to cart.

Kalau internet mati tapi kasir diam saja, POS tidak akan pindah ke offline. Pancing dengan klik apa saja, misalnya add to cart.

Setelah ada klik, muncul **hitung mundur 30 detik**:

- Dibiarkan sampai habis: POS otomatis pindah ke offline (warna jadi hitam).
- Klik **Jangan**: POS menunggu, lalu tanda pindah muncul lagi. Klik **Jangan** lagi, tanda akan terus muncul berulang.

## Beda POS online dan offline

Di online harga selalu sama dengan dashboard. Di offline harga bisa beda, karena offline perlu sinkron dulu. Sinkron artinya menyamakan data POS dengan dashboard.

- Setiap dini hari, sistem membaca katalog terbaru.
- Katalog itu baru masuk ke POS offline saat POS dihidupkan, dibuka, dan tersambung internet.
- Kalau POS lama tidak dibuka, POS offline masih memakai katalog lama, sehingga harganya bisa beda jauh.

Syarat POS offline sinkron: POS dibuka dan ada internet.

**Contoh: Item A**

- Kemarin harga Item A diubah di dashboard.
- Hari ini jam 09.00 POS dibuka, tapi internet sudah putus sejak pagi. Kasir transaksi di offline dan menambahkan Item A.
- Hasilnya Item A masih memakai harga lama, bukan harga baru, karena POS offline belum sinkron. Supaya sinkron, POS harus dibuka dan ada internet.

## Studi kasus

**Kasus 1: internet mati di tengah transaksi**

Yang harus dilakukan kasir supaya POS pindah ke offline:

1. Tetap beraktivitas di POS, contoh: add to cart.
2. Sistem memberi tanda pindah ke offline dalam 30 detik.
3. Tunggu saja sampai POS pindah sendiri.

**Jangan** menutup atau close POS saat internet mati. POS tidak bisa login lagi karena tidak ada internet.

**Kasus 2: sedang offline, lalu internet kembali stabil**

Akan muncul tanda pindah ke online dalam 30 detik. Saran dari materi training, terutama kalau customer sudah tahu harga saat itu:

1. Klik **Jangan** dulu.
2. Selesaikan transaksi yang sedang berjalan di offline.
3. Setelah selesai, baru pindah ke online.

Kalau terlanjur pindah ke online (lupa klik **Jangan**):

- Item yang sudah masuk cart saat offline tetap memakai harga offline.
- Item baru yang ditambahkan setelah online memakai harga online.
- Jadi satu cart bisa berisi campuran harga lama dan harga baru.

Solusinya: paling baik buat ulang transaksi (kosongkan cart, masukkan ulang item). Alternatifnya, refresh POS.

## Fitur Belanja Banyak

Di Belanja Banyak, total hanya dihitung ulang setelah kasir klik **Refresh**. Tanpa Refresh, totalnya bisa salah. Toggle **Belanja Banyak** ada di atas cart, dan di sebelahnya ada tombol Refresh (ikon panah melingkar).

Cara pakai:

1. Nyalakan toggle **Belanja Banyak**.
2. Add to cart semua item dulu sampai lengkap.
3. Klik **Refresh**. Sistem menghitung ulang total khusus Belanja Banyak.
4. Cek total, lalu lanjut ke pembayaran.

Aturan penting: setiap selesai klik apa pun di cart (tambah item, ubah jumlah, hapus item), wajib klik **Refresh** lagi. Kalau tidak, sistem tidak menghitung ulang.

## Saat POS kembali online

Semua transaksi yang dibuat saat offline otomatis sinkron (terkirim ke dashboard) begitu POS kembali online. Kasir tidak perlu melakukan apa-apa.

## Closing kasir gagal karena ada transaksi failed

Closing kasir (tutupan kasir) tidak bisa dilakukan kalau masih ada transaksi failed, yaitu transaksi yang gagal terkirim ke dashboard. Transaksi bisa failed karena internet tidak stabil atau ada selisih harga.

Solusi:

1. Kasir memberi tahu Koordinator Toko bahwa tidak bisa closing.
2. Koordinator login di POS dengan akunnya sendiri.
3. Buka **Menu Lainnya**, lalu **Riwayat Online**, lalu pilih tab **Failed**.
4. Klik **Retry** pada transaksi yang failed. Kalau berhasil, penyebabnya hanya jaringan, lanjut ke pengecekan setelah Retry di bawah. Kalau tetap gagal, lanjut ke langkah 5.
5. Koordinator menginput transaksi yang failed di dashboard.
6. Koordinator membuka lagi POS tadi, lalu pada transaksi yang failed klik tombol **Input Manual**. Tombol ini menandai bahwa transaksi sudah diinput manual di dashboard.

Ingat: **input dulu di dashboard, baru tandai Input Manual di POS.** Jangan dibalik.

**Pengecekan setelah Retry**

Khusus transaksi yang selesai lewat Retry, koordinator wajib memastikan transaksinya benar-benar masuk ke dashboard:

1. Login ke dashboard.
2. Buka menu **Sales Invoice** (daftar nota penjualan).
3. Cari nomor nota transaksi yang tadi failed.
4. Nota ditemukan: aman. Tidak ditemukan: input manual di dashboard (langkah 5 dan 6 di atas).

## Fitur donasi

Fitur donasi bersifat opsional. Kalau customer berkenan berdonasi atas kelebihan bayar, kasir bisa mengaktifkan fitur **Donasi**:

1. Setelah add to cart dan input nominal pembayaran, klik **Donasi**.
2. Input nilai nominal yang didonasikan.
3. Jika sudah ada tanda donasi di bawah cart, pesan kembalian akan hilang.

## Fitur retur

Retur dilakukan lewat dashboard oleh akun koordinator, dengan syarat customer membawa nota atau bukti pembelian barang di Murni. Cara retur:

1. Koordinator membuka Sales Invoice melalui dashboard.
2. Cari nomor Sales Invoice berdasarkan nota yang dibawa customer, lalu klik Sales Invoice tersebut.
3. Klik **Create**, lalu **Return / Credit Note**.
4. Pastikan **Is Return (Credit Note)** tercentang.
5. Jika barang ada lebih dari satu jenis dan yang diretur hanya satu, hapus (delete) item yang tidak diretur.
6. Sesuaikan qty dengan barang yang diretur. Pastikan qty diinput dengan tanda minus (-).
7. Buka tab **Payment** dan hapus pembayarannya.
8. Klik **Save** lalu **Submit**.

## Pemakaian credit note

Credit note adalah saldo endapan yang diberikan kepada customer setelah retur barang. Nominalnya sesuai nilai barang yang diretur.

- Saldo credit note hanya dapat dipakai satu kali untuk pembelian berikutnya.
- Kalau nilai barang yang dibeli lebih rendah dari saldo credit note, sisa saldo dikembalikan kepada customer dalam bentuk uang tunai.
- Credit note bisa dipakai setelah retur dan setelah Sales Invoice diproses koordinator.

Cara customer memakai credit note:

1. Masuk POS, lalu input nama customer sesuai nota sebelumnya.
2. Akan muncul pop up kalau customer itu punya credit note.
3. Lakukan transaksi seperti biasa.
4. Saat akan membayar, klik **Murni Credit Note**.
5. Cari nomor Sales Invoice yang dipakai customer untuk pembelian sebelumnya.
6. Centang nomor Sales Invoice tersebut, lalu klik **Terapkan**.
7. Nominal transaksi otomatis terpotong sesuai credit note yang dimiliki customer.

Setelah itu:

- Kalau harga barang yang dibeli lebih mahal dari barang sebelumnya, customer wajib membayar kekurangannya (tunai, EDC, dan sebagainya).
- Kalau harga barang lebih murah, kasir memberikan kembalian secara tunai.

## FAQ kasir dan POS

Pertanyaan dari kasir saat training.

**Diskon dan pembayaran**

- *Customer member belanja 5 item, sudah diberi custom discount, lalu menambah item lagi. Kenapa transaksinya tidak bisa dibayar?* Setiap selesai add to cart, kasir wajib klik **Refresh** supaya total dihitung ulang. Setelah Refresh, transaksi bisa dibayar.
- *Diskon tumpuk persen dan rupiah tidak bisa dipakai di POS ungu. Member biasanya dapat diskon 15 persen plus potongan tunai. Bagaimana cara inputnya?* Untuk saat ini diskon item rupiah dinonaktifkan oleh tim Thunder karena bermasalah di POS hijau. Fitur ini akan diaktifkan kembali setelah kasir di semua cabang Murni memakai POS ungu.
- *Ada voucher brand OMG senilai Rp5.000, dan customer belanja campur brand (OMG, Wardah, Originote). Bagaimana cara inputnya?* Pisah nota, karena voucher memotong grand total (total seluruh belanja). Kalau tidak dipisah, voucher OMG ikut memotong belanja brand lain. Nota 1 berisi item OMG saja plus voucher OMG. Nota 2 berisi item brand lain.

**Simpan keranjang**

- *Kasir sudah add to cart banyak item dengan custom discount, tapi customer mau lihat-lihat lagi. Kasir perlu simpan keranjang, tapi di POS tidak bisa. Bagaimana?* POS tidak mengizinkan simpan keranjang yang berisi custom discount. Untuk customer retail yang belanja banyak, input lewat dashboard supaya bisa disimpan sebagai draft. Ada permintaan fitur dari kasir: edit diskon serentak (banyak item sekaligus) di dashboard.
- *Kasir A menyimpan keranjang. Apakah Kasir B bisa melihatnya?* Bisa, semua kasir bisa melihat keranjang tersimpan. Karena itu nama customer di keranjang tersimpan tidak bisa diubah. Saat menyimpan keranjang, langsung masukkan nama customer yang benar. Contoh yang salah: simpan keranjang dengan customer No Name, lalu saat diambil lagi namanya diganti. Ini pasti error karena sistem tidak mengizinkan.

**Retur**

- *Customer membeli lewat Kasir A, lalu minta retur. Apakah retur harus di Kasir A?* Tidak harus. Retur bisa dilakukan di kasir mana saja, asalkan Sales Invoice Return (nota retur penjualan) sudah diinput oleh koordinator lewat dashboard.

## Perlu dilengkapi

- Perbandingan tampilan POS ungu dan POS hijau (bagian kosong di materi training).
- Pertanyaan kasir yang di materi training masih ditandai **belum terjawab**: kemarin sudah tutupan kasir Rp500.000, hari ini ada customer retur dan ada uang yang harus dikembalikan. Apakah closing hari ini boleh jadi minus, dan apa yang harus dilakukan kasir (misalnya memberi tahu akunting)?
- Apakah diskon item rupiah dan diskon tumpuk sudah aktif lagi, dan kapan kasir di semua cabang sudah memakai POS ungu.
- Dokumen ini tumpang tindih dengan dokumen **Mengaktifkan Mode Offline POS** dan **Panduan Penyelesaian POS Gagal Closing**. Perlu diputuskan apakah digabung atau saling menaut.

## Sumber

Dokumen panduan training POS ungu dan mode offline dari tim (materi training kasir, Google Docs).
