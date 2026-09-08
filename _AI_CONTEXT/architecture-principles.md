Dokumen ini menjadi pedoman AI ketika merancang, mengembangkan, memperbaiki, atau melakukan refactor architecture sebuah project.

Tujuan utama:

> Membuat architecture yang modern, up-to-date, user friendly, mudah dipelajari manusia, mudah dipahami AI, mudah di-maintain, reusable, dan performant.

---

## 1. Mandatory Workflow Before Coding

AI **tidak boleh langsung coding** ketika menerima task pada project existing.

Sebelum implementasi, lakukan urutan berikut:

```text
Read Instruction
      ↓
Check Project Structure
      ↓
Check Code Files Related to Instruction
      ↓
Find Existing Patterns
      ↓
Check Existing API / Integration
      ↓
Research if Required
      ↓
Create Implementation Plan
      ↓
Review Plan
      ↓
Revise Plan if Needed
      ↓
Implement
      ↓
Test
```

### Step 1 — Read Instruction

AI harus membaca dan memahami seluruh instruksi yang diberikan.

Jangan langsung berasumsi mengenai implementasi sebelum memahami requirement.

### Step 2 — Check Project Structure

Periksa struktur project untuk memahami:

- folder
- module
- feature
- service
- API
- component
- state management
- utility
- configuration
- database layer

Tujuannya agar kode baru ditempatkan pada lokasi yang benar.

### Step 3 — Check Related Code

Baca file yang berhubungan langsung dengan task.

Jangan hanya membaca nama file atau struktur folder.

AI harus memahami implementasi existing sebelum mengubahnya.

### Step 4 — Find Existing Patterns

Cari pattern yang sudah digunakan project.

Contohnya:

- naming
- folder structure
- component
- service
- API
- state management
- error handling
- database access
- authentication
- UI pattern

Jika pattern existing sudah baik, **ikuti pattern tersebut**.

### Step 5 — Check Existing API / Integration

Jika membutuhkan API:

1. Periksa API yang sudah tersedia.
2. Gunakan API existing jika sesuai.
3. Jika menggunakan ERPNext/Frappe dan API belum diketahui, lakukan research terlebih dahulu.
4. Jangan membuat API baru secara sembarangan.

### Step 6 — Create Plan

Setelah discovery selesai, AI harus membuat implementation plan.

Plan minimal menjelaskan:

- apa yang akan dibuat
- file yang akan diubah
- file baru jika diperlukan
- architecture yang digunakan
- API yang digunakan
- business logic
- perubahan database jika ada
- UI/UX impact jika ada
- testing
- kemungkinan risiko

### Step 7 — Review Plan

AI harus membaca kembali plan yang dibuat.

Jika plan belum sesuai requirement, architecture, atau pattern existing:

> **Revisi plan terlebih dahulu sebelum coding.**

Jangan memperbaiki kesalahan architecture setelah terlalu banyak kode dibuat jika kesalahan tersebut sudah dapat diketahui dari tahap planning.

### Step 8 — Implement

Setelah plan dianggap sesuai, implementasikan coding berdasarkan plan tersebut.

### Step 9 — Test

Setelah implementasi:

- jalankan project
- test feature
- check error
- check regression
- check performance
- perbaiki masalah
- test kembali

---

# 2. Existing Architecture

Default rule:

> **Always follow the existing architecture.**

AI tidak boleh mengganti architecture existing hanya karena memiliki preferensi architecture lain.

Architecture hanya boleh diganti jika:

- user secara eksplisit meminta perubahan architecture, atau
- architecture existing memang buruk dan refactor diperlukan.

Jika architecture existing buruk, AI **boleh melakukan refactor besar** jika hasil akhirnya membuat project:

- lebih rapi
- lebih mudah dipelajari
- lebih mudah di-maintain
- lebih performant
- lebih scalable
- lebih mudah digunakan AI

Jangan takut melakukan refactor besar jika memang diperlukan.

Contoh:

```text
2 file berubah
```

bukan selalu lebih baik daripada:

```text
15 file di-refactor
```

Jika perubahan 15 file menghasilkan architecture yang jauh lebih baik dan tetap aman, lakukan refactor tersebut.

---

# 3. Architecture Must Be Modern

Architecture harus menggunakan pendekatan yang **modern dan up-to-date**.

AI harus mempertimbangkan teknologi, pattern, library, dan praktik terbaru yang relevan dengan project.

Namun:

> Latest technology ≠ selalu terbaik.

Technology terbaru harus tetap memenuhi:

- stability
- maintainability
- readability
- documentation
- compatibility
- community/adoption
- performance
- ease of learning

Jangan menggunakan teknologi baru hanya karena teknologi tersebut baru.

---

# 4. Human-Friendly and AI-Friendly Architecture

Architecture harus mudah dipahami oleh dua pihak:

```text
Human Developer
       +
AI Coding Agent
```

Folder dan module harus memiliki tujuan yang jelas.

Contoh konsep:

```text
feature/
├── components/
├── services/
├── models/
├── repositories/
├── utils/
└── README.md
```

Struktur sebenarnya harus mengikuti architecture project, tetapi prinsipnya adalah:

> **Ketika AI mencari sebuah fungsi, AI harus mudah mengetahui kemungkinan lokasinya.**

Jangan membuat struktur folder yang terlalu abstrak atau terlalu dalam tanpa alasan.

---

# 5. Business Logic

Business logic harus dipisahkan dari UI dan bagian lain yang tidak berkaitan.

Tujuan:

- mudah maintenance
- mudah dibaca
- mudah ditest
- mudah digunakan kembali
- mudah ditemukan AI

Business logic sebaiknya memiliki lokasi/folder yang jelas.

AI harus menjaga folder management agar project tetap terorganisasi dalam jangka panjang.

Jika architecture membutuhkan dokumentasi tambahan, AI harus membuat dokumentasi tersebut.

---

# 6. Folder Management

Folder bukan hanya tempat menyimpan file.

Folder harus membantu developer dan AI memahami architecture.

Gunakan struktur yang:

- konsisten
- logis
- mudah dicari
- tidak terlalu dalam
- tidak mencampur tanggung jawab
- scalable untuk perkembangan project

Jangan membiarkan project berkembang menjadi kumpulan file tanpa struktur yang jelas.

---

# 7. Reusable Code

AI harus mengutamakan reusable code.

Jika terdapat logic yang dapat digunakan kembali, pertimbangkan membuat:

- reusable component
- reusable service
- reusable function
- reusable utility
- shared module

Tujuannya:

- mengurangi duplicate code
- mengurangi jumlah code
- mempermudah maintenance
- mempermudah perubahan di masa depan

Namun reusable code tetap harus memiliki abstraction yang masuk akal.

Jangan membuat abstraction yang terlalu kompleks hanya untuk menghindari beberapa baris duplicate code.

---

# 8. API Rules

API adalah bagian penting dari architecture.

Default rule:

> **Use only APIs that are already provided or explicitly available.**

AI tidak boleh sembarangan membuat API baru.

Jika API yang dibutuhkan belum tersedia:

1. Identifikasi API yang diperlukan.
2. Jelaskan endpoint/function yang dibutuhkan.
3. Jelaskan request.
4. Jelaskan response.
5. Jelaskan business logic.
6. Masukkan kebutuhan tersebut ke implementation plan.
7. Jangan membuat API baru tanpa instruksi/konfirmasi.

Tujuannya agar AI lain/developer lain dapat menggunakan plan tersebut untuk membuat API secara terpisah.

Contoh:

```text
Required API:
GET /api/...

Purpose:
...

Request:
...

Response:
...

Business Logic:
...

Used By:
...
```

---

# 9. Performance

Performance adalah prioritas utama sejak awal development.

Jangan menunggu aplikasi lambat baru memikirkan performance.

AI harus mempertimbangkan:

### Database

- efficiency query
- indexing jika diperlukan
- jumlah query
- duplicate query
- data yang diambil
- pagination
- filtering

### API

- jumlah request
- duplicate request
- payload size
- request frequency
- parallel request
- unnecessary request

### Application

- rendering
- state update
- memory usage
- unnecessary computation
- unnecessary rebuild/re-render

### Caching / Storage

Caching atau local storage dapat digunakan jika memang membantu performance.

Namun:

> **Jangan membuat cache/storage yang berlebihan hanya demi performance.**

Pertimbangkan juga:

- ukuran file
- complexity
- invalidation
- maintenance
- consistency data

Target:

> **Fast without unnecessary complexity.**

---

# 10. Error Handling

Feature/API harus mempertimbangkan state utama sejak awal.

Minimal:

```text
Loading
Success
Empty
Error
Timeout
Unauthorized
Invalid Input
Network Failure
```

Jangan hanya membuat happy path.

Contoh:

```text
Request
   ↓
Loading
   ↓
├── Success
├── Empty
├── Error
├── Timeout
├── Unauthorized
├── Invalid Input
└── Network Failure
```

Setiap state harus memiliki behavior UI yang sesuai dengan kebutuhan aplikasi.

---

# 11. MVP vs Security

Pada tahap MVP, security dapat dibuat sederhana untuk mempercepat validasi product.

Namun security **tidak boleh dilupakan**.

Setelah MVP terbukti dan masuk tahap production/hardening, security harus menjadi prioritas tinggi.

Security yang perlu diperhatikan antara lain:

- authentication
- authorization
- permission
- input validation
- API security
- credential protection
- data exposure
- access control
- secure storage

Prinsip:

```text
MVP
↓
Validate Product
↓
Security Hardening
↓
Production Ready
```

---

# 12. Refactoring

AI diperbolehkan melakukan refactor jika architecture existing tidak baik.

Refactor dapat mencakup banyak file jika memang diperlukan.

Tujuan refactor harus jelas, misalnya:

- architecture lebih baik
- code lebih mudah dipahami
- duplicate code berkurang
- performance meningkat
- folder lebih terorganisasi
- business logic lebih terpisah
- maintenance lebih mudah

Jangan melakukan refactor hanya karena AI memiliki gaya coding berbeda.

---

# 13. Architecture Decision Priority

Ketika memilih architecture atau technology, gunakan prioritas berikut:

1. Requirement
2. Existing project pattern
3. Maintainability
4. Performance
5. Simplicity
6. Human readability
7. AI readability
8. Scalability
9. Stability
10. Modern/up-to-date technology

Technology terbaru boleh dipilih jika memberikan manfaat nyata dan tetap memenuhi prinsip di atas.

---

# 14. Core Principles

AI harus selalu mengingat:

> **Understand before coding.**

> **Plan before implementation.**

> **Follow existing architecture unless there is a reason to change it.**

> **Use modern and up-to-date architecture.**

> **Separate business logic.**

> **Make code reusable.**

> **Keep folder management clean.**

> **Performance matters from the beginning.**

> **Handle real-world states, not only the happy path.**

> **Make architecture easy for humans and AI to understand.**

> **Do not create unnecessary APIs.**

> **Do not be afraid of large refactoring when it genuinely improves the architecture.**

> **The best architecture is not the most complicated architecture. It is the architecture that is effective, maintainable, performant, understandable, and appropriate for the project.**