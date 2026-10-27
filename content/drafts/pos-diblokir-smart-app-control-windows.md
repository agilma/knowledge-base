---
title: POS Tidak Bisa Dibuka karena Diblokir Smart App Control Windows
slug: pos-diblokir-smart-app-control-windows
type: MASALAH
collection: murni-erp
excerpt: POS tidak bisa dibuka dan muncul pesan Windows bahwa aplikasi diblokir oleh Smart App Control setelah Windows update otomatis. Cara mematikannya dan hal yang belum jelas.
---
## Konteks

Setelah Windows melakukan update otomatis, kasir tidak bisa membuka POS. Muncul pesan bahwa **Smart App Control** memblokir aplikasi yang dianggap mungkin tidak aman.

## Prasyarat

- Akses administrator di komputer kasir, atau bantuan tim sistem.

## Langkah

1. Penyebab yang dicatat: Windows update otomatis membuat fitur **Smart App Control** menyala.
2. Matikan Smart App Control di pengaturan Windows.
3. Buka kembali POS.

## Verifikasi

- POS terbuka normal dan kasir bisa login.

## Jika Masih Gagal

Minta bantuan tim sistem (remote) dengan menyebut cabang dan komputer yang bermasalah.

## Perlu dikonfirmasi

- Langkah rinci mematikan Smart App Control di menu Windows tidak ditulis di log.
- Solusi lanjutan di log hanya berbunyi "upload di Microsoft Store" tanpa penjelasan, jadi belum jelas apakah aplikasi akan didistribusikan lewat jalur itu.
- Kasus yang sama dilaporkan kembali pada 12 Agustus 2026 di cabang lain tanpa penyelesaian tertulis.
- Apakah mematikan fitur ini aman menurut kebijakan IT toko.

## Sumber

Sheet log isu List Fitur Tambahan Murni (tab LIVE (PROBLEM & SOP); isu 2 Juli dan 12 Agustus 2026).
