## 1. Understand Before Changing

AI harus membaca dan memahami codebase existing sebelum melakukan perubahan.

Jangan langsung membuat kode berdasarkan asumsi.

AI harus mencari:

- implementasi yang sudah ada;
- pattern yang digunakan;
- struktur folder;
- alur data;
- business logic;
- component/function yang sudah tersedia;
- design dan UX yang sudah diterapkan.

Jika solusi yang dibutuhkan sebenarnya sudah tersedia di project, gunakan atau kembangkan implementasi tersebut daripada membuat implementasi baru.

---

## 2. Efficient and Understandable Code

Kode harus:

- efisien;
- mudah dibaca;
- mudah dipahami;
- mengikuti format/pattern project;
- mudah dipelihara;
- tidak memiliki kompleksitas yang tidak diperlukan.

Jika existing code dapat dirapikan atau di-refactor agar lebih efisien dan mudah dipahami, AI boleh melakukan refactoring.

Namun refactoring harus tetap berada dalam scope task dan tidak mengubah behavior yang sudah benar tanpa alasan.

---

## 3. Follow Existing Project Pattern

Setiap project memiliki pola masing-masing.

AI harus mengikuti pola yang sudah digunakan project untuk:

- architecture;
- folder structure;
- naming;
- component;
- service;
- API;
- database;
- state management;
- error handling;
- UI;
- UX.

Jangan memaksakan pola baru hanya karena AI memiliki preferensi atau menganggap pendekatan lain lebih modern.

---

## 4. Dependency and Library

AI boleh menambahkan library atau dependency baru jika memang dibutuhkan.

Namun sebelum menggunakan dependency baru, lakukan evaluasi:

### Activity

Periksa apakah library:

- masih aktif dikembangkan;
- masih mendapatkan update;
- compatible dengan versi teknologi project;
- memiliki issue kritis yang belum terselesaikan.

### Quality

Periksa:

- popularitas dan adopsi;
- kualitas dokumentasi;
- reliability;
- maintenance;
- issue/bug;
- compatibility;
- risiko dependency.

### Necessity

Pertimbangkan terlebih dahulu apakah masalah dapat diselesaikan menggunakan:

- existing code;
- built-in functionality;
- dependency yang sudah digunakan project.

Jangan menambahkan dependency hanya karena membuat implementasi menjadi lebih mudah.

---

## 5. Handling Uncertainty

Jika requirement belum jelas, AI boleh membuat asumsi terlebih dahulu.

Asumsi tersebut harus:

- masuk akal;
- berdasarkan informasi yang tersedia;
- mengikuti pola existing;
- tidak bertentangan dengan requirement yang sudah diketahui.

AI harus menjelaskan asumsi yang digunakan agar dapat direview.

### Prinsip

> Buat asumsi → kerjakan → berikan hasil untuk review.

Tidak semua hal perlu dikonfirmasi terlebih dahulu.

Jika konteks dan requirement sudah cukup jelas, AI boleh langsung mengerjakan.

---

## 6. Work Completely According to Instruction

Jika instruksi sudah jelas, AI diharapkan mengerjakan task secara lengkap sesuai instruksi.

Jangan berhenti di tengah hanya karena menemukan hal kecil yang dapat diperbaiki.

Jika menemukan sesuatu di luar scope:

- jangan mengubahnya secara otomatis;
- catat sebagai temuan;
- lanjutkan task utama jika perubahan tersebut tidak diperlukan.

---

## 7. Minimize Unnecessary Changes

AI harus menghindari perubahan yang tidak diperlukan.

Perubahan yang dilakukan harus memiliki alasan yang jelas.

Jangan:

- mengubah file yang tidak berkaitan;
- mengganti architecture tanpa kebutuhan;
- mengganti library tanpa alasan;
- mengubah UI yang tidak berkaitan;
- mengubah behavior existing yang sudah benar.

Prinsip:

> **Change only what needs to change.**

Namun jika bagian yang berkaitan dengan task memang perlu direfactor agar kode menjadi efisien, konsisten, dan mudah dipahami, refactoring diperbolehkan.

---

## 8. Testing

Setelah implementasi selesai, AI harus melakukan check dan testing.

Minimal:

1. Jalankan aplikasi atau test yang relevan.
2. Periksa error.
3. Verifikasi behavior.
4. Pastikan fitur yang sebelumnya berjalan tetap berjalan.
5. Perbaiki jika ditemukan masalah.
6. Test kembali.

Testing bukan tahap opsional.

---

## 9. PDCA

Proses coding menggunakan:

**Plan → Do → Check → Action**

### Plan

Pahami task dan codebase.

### Do

Implementasikan solusi.

### Check

Test hasil implementasi.

### Action

Jika ada masalah, kembali ke Plan dan ulangi proses.

```text
PLAN
  ↓
DO
  ↓
CHECK
  ↓
ERROR?
 ├── YES → PLAN
 └── NO  → DONE
```

Jangan menyatakan task selesai sebelum hasilnya diperiksa.

---

## 10. Completion Report

Setelah task selesai, AI harus memberikan penjelasan yang lengkap mengenai hasil pekerjaan.

Minimal jelaskan:

### What

Apa yang dikerjakan.

### Where

File atau bagian mana yang diubah.

### Why

Mengapa perubahan tersebut diperlukan.

### How

Bagaimana solusi tersebut bekerja.

### Testing

Apa yang sudah dites.

### Result

Apa hasil akhirnya dan apakah masih ada masalah yang diketahui.

Jika ada asumsi yang digunakan, jelaskan juga.

---

## 11. Definition of Done

Task dianggap selesai apabila:

- requirement sudah dikerjakan;
- code mengikuti pattern project;
- kode efisien dan mudah dipahami;
- dependency baru sudah dievaluasi jika digunakan;
- tidak ada perubahan yang tidak diperlukan;
- implementasi sudah dites;
- error sudah diperbaiki;
- hasil sudah diverifikasi;
- fitur existing yang berkaitan tetap berjalan;
- fitur baru atau perubahan fitur sudah dicatat di `docs/FEATURES.md` (dan `docs/USER-GUIDE.md` / `docs/ARCHITECTURE.md` bila relevan) dalam PR yang sama;
- laporan pekerjaan sudah diberikan dengan jelas.