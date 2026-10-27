---
title: Mengaktifkan Mode Offline POS Saat Internet atau Server Bermasalah
slug: mode-offline-pos
type: PANDUAN
collection: murni-erp
excerpt: Langkah kasir mengaktifkan mode offline POS saat internet mati atau server lambat, apa yang tidak boleh dilakukan, dan keterbatasannya ketika listrik mati.
---
## Konteks

Saat internet mati atau server lambat, POS bisa dipindahkan ke **mode offline** supaya kasir tetap bisa melayani transaksi. CS sering diminta menuntun kasir mengaktifkannya ketika laporan masuk seperti "sistem lag", "total tidak terhitung", atau "loading lama atau server down".

## Prasyarat

- Kasir masih berada di halaman POS yang sudah terbuka dan sudah login.

## Langkah

1. Ketika internet mati, klik tombol **Reload produk**.
2. Akan muncul **hitung mundur 30 detik** untuk berpindah ke mode offline. **Tunggu selama 30 detik.**
3. Setelah itu POS sudah berpindah ke **mode offline** dan transaksi bisa dilanjutkan.
4. Jika kendalanya server (bukan internet) dan komputer loading lama, cara lain yang pernah dipakai CS adalah **mencabut kabel LAN** untuk mengaktifkan POS mode offline.

**Yang tidak boleh dilakukan**

- Jangan **logout lalu login** lagi saat internet tidak stabil. Jika internet tidak stabil, kasir tidak bisa login ke POS dan POS tidak akan berpindah ke mode offline.

## Verifikasi

- POS sudah pindah ke mode offline dan kasir bisa melanjutkan transaksi.
- Setelah internet kembali, transaksi yang dibuat saat offline seharusnya muncul di riwayat transaksi. Jika ada yang tidak muncul, buka POS di **komputer yang sama** saat transaksi, login dengan akun koordinator, buka halaman **Riwayat offline**, klik **Retry**, lalu logout dan login dengan akun kasir untuk closing. Detailnya ada di dokumen **Panduan Penyelesaian POS Gagal Closing**.

## Perhatian

- Harga dan diskon di mode offline bisa berbeda dengan mode online setelah kembali online. Lihat dokumen **Harga atau Diskon di POS Tidak Sesuai**.
- Jika **listrik atau komputer mati mendadak saat transaksi atau saat mencetak struk**, transaksi yang belum selesai bisa hilang. Menurut tiket, kasus ini **belum tercakup oleh sistem**, dan tim akan mendiskusikan solusinya.

## Perlu dikonfirmasi

- Apakah mencabut kabel LAN aman dan boleh disarankan secara umum, atau hanya untuk kondisi tertentu.
- Apakah langkah di atas sama untuk POS hijau dan POS ungu.
- Apa yang harus dilakukan kasir bila listrik mati saat transaksi sedang berlangsung.

## Sumber

Tiket CS di log tiket (nomor baris): 57, 58, 59, 97, 106.
