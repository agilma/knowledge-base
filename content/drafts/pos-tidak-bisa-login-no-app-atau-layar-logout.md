---
title: POS Terbaru Tidak Bisa Login (Error No App) atau Muncul Layar Logout
slug: pos-tidak-bisa-login-no-app-atau-layar-logout
type: MASALAH
collection: murni-erp
excerpt: Kasir atau koordinator tidak bisa login ke POS versi terbaru dengan error No App karena belum punya role Kasir, atau tiba-tiba muncul layar logout. Penyebab dan langkahnya.
---
## Konteks

Setelah POS versi terbaru dipakai, ada dua keluhan yang berulang: akun tidak bisa login dan muncul pesan **No App**, atau tiba-tiba tampil layar logout.

## Prasyarat

- Email akun yang bermasalah dan perannya saat ini (kasir, admin, atau koordinator).
- Akses untuk menambahkan role pengguna (log tidak menyebut siapa pelaksananya).

## Langkah Pemeriksaan

1. **Error "No App" saat login.** Periksa apakah akun punya role **Kasir**. Penyebab di log: akun belum ditambahkan role Kasir.
   - Untuk kasir yang sebelumnya admin: tambahkan role Kasir pada akunnya.
   - Untuk koordinator: tambahkan role Kasir di **role profile** koordinator.
2. **Tampil layar logout di POS terbaru.** Tutup aplikasi lalu buka kembali.

## Verifikasi

- Akun berhasil login dan masuk ke layar kasir.
- Layar logout tidak muncul lagi setelah aplikasi dibuka ulang.

## Jika Masih Gagal

Jalur eskalasi tidak ditulis di log. Sebagai saran, sebut akun, peran, dan versi POS saat melapor.

## Perlu dikonfirmasi

- Siapa yang berhak menambahkan role Kasir (log hanya menulis "ditambahkan role kasir").
- Penyebab layar logout; di log hanya dicatat solusinya, bukan sebabnya.
- Apakah role Kasir sekarang otomatis ikut pada akun baru atau role profile koordinator.

## Sumber

Sheet log isu List Fitur Tambahan Murni (tab LIVE (PROBLEM & SOP); isu POS terbaru 29 sampai 31 Juli 2026).
