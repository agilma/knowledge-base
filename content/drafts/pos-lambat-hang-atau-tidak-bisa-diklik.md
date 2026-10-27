---
title: POS Lambat, Hang, atau Tidak Bisa Diklik
slug: pos-lambat-hang-atau-tidak-bisa-diklik
type: MASALAH
collection: murni-erp
excerpt: POS loading lama, hang, atau tidak bisa diklik saat ramai atau saat internet tidak stabil. Penyebab yang pernah ditemukan (antrean hitung diskon, laporan periode panjang, RAM, jaringan) dan langkah yang dipakai kasir dan koordinator.
---
## Konteks

Kasir melaporkan POS lambat: loading lama saat pembayaran, layar tidak bisa diklik, atau berputar terus (memproses pesanan), padahal sering kali internet tampak aman. Di log, penyebabnya berbeda-beda dan sebagian berkaitan dengan versi POS (POS hijau 1.8.x, POS ungu, dan versi 2.x).

## Prasyarat

- Kasir masih di halaman POS, dan koordinator atau tim sistem bisa membantu bila perlu.
- Tahu versi POS yang dipakai (hijau atau ungu) dan apakah saat itu ramai.

## Langkah Pemeriksaan

1. **Tutup aplikasi POS lalu buka kembali.** Ini langkah pertama untuk loading lama saat payment, timeout, dan kupon yang menggantung.
2. **POS hang dan tidak bisa diklik sama sekali.** Coba close POS. Kalau masih bermasalah:
   - Hapus atau ganti nama folder `balimurni_pos` di folder backup dokumen.
   - Restart komputer.
   Penyebab yang dicatat: POS memakai RAM besar. Dicatat akan diperbarui di POS versi baru.
3. **Loading lama saat ramai walau internet aman (POS hijau).** Setiap penambahan item membuat sistem menghitung ulang diskon. Saat ramai, hitungan sebelumnya belum selesai padahal item baru sudah ditambahkan, sehingga proses tertahan. Belum ada penyesuaian dari sisi aplikasi. Alternatif yang disarankan: pakai **POS ungu** dengan mode **Belanja Banyak**, terutama untuk transaksi dengan banyak item atau saat antrean panjang.
4. **Hindari menarik laporan periode panjang** (misalnya satu bulan, atau laporan penjualan per produk berulang) di jam ramai, terutama dengan banyak tab terbuka. Ini dicatat sebagai salah satu penyebab POS lambat.
5. **Jaringan tidak stabil dan POS berputar terus saat pindah ke offline, tidak bisa ditutup.** Solusi yang dicatat: close POS secara paksa.
6. **Loading lama saat payment padahal transaksi sudah masuk di database.** Respons dari server sekitar 11 detik. Tutup aplikasi lalu buka kembali.
7. **Muncul pop up timeout (server tidak merespons dalam 10 detik).** Pesan itu sendiri menyebut transaksi mungkin berhasil atau gagal, jadi sebagai saran (bukan kutipan log) periksa riwayat sebelum mengulang transaksi. Penyebab yang dicatat: respons API lama dan batas waktu 10 detik terlalu pendek.

## Verifikasi

- POS kembali bisa diklik dan transaksi bisa dilanjutkan.
- Transaksi yang tadi macet ada di riwayat atau tidak dobel.

## Jika Masih Gagal

- Minta bantuan tim sistem dengan menyebut versi POS, cabang, dan jam kejadian. Beberapa kasus di log ditangani dengan remote ke komputer kasir.

## Perlu dikonfirmasi

- Lokasi pasti folder `balimurni_pos` di komputer kasir.
- Kasus di log di mana nominal total berubah setelah loading (dari 1.732.150 ke 1.719.000 lalu 1.712.935): di log disebut nominal sebenarnya baru terbentuk setelah loading selesai, tetapi penyelesaiannya hanya ditulis "?".
- Apakah POS versi 2.x sudah menghilangkan penyebab hang karena RAM dan antrean hitung diskon.

## Sumber

Sheet log isu List Fitur Tambahan Murni (tab LIVE (PROBLEM & SOP); isu POS lambat, hang, timeout, dan loading Juni sampai September 2026).
