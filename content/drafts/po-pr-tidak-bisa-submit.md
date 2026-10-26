---
title: PO atau Purchase Receipt Tidak Bisa Disubmit
slug: po-pr-tidak-bisa-submit
type: MASALAH
collection: murni-erpnext
excerpt: PO atau Purchase Receipt (PR) gagal disubmit karena dokumen draft menumpuk, Material Request sudah pernah ditarik, atau qty PO dan PR berbeda. Cara mengeceknya lewat Connections.
---
## Konteks

Admin outlet atau purchasing gagal men-submit **Purchase Order (PO)** atau **Purchase Receipt (PR)**. Sistem tidak memberi petunjuk yang jelas. Penyebab yang pernah ditemukan CS:

- Satu PO sudah ditarik menjadi PR berkali-kali, sehingga ada banyak PR berstatus **draft** dan PR yang benar tidak bisa disubmit.
- **Material Request (MR)** sudah pernah ditarik menjadi PO dan PO itu sudah disetujui, sehingga PO kedua tidak bisa disubmit atau disetujui.
- **Qty di PO dan di PR berbeda** sehingga PR ditolak karena melebihi (exceeds).

## Prasyarat

- Akses melihat PO, PR, dan MR yang bersangkutan.
- Untuk membatalkan PO yang salah: akun yang berhak membatalkan (dalam tiket dilakukan oleh akun manager).

## Langkah Pemeriksaan

1. Buka dokumen **PO**.
2. Buka bagian **Connections** di PO. Di sana terlihat semua dokumen turunan, misalnya PR yang pernah dibuat dari PO ini. Pilih PR yang terhubung untuk melihat daftarnya.
3. Periksa kasusnya:
   - **Ada banyak PR berstatus draft.** Hapus PR draft yang tidak digunakan, lalu submit PR yang benar.
   - **PO tidak bisa disubmit atau disetujui karena MR sudah pernah ditarik.** Cek di MR apakah sudah ada PO yang disetujui. Bila PO yang sudah ada itu keliru, batalkan PO yang salah lalu buat ulang dengan benar.
   - **Qty PO dan qty PR berbeda.** Samakan qty PR dengan PO (atau ubah PO bila memang berbeda), lalu submit ulang.

## Verifikasi

- PR atau PO berhasil disubmit.
- Di Connections PO hanya tersisa dokumen turunan yang memang dipakai.

## Jika Masih Gagal

- Jika pesan errornya tidak sesuai tiga kasus di atas, eskalasi ke tim Thunderlab dengan nomor PO, nomor PR atau MR, dan foto layar pesan error.
- Jika PO yang akan dibatalkan sudah disetujui dan perlu dibatalkan, pastikan dengan pembuat PO sebelum membatalkan.

## Catatan untuk CS

- Penanya sering hanya menulis "kenapa tidak bisa submit" dengan foto. Minta nomor dokumennya, lalu mulai dari Connections.
- Mengedukasi penanya mencari sendiri lewat Connections lebih baik daripada menghapus dokumen untuknya.

## Perlu dikonfirmasi

- Siapa yang boleh membatalkan PO yang sudah disetujui (di tiket dilakukan akun manager).
- Apakah ada cara mencegah banyak PR draft dari satu PO.

## Sumber

Tiket CS di log tiket (nomor baris): 9, 26, 102, 112, 114.
