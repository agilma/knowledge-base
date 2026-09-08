Dokumen ini menjadi pedoman AI dalam merancang dan mengembangkan UI/UX.

Tujuan utama: UI harus terasa **minimalis, modern, whitespace, elegan, dan tidak monoton**. AI tidak boleh membuat UI yang terlihat seperti template generik atau semua halaman terasa sama.

---

## 1. Visual Style

Preferensi utama:

- Minimalis    
- Modern
- Banyak whitespace
- Elegan
- Bersih dan tidak terlalu ramai
- Visual hierarchy harus jelas
- Setiap elemen memiliki alasan keberadaan

Whitespace bukan berarti membuat tampilan kosong. Gunakan whitespace untuk memberikan ruang bernapas dan membuat informasi lebih mudah dipahami.

Hindari:

- Terlalu banyak card
- Terlalu banyak border
- Terlalu banyak warna
- Shadow yang berlebihan
- UI yang terlalu padat
- Elemen dekoratif yang tidak memiliki fungsi
- Tampilan seperti template admin/dashboard generik

---

## 2. Design Reference

Salah satu referensi utama adalah **Outline**.

AI dapat mengambil inspirasi dari prinsip desain Outline seperti:

- clean
- modern
- sederhana
- typography yang kuat
- whitespace yang baik
- navigasi yang jelas
- fokus pada content
- tidak terlalu banyak elemen visual yang mengganggu

Namun jangan melakukan copy secara mentah.

Gunakan prinsip desainnya sebagai referensi, lalu sesuaikan dengan kebutuhan aplikasi.

---

## 3. Navigation

Untuk aplikasi mobile, preferensi utama adalah:

**Bottom Navigation**

Bottom navigation digunakan untuk fungsi utama aplikasi sehingga pengguna dapat berpindah antar area utama dengan cepat.

Navigation harus:

- sederhana
- mudah dipahami
- tidak terlalu banyak menu
- konsisten
- mudah dijangkau dengan satu tangan

Hindari membuat navigation terlalu kompleks.

---

## 4. User Flow

Prinsip utama:

> **Maksimal 2 langkah untuk menyelesaikan sebuah aksi sederhana.**

Usahakan user dapat menyelesaikan task tanpa melewati banyak halaman atau form.

Contoh:

```text
User
 ↓
Pilih action
 ↓
Confirmation
 ↓
Done
```

Jangan membuat:

```text
User
 ↓
Page 1
 ↓
Page 2
 ↓
Form
 ↓
Review
 ↓
Confirmation
 ↓
Done
```

Jika flow membutuhkan banyak langkah karena kompleksitas bisnis, AI harus mencari cara untuk menyederhanakannya tanpa menghilangkan kebutuhan bisnis.

---

## 5. Save Behavior

**Jangan menggunakan auto-save sebagai default.**

Perubahan data harus memiliki aksi yang jelas dari user.

Contoh:

```text
Edit
 ↓
Save
 ↓
Confirmation / feedback
```

User harus mengetahui kapan perubahan benar-benar disimpan.

---

## 6. Confirmation

Untuk aksi yang memiliki konsekuensi penting, gunakan confirmation.

Contohnya:

- Delete
- Submit
- Cancel
- Reset
- Change status
- Action yang tidak mudah di-undo

Confirmation harus menjelaskan dengan jelas:

- apa yang akan terjadi
- action yang akan dilakukan
- pilihan untuk melanjutkan atau membatalkan

Jangan menggunakan confirmation untuk setiap aksi kecil karena akan mengganggu flow.

---

## 7. Modal

Modal boleh digunakan dan menjadi salah satu pola UI yang disukai.

Gunakan modal untuk:

- confirmation
- quick action
- form sederhana
- informasi penting
- task yang tidak membutuhkan full page

Namun jangan menggunakan modal untuk flow yang kompleks.

Jika isi terlalu panjang atau task terlalu kompleks, gunakan page atau screen khusus.

---

## 8. Mobile Experience

Desktop dan mobile **tidak harus memiliki UI yang identik**.

Jika sebuah desktop UI dibuka di mobile, jangan hanya melakukan scaling atau mengecilkan ukuran elemen.

Mobile harus memiliki mode UI yang memang dirancang untuk mobile.

Contohnya:

```text
Desktop
Sidebar
    ↓
Content

Mobile
Bottom Navigation
    ↓
Mobile Content
```

Pada mobile:

- prioritaskan informasi penting
- gunakan touch target yang nyaman
- kurangi elemen yang tidak penting
- gunakan bottom navigation jika sesuai
- manfaatkan modal/bottom sheet jika lebih nyaman
- hindari tabel desktop yang dipaksakan menjadi terlalu kecil
- gunakan layout yang lebih sederhana

Prinsip:

> **Responsive bukan hanya mengecilkan desktop UI. Mobile adalah experience yang berbeda.**

---

## 9. Loading State

Loading harus terlihat jelas oleh user.

Gunakan loading UI yang sesuai dengan konteks.

Untuk proses/action yang membutuhkan feedback segera, gunakan popup atau overlay loading.

Contoh:

```text
User melakukan action
        ↓
Loading popup
        ↓
Process
        ↓
Success / Error
```

Loading tidak boleh membuat user bingung apakah action sedang diproses atau tidak.

---

## 10. Error State

Error harus disampaikan melalui UI yang mudah dipahami.

Preferensi utama:

**Popup**

Error popup harus:

- jelas
- singkat
- menjelaskan masalah
- jika memungkinkan memberikan solusi/action berikutnya

Jangan hanya menampilkan technical error seperti:

```text
Exception: NullPointerException
```

Jika technical detail diperlukan untuk debugging, tampilkan dengan cara yang tidak mengganggu user biasa.

---

## 11. Visual Variety

Salah satu masalah yang harus dihindari adalah:

> Semua halaman terlihat sama.

AI tidak boleh menggunakan satu template UI kemudian menerapkannya ke seluruh aplikasi tanpa mempertimbangkan konteks.

Contoh buruk:

```text
Page A → Card + Card + Card
Page B → Card + Card + Card
Page C → Card + Card + Card
Page D → Card + Card + Card
```

Walaupun design system harus konsisten, **komposisi UI boleh berbeda berdasarkan kebutuhan halaman**.

Gunakan variasi yang tetap berada dalam design language yang sama.

Contohnya:

- List
- Table
- Timeline
- Detail view
- Empty state
- Dashboard
- Form
- Search interface
- Card
- Split view
- Modal
- Bottom sheet

Prinsip:

> **Consistent design system, but contextual UI composition.**

---

## 12. AI Design Rule

Sebelum membuat UI baru, AI harus memahami:

1. Tujuan halaman
2. Siapa user-nya
3. Informasi apa yang paling penting
4. Action utama user
5. Flow yang harus dilakukan
6. Apakah desktop dan mobile membutuhkan experience berbeda
7. Pattern UI yang sudah digunakan di project

AI tidak boleh langsung menggunakan template UI generik hanya karena template tersebut terlihat familiar.

---

## 13. Design Philosophy

Prinsip utama:

> **Simple, modern, elegant, but not boring.**

UI harus terasa sederhana tetapi tetap memiliki karakter.

Jangan mengejar minimalisme dengan mengorbankan usability.

Jangan mengejar konsistensi dengan membuat semua halaman identik.

Jangan mengejar keindahan dengan mengorbankan fungsi.

Target akhirnya adalah:

**Clean + Usable + Elegant + Contextual**