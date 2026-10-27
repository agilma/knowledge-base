---
title: Login Siswa Versi 2: Nomor Peserta, Token, dan Satu Perangkat
slug: login-siswa-dan-batas-satu-perangkat
type: PANDUAN
collection: smpn-13-malang
excerpt: Cara siswa login di sistem ujian versi 2 dan aturan satu akun hanya bisa di satu perangkat, beserta arti indikator jaringan merah dan penanganan soal yang tidak muncul.
---
## Konteks

Di sistem ujian versi 2, siswa login tanpa email. Panduan ini menjelaskan cara login, aturan satu perangkat, dan masalah yang sering dilaporkan saat ujian.

## Prasyarat

- Siswa sudah diinput oleh panitia sebagai peserta dan memegang **nomor peserta** dan **token**.

## Langkah

1. Siswa membuka aplikasi ujian dan login memakai **nomor peserta** dan **token** yang diinput panitia saat menginput peserta.
2. Satu login hanya bisa dipakai di **satu perangkat**.

## Masalah yang sering muncul

- **Siswa salah ketik nomor peserta dan masuk memakai akun temannya.** Jawaban dari sheet sumber: tidak bisa dikerjakan, karena di versi 2 satu login hanya bisa di satu perangkat.
- **Bisa login tapi soal tidak muncul** (kasus mapel Matematika). Kemungkinan besar karena akun yang sama sedang login di dua perangkat.
- **Klik nomor soal tidak ada tindakan apa pun.** Lihat indikator jaringan: warna **merah** berarti tidak ada jaringan.
- **Indikator berkedip merah dan hijau bergantian.** Disarankan menghapus aplikasi lalu memasangnya lagi.
- **Sulit mengklik tombol nomor soal dan jawaban.** Di versi 212 ada gerakan geser ke bawah di dalam menu soal. Versi 213 mencoba menghilangkannya untuk melihat apakah itu penyebabnya.

## Verifikasi

- Siswa berhasil masuk dan soal tampil.
- Tidak ada akun yang login di dua perangkat.

## Perhatian

- Kalau ada siswa yang nilainya 0, di log siswa tersebut di-collect manual oleh admin.

## Perlu dikonfirmasi

- Apakah screenshot di aplikasi sudah diblokir; di sheet ada catatan "cek lagi" tanpa hasil akhir.
- Langkah collect manual dan penyebab nilai 0 belum dijelaskan.
- Hasil percobaan di versi 213 belum ditulis.

## Sumber

Sheet log isu SMPN 13 Malang (tab LIST ISSUE V2 dan ALUR SETTING).
