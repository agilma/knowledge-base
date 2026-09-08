# Cara Saya Berpikir

## Prinsip Utama

AI harus memahami kondisi dan pola project yang sudah ada sebelum melakukan perubahan.

Jangan langsung membuat solusi berdasarkan asumsi.

Prioritas utama:

1. Baca dan pahami kode existing.
2. Pahami alur aplikasi yang sudah berjalan.
3. Pahami pola implementasi yang digunakan project.
4. Pahami design dan UX yang sudah ditentukan.
5. Gunakan pola existing jika pola tersebut masih sesuai.
6. Jangan membuat perubahan yang tidak diperlukan.

---

## Ketika Mengerjakan Task

Gunakan pola:

**Plan → Do → Check → Action (PDCA)**

### 1. Plan

Sebelum melakukan perubahan:

- Pahami task yang diberikan.
- Periksa kode existing yang berkaitan.
- Cari tahu bagaimana alur saat ini bekerja.
- Identifikasi file dan bagian kode yang benar-benar perlu diubah.
- Jangan membuat asumsi jika informasi dapat diperiksa dari codebase.
- Tentukan rencana perubahan terlebih dahulu.

### 2. Do

Implementasikan perubahan sesuai rencana.

Prinsip:

- Ikuti pola project yang sudah ada.
- Ikuti architecture yang sudah digunakan.
- Ikuti alur aplikasi yang sudah berjalan.
- Ikuti design dan UX yang sudah ditentukan.
- Ubah sesedikit mungkin.
- Jangan mengubah bagian yang tidak berkaitan dengan task.

### 3. Check

Setelah melakukan perubahan:

- Jalankan test.
- Jalankan aplikasi jika diperlukan.
- Periksa error.
- Pastikan fitur yang diminta berjalan.
- Pastikan perubahan tidak merusak fitur yang sebelumnya sudah berjalan.
- Jika muncul error, jangan langsung menyatakan task selesai.

### 4. Action

Jika masih terdapat masalah:

**Kembali ke Plan.**

```text
Plan
 ↓
Do
 ↓
Check
 ↓
Ada error?
 ↓
Ya
 ↓
Plan kembali
 ↓
Do
 ↓
Check kembali
```

Ulangi sampai masalah benar-benar terselesaikan.

Task baru boleh dinyatakan selesai jika hasil implementasi sudah diperiksa dan tidak terdapat error yang diketahui.

---

# Cara Menangani Error

Ketika terjadi error:

1. Periksa error terlebih dahulu.
2. Pahami penyebab error.
3. Search/research jika diperlukan.
4. Buat perbaikan.
5. Test kembali.
6. Jika masih error, revisi hasil sebelumnya.
7. Test kembali.
8. Ulangi sampai benar.

Jangan menganggap implementasi berhasil hanya karena kode sudah ditulis.

**Kode selesai ditulis ≠ task selesai.**

Task selesai setelah hasilnya diperiksa dan berjalan sesuai kebutuhan.

---

# Ketika Membaca Codebase

Sebelum membuat perubahan, AI harus:

- membaca implementasi existing yang relevan;
- mencari pattern yang sudah digunakan;
- mencari fungsi/component/service yang mungkin sudah tersedia;
- memahami hubungan antar bagian kode;
- memahami alur data;
- memahami UI/UX yang sudah ada.

Jangan membuat implementasi baru jika implementasi existing masih dapat digunakan atau dikembangkan.

---

# Jangan Membuat Asumsi

Jika informasi dapat ditemukan dari:

- codebase;
- configuration;
- database;
- API;
- dokumentasi project;
- design;
- existing implementation;

maka **periksa terlebih dahulu daripada berasumsi**.

Jika informasi benar-benar tidak tersedia dan keputusan tersebut dapat memengaruhi hasil implementasi, tanyakan terlebih dahulu.

---

# Menjaga Hal yang Sudah Benar

Ini adalah prinsip penting.

**Jangan memperbaiki sesuatu yang tidak perlu diperbaiki.**

Perubahan yang tidak diperlukan dapat menyebabkan:

- fitur yang sebelumnya benar menjadi error;
- behavior existing berubah;
- design yang sudah sesuai menjadi berubah;
- bug baru muncul;
- scope task melebar.

Karena itu:

> Ubah hanya bagian yang diperlukan untuk menyelesaikan task.

Setelah perubahan, pastikan bagian yang sebelumnya sudah benar tetap benar.

---

# Mengikuti Preferensi Project

Setiap project memiliki pola dan preferensi masing-masing.

AI harus mengikuti:

- architecture;
- coding pattern;
- naming convention;
- folder structure;
- component pattern;
- API pattern;
- database pattern;
- UI pattern;
- design;
- UX flow;
- business logic;

yang sudah digunakan oleh project.

Jangan memaksakan pola atau architecture baru hanya karena AI menganggapnya lebih baik.

Jika ingin mengganti pola existing secara signifikan, jelaskan alasannya dan minta persetujuan terlebih dahulu.

---

# Prioritas Dalam Pengambilan Keputusan

Ketika memilih solusi, prioritaskan solusi yang:

1. Paling sesuai dengan kebutuhan task.
2. Paling sesuai dengan codebase existing.
3. Paling sesuai dengan alur dan design yang sudah ditentukan.    
4. Paling kecil risiko merusak fitur existing.
5. Paling sederhana untuk dipelihara.

Jangan memilih solusi hanya karena secara teori terlihat lebih modern atau lebih kompleks.

---

# Definition of Done

AI tidak boleh menyatakan task selesai hanya karena implementasi sudah dibuat.

Sebelum mengatakan selesai:

-  Task sudah diimplementasikan.
-  Kode mengikuti pattern existing.
-  Tidak ada perubahan yang tidak diperlukan.
-  Error sudah diperiksa.
-  Test sudah dilakukan.
-  Hasil test sesuai.
-  Tidak ada error yang diketahui.
-  Fitur existing yang berkaitan tetap berjalan.
-  Design/UX tetap sesuai.
-  Jika sebelumnya terdapat error, error tersebut sudah diverifikasi tidak muncul lagi.

Jika belum memenuhi checklist tersebut, task belum selesai.