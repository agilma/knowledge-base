---
title: Alur Pengaturan Ujian Versi 2 per Peran
slug: alur-pengaturan-ujian-v2
type: PANDUAN
collection: smpn-13-malang
excerpt: Urutan pengaturan ujian di sistem versi 2: apa yang dikerjakan admin, guru, panitia, pengawas, dan peserta sebelum, saat, dan sesudah ujian, beserta aturan jadwal dan soal.
---
## Konteks

Panduan urutan kerja ujian di sistem versi 2 untuk sekolah, dibagi per peran dan per tahap. Tiap langkah di sheet sumber punya video panduan; tautannya tidak disalin ke sini.

## Prasyarat

- Akun untuk tiap peran: admin, guru, panitia, pengawas, dan peserta.
- Daftar pelajaran, jenis asesmen, ruang ujian, dan peserta.

## Langkah

**1. Sebelum ujian**

Dikerjakan **admin**:

1. Setting Pelajaran.
2. Setting Asesmen.
3. Setting Ruang. Disarankan membuat ruang sesuai jumlah ruangan yang dipakai ujian, supaya pengawas mudah memantau siswa di ruangnya.
4. Menambahkan Guru dan Panitia.

Dikerjakan **guru**:

5. Input Soal. Skor sudah bisa diinput dengan koma.

Dikerjakan **panitia**:

6. Buat Jadwal. Di versi 2, fitur acak soal, acak jawaban, dan input ruangan pada jadwal dihilangkan.
7. Input Peserta. Di versi 2 peserta memakai **nomor peserta** (pengganti email) dan **token** (pengganti kata sandi).
8. Buat Sesi. Di versi 2 sesi dibuat manual untuk mengurangi kemungkinan server down dan error throttle.
9. Cancel dan Amend Soal bila ada soal yang perlu dibetulkan.
10. Menambahkan Pengawas. Pengawas diinput berdasarkan akses ruang, supaya mudah membuka kembali sesi dan melihat log.

**Urutan ideal:** Soal, lalu Jadwal, lalu Pengawas, lalu Peserta, lalu Sesi.

**2. Saat ujian**

- **Peserta** ikut ujian dengan nomor peserta dan token (tidak perlu email).
- **Panitia dan pengawas** dapat membuka kembali sesi (Reopen Sesi). Di menu Buka Kembali Sesi, siswa bisa dikelompokkan per ruang lewat filter dengan operator "like" pada nomor peserta, karena nomor peserta membedakan siswa berdasarkan kelas dan rombel.
- Aktivitas dapat dilacak di menu Log Aplikasi Ujian.

**3. Selesai ujian**

- **Panitia dan guru** melihat nilai.

## Aturan yang berlaku

- Sistem tidak mengunci urutan jadwal dan sesi: sesi boleh dibuat saat jadwal berstatus submit maupun draf. Yang penting **kode jadwal tidak diubah** setelah sesi dibuat, karena itu bermasalah.
- Untuk uji coba ujian: buat jadwal uji coba, submit peserta, lalu input sesi.
- **Jumlah soal pada jadwal** idealnya sama dengan soal yang ada. Jadwal boleh lebih kecil dari soal yang ada (contoh: soal 10, jadwal 9), tidak boleh lebih besar (soal 10, jadwal 11). Soal boleh ditambah selama peserta belum disubmit dan belum ada sesi.
- Soal tidak boleh dihapus atau diubah saat ujian berlangsung.
- Guru yang mengajar di dua kelas (misalnya kelas 7 dan 8) idealnya didaftarkan dengan email berbeda.

## Verifikasi

- Peserta bisa login dengan nomor peserta dan token dan soal muncul.
- Pengawas bisa melihat siswa di ruangnya dan membuka kembali sesi.

## Perlu dikonfirmasi

- Langkah klik rinci tiap tahap: di sheet sumber hanya satu baris per langkah dengan video.
- Langkah **Lihat Nilai** di tahap selesai ujian kosong di sheet sumber.
- Langkah Reopen Sesi dan Cancel dan Amend Soal hanya berupa video; belum ditulis.

## Sumber

Sheet log isu SMPN 13 Malang (tab ALUR SETTING, catatan, dan LIST ISSUE V2).
