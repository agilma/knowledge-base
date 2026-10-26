---
title: Mengaktifkan Mode Offline POS Saat Internet atau Server Bermasalah
slug: mode-offline-pos
type: PANDUAN
collection: murni-erpnext
excerpt: Langkah kasir mengaktifkan mode offline POS saat internet mati atau server lambat, apa yang tidak boleh dilakukan, dan keterbatasannya ketika listrik mati.
---
## Konteks

Saat internet mati atau server lambat, POS bisa dipindahkan ke **mode offline** supaya kasir tetap bisa melayani transaksi. Transaksi yang dibuat saat offline disimpan dulu, lalu dikirim saat kembali online. CS sering diminta menuntun kasir mengaktifkannya ketika laporan masuk seperti "sistem lag", "total tidak terhitung", atau "server down".

## Prasyarat

- Kasir masih berada di halaman POS yang sudah terbuka dan sudah login.
- POS sudah terbuka sebelum internet mati atau menjadi tidak stabil.

## Langkah

1. Ketika internet mati, klik tombol **Reload produk**.
2. Akan muncul **hitung mundur 30 detik** untuk berpindah ke mode offline. **Tunggu sampai selesai.**
3. Setelah hitung mundur selesai, POS sudah berpindah ke **mode offline** dan transaksi bisa dilanjutkan.
4. Jika kendalanya server (bukan internet) dan POS terus loading, cara lain yang pernah dipakai CS adalah **mencabut kabel LAN** komputer kasir supaya POS berpindah ke mode offline.

**Yang tidak boleh dilakukan**

- Jangan **logout lalu login** lagi saat internet tidak stabil. Jika login gagal, POS tidak bisa dibuka dan tidak akan berpindah ke mode offline.

## Verifikasi

- POS menampilkan bahwa sedang dalam mode offline dan kasir bisa menambah item serta menyelesaikan transaksi.
- Setelah internet kembali, transaksi offline muncul di riwayat transaksi. Jika ada yang tidak masuk, ikuti dokumen **Panduan Penyelesaian POS Gagal Closing**.

## Perhatian

- Harga dan diskon di mode offline bisa berbeda dengan mode online setelah kembali online. Lihat dokumen **Harga atau Diskon di POS Tidak Sesuai**.
- Jika **listrik mati mendadak saat transaksi atau saat mencetak struk**, transaksi yang belum selesai bisa hilang. Kasus ini **belum tertangani oleh sistem**, dan tim sedang mempertimbangkan solusinya. Catat nominal yang sudah dibayar customer dan input manual setelah komputer menyala.

## Perlu dikonfirmasi

- Apakah mencabut kabel LAN aman dan boleh disarankan secara umum, atau hanya untuk kondisi tertentu.
- Apakah langkah di atas sama untuk POS hijau dan POS ungu.

## Sumber

Tiket CS di log tiket (nomor baris): 57, 58, 59, 97, 106.
