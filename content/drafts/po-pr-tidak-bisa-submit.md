---
title: PO atau Purchase Receipt Tidak Bisa Disubmit
slug: po-pr-tidak-bisa-submit
type: MASALAH
collection: murni-erpnext
excerpt: PO atau Purchase Receipt (PR) gagal disubmit karena PR draft menumpuk, Material Request sudah pernah ditarik, atau qty PO dan PR berbeda. Cara mengeceknya lewat Connections di PO.
---
## Konteks

Admin outlet atau purchasing gagal men-submit **Purchase Order (PO)** atau **Purchase Receipt (PR)**. Penyebab yang pernah ditemukan CS:

- Satu PO ditarik menjadi PR berkali-kali, sehingga ada banyak PR berstatus **draft** (pada satu tiket 8 dokumen) dan PR yang benar tidak bisa disubmit.
- **Material Request (MR)** sudah pernah ditarik menjadi PO dan PO itu sudah disetujui, sehingga PO kedua tidak bisa disubmit atau disetujui.
- **Qty di PO dan di PR berbeda**, sehingga PR ditolak karena melebihi (exceeds).

## Prasyarat

- Akses melihat PO, PR, dan MR yang bersangkutan.

## Langkah Pemeriksaan

1. Buka dokumen **PO**.
2. Buka bagian **Connections** di PO. Di sana terlihat dokumen yang terhubung dengan PO ini. Pilih PR yang terhubung untuk melihat daftarnya.
3. Cocokkan dengan kasusnya:
   - **Banyak PR berstatus draft.** Hapus PR yang tidak digunakan, lalu submit PR yang benar.
   - **PO tidak bisa disubmit atau disetujui karena MR sudah pernah ditarik menjadi PO.** Cek bahwa MR itu sudah pernah ditarik dan PO-nya sudah disetujui. Jika ada kesalahan, PO yang salah **dibatalkan (cancel)**. Pada tiket yang ada pembatalan dilakukan dengan akun seorang Area Manager.
   - **Qty PO dan qty PR berbeda.** Itu penyebab PR tidak bisa disubmit. Pada tiket CS hanya menyampaikan penyebabnya.

## Verifikasi

- PR atau PO berhasil disubmit.
- Di Connections PO hanya tersisa dokumen yang memang dipakai.

## Jika Masih Gagal

- Jika pesan errornya tidak sesuai tiga kasus di atas, teruskan ke tim Thunderlab.

## Catatan untuk CS

- Mengedukasi penanya mencari sendiri lewat Connections adalah cara yang dipakai CS pada tiket PO yang ditarik berkali-kali.
- Ada tiket terkait: penolakan (reject) PO oleh akun Area Manager pernah gagal karena workflow berubah, dan diselesaikan dengan memperbaiki workflow.
- Ada permintaan (belum diterapkan, status masih menunggu) agar Area Manager (Manager Operasional) bisa menghapus dan membatalkan PO, PR, PI, SO, DN, dan SI untuk membantu dokumen yang tersangkut.
- Pada tiket input PO yang itemnya macet atau tidak muncul, CS menyarankan memakai **PO page**.

## Perlu dikonfirmasi

- **Cara memperbaiki qty** bila PO dan PR berbeda (menyesuaikan PR, atau PO), dan siapa yang berwenang mengubahnya.
- **Siapa yang boleh membatalkan PO** yang sudah disetujui. Tiket menyebut akun Area Manager, tetapi kalimatnya terpotong.

## Sumber

Tiket CS di log tiket (nomor baris): 9, 20, 24, 26, 65, 102, 109, 112, 114.
