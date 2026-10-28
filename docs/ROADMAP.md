# Peta Jalan Fitur

Daftar fitur jangka panjang, ditulis 28 Okt 2026 untuk dijadikan pekerjaan satu per satu. Ini
**usulan**, bukan janji: tiap butir dimulai setelah pemilik memutuskan, dan yang sudah masuk dicatat di
`docs/FEATURES.md` (katalog fitur) serta `TODO.md` (sisa pekerjaan kecil). Keputusan bentuk dan
alasannya dicatat di `docs/ARCHITECTURE.md`. Bagian "Fase 0-3" di FEATURES.md adalah rencana awal yang
lebih kasar; daftar ini yang lebih baru.

Cara memakai: pilih satu butir, minta rencananya, lalu coret atau pindahkan ke FEATURES.md saat selesai.
Butir yang bertanda "migrasi" memerlukan persetujuan pemilik sebelum digabung (tabel baru di database
produksi).

Status awal semua butir: **direncanakan**.

Prinsip pemilihan: (1) membantu pembaca awam menemukan dan menjalankan prosedur dengan cepat di HP, (2) membuat penulisan dan perawatan dokumen lebih murah, (3) menjaga kepercayaan (akses, audit, cadangan), (4) tidak menambah infrastruktur sebelum terbukti perlu. Ukuran: S (sehari-dua), M (beberapa hari), L (minggu), XL (rencana tersendiri).

### Tahap 1 — Nilai tinggi, biaya rendah (berikutnya)

1. **Pratinjau dan tombol sisip di editor** (S-M). Pratinjau langsung diagram Mermaid, langkah bergambar, dan kotak peringatan, plus tombol sisip di toolbar. Sekarang hasil baru terlihat setelah menyimpan. Tanpa migrasi.
2. **Pemulihan versi dan perbandingan versi** (M). Tombol "Pulihkan versi ini" di riwayat dan tampilan beda antar versi. Data revisi sudah ada. Tanpa migrasi.
3. **Ekspor zip `.md` (cadangan)** (S-M). Tombol admin; sudah dirancang di FEATURES. Tanpa migrasi.
4. **Lampiran gambar** (L). Tempel screenshot di editor, penyimpanan (Vercel Blob direkomendasikan), cache offline. Butuh keputusan penyimpanan dari pemilik. Migrasi kecil (tabel lampiran). Membuka panduan berbasis screenshot yang sekarang tidak bisa.
5. **Pencarian lebih tahan salah ketik dan sinonim** (M). `pg_trgm` untuk salah ketik, daftar sinonim (kasir/cashier, retur/return), "mungkin maksud Anda". Migrasi aditif (ekstensi dan indeks).
6. **Log pencarian tanpa hasil** (S-M). Catat kata yang dicari tapi tidak ketemu (tanpa identitas), tampil ke admin sebagai "topik yang belum ditulis". Umpan balik paling murah untuk isi. Migrasi kecil.

### Tahap 2 — Membuat dokumen dipakai, bukan hanya dibaca

7. **Mode langkah (checklist interaktif)** (M). Dokumen berisi langkah bergambar bisa dibuka satu langkah per layar dengan huruf besar dan tanda "selesai" per langkah (disimpan di perangkat). Cocok untuk kasir di depan mesin.
8. **Beranda per peran dan dokumen sematan** (M). Admin menyematkan "Mulai di sini" per koleksi, dan beranda menampilkan yang sering dibuka. Migrasi aditif (kolom urutan sematan).
9. **Saran dan masukan dari pembaca** (M). Tombol "Ada yang kurang jelas atau berubah?" di dokumen; masuk ke kotak masuk editor per dokumen. Menggantikan kebutuhan kolaborasi real-time. Migrasi (tabel masukan).
10. **Tanya Knowledge Base (jawaban AI dengan sumber)** (L). Kotak tanya untuk semua pengguna: pencarian full-text lebih dulu, lalu Claude merangkum dari dokumen yang boleh dibaca orang itu, selalu dengan tautan sumber dan tanpa mengarang; aturan akses koleksi dan dokumen terbatas wajib berlaku di tahap pengambilan. Batas pemakaian per pengguna dan biaya terpantau. Pembuka: tombol "Tanya" di hasil pencarian. Embedding (pgvector) hanya bila pencarian biasa tidak cukup.
11. **Kuis singkat dan tanda sudah dibaca untuk SOP** (L). Pelatihan kasir baru: checklist onboarding, kuis 3-5 soal per SOP, admin melihat siapa sudah lulus. Migrasi (tabel progres).

### Tahap 3 — Tata kelola dan kepercayaan

12. **Alur persetujuan sebelum terbit** (L). Draf, minta tinjau, disetujui, terbit; meniru SOP Thunderlab (Project Leader lalu Project Controller). Dokumen tertentu atau koleksi tertentu wajib disetujui. Migrasi (status dan tabel persetujuan).
13. **Berlaku sejak dan arsip versi resmi** (M). Kolom "berlaku sejak" dan "menggantikan dokumen", supaya SOP 21 Oktober dan versi sebelumnya tidak membingungkan. Migrasi aditif.
14. **Log audit** (M). Siapa mengubah akses, peran, status terbit, penghapusan; halaman admin. Migrasi (tabel audit).
15. **Apa yang baru** (S-M). Halaman perubahan penting (dokumen terbit atau berubah berarti) per koleksi dan, kemudian, ringkasan mingguan.
16. **Asisten AI untuk editor dengan batas, dan tombol "Periksa dokumen"** (M-L). Cek kelengkapan (bagian Perlu dikonfirmasi, nama orang, tautan), bahasa, struktur sesuai jenis. Perlu keputusan siapa boleh dan berapa batas biaya.

### Tahap 4 — Fondasi dan skala

17. **Database Preview terpisah, branch protection (`check` wajib), pemantauan galat** (S-M). Sudah di TODO; kurangi risiko tiap rilis. Uji end-to-end Playwright di CI untuk alur utama.
18. **Cadangan database terjadwal dan uji pemulihan** (M). Di luar ekspor `.md`; Neon branch/PITR plus latihan restore.
19. **Antrean tulis-offline** (L). Simpan dokumen saat offline dan kirim saat online; butuh aturan konflik. Hanya bila ada kebutuhan nyata.
20. **Sinkronisasi terjadwal ke repo Git privat** (L). Lanjutan ekspor; token GitHub dan pekerjaan terpisah.
21. **Redis (pembatas laju, antrean)** (M). Hanya bila pembatas laju AI di memori terbukti kurang.
22. **Tautan publik berbunyi rahasia untuk dokumen terpilih** (L). Bisa dicabut dan berkedaluwarsa; menembus aturan akses sehingga perlu keputusan keamanan tersendiri. Hanya bila ada kebutuhan berbagi ke luar tim.

### Ide jauh (belum diputuskan)

- Bot chat (WhatsApp atau Slack) yang menjawab dari Knowledge Base, memakai mesin "Tanya Knowledge Base".
- Kolaborasi real-time di editor (butuh server WebSocket tetap; lihat FEATURES).
- Impor langsung dari Google Sheet atau Docs lewat tautan, dengan izin akses.
- Multi-bahasa dan terjemahan otomatis.
- Pengganti tampilan gambar dari Canva (impor halaman desain sebagai langkah bergambar).

### Urutan yang disarankan

1 → 2 → 3 → 6 → 5 → 4 (menunggu keputusan penyimpanan) → 7 → 9 → 10 → 12 → 13 → 14 → sisanya menurut kebutuhan. Alasannya: dua yang pertama menghilangkan keluhan penulis sekarang (pratinjau, salah simpan), 3 dan 17-18 mengamankan data, 6 dan 9 memberi umpan balik nyata tentang isi sebelum membangun fitur AI pembaca (10).
