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

### Tambahan dari perbandingan dengan Outline (28 Okt 2026)

Dasar perbandingan ada di bagian "Perbandingan dengan Outline" di bawah. Nomor dilanjutkan dari butir 22.

**Tahap 1 (nilai tinggi)**

23. **Dokumen bersarang dan menu `/`** (L). Sub-halaman di bawah dokumen (SOP 01-06 di bawah satu induk, "Panduan Training" dengan bab-bab), pohon di sidebar dan halaman, seret untuk mengurutkan; plus menu `/` di editor untuk menyisipkan judul, tabel, langkah bergambar, peringatan, diagram. Migrasi aditif (`parentId`, `position`).
24. **Grup pengguna** (M-L). Kelompok (Tim CS, Koordinator Toko, Tim QA) dipakai sebagai anggota koleksi dan dokumen terbatas alih-alih memilih orang satu per satu; menyelesaikan "grup" di TODO dokumen terbatas. Migrasi (tabel grup dan anggota).
25. **Tempat sampah (hapus lunak) dengan pemulihan 30 hari** (M). "Hapus" memindahkan dokumen ke sampah, admin bisa memulihkan; dibersihkan otomatis. Mengurangi risiko salah hapus (hari ini hapus permanen). Migrasi aditif (`deletedAt`).
26. **Tautan balik dan tautan antar dokumen** (M). Ketik `[[` untuk memilih dokumen; bagian "Dirujuk oleh" otomatis di halaman. Melengkapi "Pengetahuan Terkait" manual. Migrasi kecil (tabel tautan) atau dihitung saat membaca.

**Tahap 2 (membuat dokumen dipakai)**

27. **Komentar berutas dengan sebut orang** (L). Komentar pada dokumen, utas, tandai selesai, `@nama` memberi notifikasi; memperluas butir 9 (masukan pembaca) untuk editor. Migrasi (tabel komentar).
28. **Templat tersimpan** (M). Admin atau editor menyimpan dokumen sebagai templat (SOP, Masalah, Training) dan memilihnya di Dokumen Baru, termasuk yang sudah berisi langkah bergambar dan bagian "Perlu dikonfirmasi". Migrasi kecil.
29. **Sematan** (M). Tempel tautan Canva, YouTube, Google Slides, Figma; tampil sebagai bingkai dari daftar domain yang diizinkan saja (keamanan). Meniru lembar SOP Canva langsung di halaman.
30. **Impor dari berkas di aplikasi** (M-L). Unggah `.md` atau `.docx` (dan zip dari Notion atau Confluence) oleh admin menjadi draf; perluas pipeline `docs:import`. Tanpa migrasi.
31. **Pantau dokumen dan notifikasi** (L). Mengikuti dokumen atau koleksi; lonceng di aplikasi dan, kemudian, email atau WhatsApp saat terbit atau berubah berarti; menyatukan butir 15. Migrasi (langganan, notifikasi).
34. **Statistik dokumen** (M). Admin melihat berapa kali dibaca, kontributor, dokumen terpopuler dan tidak pernah dibuka; melengkapi log pencarian (butir 6). Migrasi kecil.
35. **Ikon dan warna** (S). Emoji atau ikon untuk koleksi dan dokumen agar mudah dikenali di HP. Migrasi aditif.

**Tahap 3 (tata kelola dan integrasi)**

36. **Kunci dokumen** (S-M). Dokumen SOP yang sudah disetujui dikunci; hanya admin atau pemberi persetujuan yang dapat membuka kunci; berpasangan dengan alur persetujuan (12). Migrasi aditif.
32. **API dan token pribadi, webhook** (L). Token untuk membaca dan mencari; webhook "dokumen terbit" ke Slack atau WhatsApp. Butuh desain keamanan (cakupan token, pencabutan).
33. **Server MCP bacaan-saja** (M-L). Agar Claude (desktop atau Code) bisa mencari dan membaca Knowledge Base atas nama pengguna, sesuai aturan akses; memakai token butir 32. Tidak boleh menulis.

### Performa dan skala (diukur 28 Okt 2026)

Diukur dengan data tiruan: **20.000 dokumen** (rata-rata sekitar 6 KB, 40 koleksi, 5% terbatas, 20% draf) di Postgres 16 lokal, memanggil fungsi layanan yang dipakai halaman. Angka server saja (belum termasuk jaringan ke Neon di Singapura, yang menambah puluhan milidetik per kueri). Skenario terburuk pencarian: kata yang ada di hampir semua dokumen.

| Yang diukur | Hasil (median) | Penilaian |
| --- | --- | --- |
| Kueri akses di setiap halaman (koleksi terbatas, anggota, id dokumen terbatas) | 10 ms | baik; tumbuh seiring jumlah dokumen terbatas |
| Sidebar, daftar koleksi | 2 ms | baik |
| Beranda (terbaru) dan hitungan per koleksi | 14 ms dan 9 ms | baik pada 20 ribu; butuh indeks `updatedAt` di atas sekitar 100 ribu |
| Halaman dokumen | 3 ms | baik |
| Halaman koleksi (500 dokumen) | 55 ms, **3,6 MB** data | **boros**: memuat seluruh isi semua dokumen dan tanpa halaman |
| Pencarian kata jarang (judul) | 1 ms | baik (memakai indeks) |
| **Pencarian kata umum ("kasir closing", "kasir")** | **11,6 s dan 14,9 s**, 346 KB data | **parah**: indeks tidak dipakai, vektor pencarian dihitung ulang untuk puluhan ribu dokumen |
| Pemilih dokumen terkait di form | 14 ms | cepat, tetapi **hanya 500 dokumen pertama menurut abjad** (kekurangan fungsi) |

Temuan utama dan perbaikan (diurutkan menurut dampak). Butir 37 adalah yang paling mendesak **dan paling murah dikerjakan sekarang**, karena menambah kolom tersimpan memutar ulang seluruh tabel (sekitar 50 detik pada 20 ribu dokumen; hampir seketika pada ratusan dokumen sekarang):

37. **[SELESAI 28 Okt 2026] Vektor pencarian tersimpan** (M, **segera**). Kolom `search_vector tsvector GENERATED ALWAYS ... STORED` dengan indeks GIN, lalu pencarian membaca kolom itu (bukan menghitung ulang). Terukur: pencarian terburuk **dari 11,6 detik menjadi 0,2 detik** (sekitar 60 kali) dan kata jarang tetap 0,2 ms. Biayanya ruang disk: tabel dokumen 58 MB menjadi 117 MB pada 20 ribu dokumen (indeks lama dapat dihapus untuk menghemat sebagian). Migrasi 9, aditif tetapi mengunci tabel selama menulis ulang; kerjakan selagi dokumennya masih sedikit. Sekalian: hasil pencarian hanya mengambil kolom yang ditampilkan (bukan seluruh isi), dan indeks `updatedAt`.
38. **[SELESAI 28 Okt 2026] Daftar ringan dan berhalaman** (M). Halaman koleksi, hasil pencarian, dan beranda hanya mengambil kolom yang tampil (judul, ringkasan, status, tanggal), bukan `content`; halaman koleksi dibagi per 50 dengan "Muat lebih banyak". Memangkas muatan 3,6 MB menjadi puluhan KB. Tanpa migrasi.
39. **[SELESAI 28 Okt 2026] Pemilih dokumen terkait dengan pencarian** (S-M). Ganti daftar 500 pertama dengan pencarian saat mengetik (memakai pencarian butir 37), supaya semua dokumen bisa dipilih. Tanpa migrasi.
40. **Kueri akses di tiap halaman dibuat murah** (S-M). Daftar id dokumen terbatas diambil di setiap permintaan; simpan sementara beberapa detik di memori atau hitung hanya bila perlu, supaya tidak tumbuh bersama jumlah dokumen terbatas.
41. **Batas cache offline** (S). Pastikan cache halaman service worker punya batas jumlah dan umur (puluhan ribu dokumen yang pernah dibuka tidak boleh memenuhi penyimpanan perangkat), dan jangan pra-cache potongan besar yang tidak dipakai (lihat catatan Mermaid di `TODO.md`).
42. **Pantauan performa** (M). Ukur waktu kueri dan halaman di Production (log lambat, Vercel Observability) dan ulangi benchmark ini setiap kali jumlah dokumen berlipat; skrip pengukuran dan cara membuat data tiruan dicatat di `TODO.md`.

### Urutan yang disarankan (diperbarui)

**37 (vektor pencarian) lebih dulu, selagi dokumen masih sedikit**, lalu 38 dan 39. Setelah itu 1, 2, 3, 6, 5, **25 (tempat sampah)**, **23 (dokumen bersarang)**, **24 (grup)**, 4 (menunggu keputusan penyimpanan), 7, 9 dan 27, 28, 29, 10, 12 dan 36, 40-42 mengikuti pertumbuhan, sisanya menurut kebutuhan. Alasannya: pencarian adalah pintu utama pembaca dan satu-satunya yang melambat tajam; dua yang berikutnya menghilangkan keluhan penulis sekarang (pratinjau, salah simpan); tempat sampah murah dan mencegah kehilangan data; dokumen bersarang paling terasa untuk struktur SOP.

## Perbandingan dengan Outline

Outline adalah wiki tim yang menjadi acuan editor aplikasi ini. Sumber: changelog resmi dan ringkasan fitur dari pihak ketiga (situs resminya tidak terjangkau dari lingkungan kerja saat penelusuran, jadi daftar ini bisa tertinggal dari versi terbaru). Yang dicatat hanya yang relevan untuk tim ini: kasir dan staf toko membaca di HP, tim Thunderlab menulis.

| Fitur Outline | Di sini | Catatan |
| --- | --- | --- |
| Koleksi dan pencarian full-text | sudah | Dengan sorotan dan filter jenis dan koleksi; perlu butir 37 agar tetap cepat |
| Editor blok dengan menu `/` | sebagian | Editor Tiptap ada; menu `/` belum (butir 1 dan 23) |
| Riwayat versi, pulihkan, beda versi | sebagian | Riwayat ada; pulihkan dan beda versi belum (butir 2) |
| Favorit dan terakhir dibuka | sudah | |
| Draf, terbit, arsip | sudah | |
| Berbagi tautan | sudah (internal) | Tautan publik sengaja ditunda (butir 22) |
| Ekspor (Markdown, PDF, zip) | sebagian | PDF lewat cetak; zip `.md` belum (butir 3) |
| Izin per koleksi dan per dokumen | sudah | Hanya admin yang mengatur |
| Grup pengguna | belum | Butir 24 |
| Dokumen bersarang (sub-halaman) | belum | Butir 23 |
| Tempat sampah dengan pemulihan | belum | Butir 25 |
| Tautan balik dan tautan antar dokumen `[[...]]` | belum | Butir 26 |
| Komentar inline, utas, selesai, sebut orang (@) | belum | Butir 9 dan 27 |
| Templat buatan sendiri | sebagian | Hanya kerangka tetap per jenis; butir 28 |
| Sematan (video, Figma, Canva, Slides) | belum | Butir 29; cocok untuk desain Canva SOP |
| Impor dari Word, Markdown, Notion, Confluence | sebagian | Hanya lewat skrip `docs:import`; butir 30 |
| Langganan dan notifikasi dokumen | belum | Butir 15 dan 31 |
| API, token, webhook | belum | Butir 32 |
| Server MCP (AI membaca dan mencari wiki) | belum | Butir 33 |
| Jawaban AI atas pertanyaan | direncanakan | Butir 10 |
| Statistik dokumen (dibaca, kontributor) | sebagian | Hanya "terakhir dibuka" pribadi; butir 34 |
| Ikon dan warna koleksi dan dokumen | belum | Butir 35 |
| Penyematan dokumen penting | direncanakan | Butir 8 |
| Kunci dokumen | belum | Butir 36, selaras alur persetujuan (12) |
| Kolaborasi real-time | ditunda | Butuh server WebSocket (ide jauh) |
| Baca offline penuh (PWA) | **lebih unggul di sini** | Outline tidak menyediakan baca offline |
| Diagram, langkah bergambar, kotak peringatan, asisten AI penyusun dokumen, riwayat chat AI | **di sini** | Tidak ada atau berbeda di Outline |
