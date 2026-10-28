# Katalog Fitur

Status: **selesai** · **sebagian** (ada yang belum) · **direncanakan**

Tambahkan atau ubah satu baris di sini setiap kali sebuah fitur masuk. Detail
rencana per fase ada di bagian bawah.

## Sudah berjalan

| Fitur | Status | Kode | Catatan |
| --- | --- | --- | --- |
| Login Google (Auth.js v5) | selesai | `src/auth.ts`, `src/proxy.ts` | Akses dibatasi `AUTH_ALLOWED_DOMAIN` dan `AUTH_ALLOWED_EMAILS` |
| Peran VIEWER / EDITOR / ADMIN | selesai | `src/lib/auth/session.ts` | ADMIN otomatis lewat `AUTH_ADMIN_EMAILS` |
| Koleksi: buat, ubah, arsip | selesai | `src/app/collections/`, `src/lib/services/collections.ts` | |
| Dokumen: buat, ubah, terbit, arsip | selesai | `src/app/docs/`, `src/lib/services/documents.ts` | Tipe: Panduan, Masalah, Referensi. Status: Draf, Terbit, Arsip |
| Template per tipe dokumen | selesai | `src/lib/document-templates.ts` | Kerangka bagian untuk tiap tipe |
| Editor rich-text + mode markdown | selesai | `src/components/editor/`, `src/components/document/MarkdownEditor.tsx`, `src/lib/editor-content.ts` | Tiptap (ProseMirror) ala Outline: tampilan langsung WYSIWYG, ketikan markdown (`## `, `- `, `**tebal**`) langsung menjadi format, menu `/` untuk menyisipkan blok (judul, daftar, centang, kutipan, kode, tabel, garis), toolbar yang menempel di atas keyboard HP. Isi tetap disimpan sebagai markdown (tanpa migrasi). Baris kosong dari Enter berlebih tidak disimpan. Dokumen yang memuat sintaks yang akan berubah atau hilang bila disimpan ulang dari editor visual (gambar, catatan kaki, HTML mentah, pagar kode bersarang, karakter yang di-escape, daftar yang dipisah baris kosong) otomatis dibuka dalam Mode Markdown dengan penjelasan, supaya tidak ada yang hilang. Tombol **Mode Markdown** tetap ada. Belum ada: gambar (menunggu object storage), kolaborasi real-time, toolbar melayang di dekat teks terpilih |
| Draf lokal otomatis | selesai | `src/components/document/DocumentForm.tsx` | Draf yang hanya beda format dari versi tersimpan tidak disimpan dan tidak memunculkan banner |
| Test otomatis dan CI | selesai | `npm test`, `.github/workflows/ci.yml` | Aturan route service worker, izin login, normalisasi markdown. CI: lint, tsc, test, build |
| Validasi env | selesai | `src/lib/env.ts` | Kredensial Google kosong memberi pesan yang menyebut nama variabelnya. `DATABASE_URL` yang hilang atau salah format sudah memberi galat jelas dari Prisma (diperiksa), jadi tidak divalidasi ulang |
| Pencarian full-text | selesai | `src/app/search/page.tsx`, `searchDocuments` di `documents.ts`, `src/lib/search-query.ts`, migrasi `3_fulltext_search` | Postgres full-text (`tsvector` + GIN, stemmer Indonesia): kata berimbuhan cocok, urut menurut relevansi, kutip untuk frasa, filter jenis dan koleksi, kata cocok disorot. Maksimal 50 hasil teratas |
| Pengetahuan Terkait | selesai | `src/components/document/RelatedDocumentsPicker.tsx`, `src/lib/related.ts`, `getRelatedDocuments`/`setRelatedDocuments` di `documents.ts` | Editor memilih dokumen terkait di form (cari judul, maksimal 20). Hubungannya dua arah dan satu pasangan satu baris. Pembaca hanya melihat dokumen terbit. Pilihan terkait belum ikut draf lokal otomatis |
| PWA dan offline-baca | selesai | `src/app/sw.ts`, `src/app/manifest.ts` | Halaman yang pernah dibuka bisa dibaca offline |
| Penjaga offline pada form | selesai | `src/lib/use-online-status.ts` | Tombol simpan nonaktif saat offline |
| Mode terang / gelap | selesai | `src/components/theme/` | |
| Identitas aplikasi (nama, logo, favicon) | selesai | `src/components/brand/Mark.tsx` | PR #19 |
| Halaman galat, tidak ditemukan, dan memuat | selesai | `src/app/error.tsx`, `global-error.tsx`, `not-found.tsx`, `loading.tsx` | Pesan berbahasa Indonesia, membedakan offline dari galat server |
| Favorit per pengguna | selesai | `src/lib/services/favorites.ts`, `src/components/document/FavoriteButton.tsx`, `src/app/favorites/page.tsx` | Tombol di halaman dokumen; draf dan arsip hanya muncul untuk editor/admin; nonaktif saat offline; halaman `/favorites` tidak di-cache service worker (data pribadi) |
| Terakhir dibuka per pengguna | selesai | `src/lib/services/recent-views.ts`, `src/components/document/RecordView.tsx`, `src/app/recent/page.tsx` | Dicatat dari klien setelah halaman tampil (bukan saat prefetch); satu baris per dokumen (aman terhadap dua permintaan bersamaan), 50 terbaru disimpan dan ditampilkan; `/recent` tidak di-cache service worker |
| Daftar isi dan tautan ke bagian | selesai | `src/lib/markdown.ts`, `src/components/document/TableOfContents.tsx`, `SectionHeading.tsx`, `src/app/docs/[slug]/page.tsx` | Bagian (`##`) dan sub-bagian (`###`); kolom samping di layar lebar, lipatan di atas teks di HP; ikon salin tautan di setiap judul bagian. Id sama dengan yang dibuat halaman, termasuk judul kembar, dan baris di dalam blok kode tidak dihitung |
| Tanggal konsisten (zona Jakarta) | selesai | `src/lib/format.ts` | Server (UTC) dan browser menampilkan hari yang sama di dekat tengah malam |
| Cache offline per pemilik | selesai | `src/lib/cache-owner.ts`, `src/components/layout/CacheGuard.tsx`, `src/lib/sw-routes.ts` | Cache halaman dikosongkan bila orang atau perannya di browser berganti, supaya draf yang dibuka editor tidak terlihat oleh pengguna berikutnya; `/search` tidak di-cache. Masih terbuka bagi orang yang belum login di perangkat itu (lihat `TODO.md`) |
| Penyunting terakhir dan riwayat revisi | selesai | `prisma/migrations/4_document_revisions`, `src/lib/services/revisions.ts`, `src/lib/revisions.ts`, `src/app/docs/[slug]/history/` | Halaman dokumen menampilkan "diperbarui ... oleh ..."; editor/admin membuka Riwayat (daftar versi, selisih karakter) dan melihat isi tiap versi (hanya baca). Simpan yang tidak mengubah isi tidak mencatat versi; maksimal 100 versi per dokumen. Perubahan status (terbitkan, arsipkan, kembali ke draf) juga menjadi versi dengan label di daftar ("Diterbitkan", "Diarsipkan", "Dikembalikan ke draf"); status yang sama tidak dicatat, dan perubahan status bersama teks hanya satu versi. Karena tiap perubahan status menyalin isi dan ikut batas 100, dokumen yang sering berganti status mendorong versi teks lama keluar lebih cepat. Memulihkan versi belum ada |
| Koleksi terbatas (akses baca per koleksi) | selesai | `prisma/migrations/5_collection_access`, `src/lib/collection-access.ts`, `src/lib/services/*`, `src/lib/cache-owner.ts`, `src/components/collection/CollectionMembersPicker.tsx` | Koleksi bisa ditandai `restricted`; hanya admin dan pengguna di daftar anggotanya (viewer maupun editor) yang membaca dan, bagi editor, menulis di dalamnya. Dipaksakan di semua jalur baca dan tulis (halaman dokumen, riwayat, edit, daftar koleksi, sidebar, beranda, pencarian beserta totalnya, pengetahuan terkait, kandidat terkait, favorit, terakhir dibuka) dan di aksi tulis; yang tidak berhak mendapat "tidak ditemukan" yang sama dengan alamat yang memang tidak ada. Mengubah status terbatas, daftar anggota, atau memindahkan dokumen ke/dari koleksi terbatas mengosongkan cache offline di perangkat orang-orang yang terpengaruh saat mereka membuka aplikasi online berikutnya. Admin mengaturnya di form koleksi (kotak "Batasi akses" dan pemilih anggota); daftar anggota tersimpan saat koleksi dibuka kembali. Ditunda: grup, pembatasan per dokumen, editor hanya-baca |
| Dokumen terbatas (akses baca per dokumen) | selesai | `prisma/migrations/7_document_access`, `src/lib/collection-access.ts`, `src/lib/services/documents.ts` (`setDocumentAccess`), `src/components/document/DocumentForm.tsx` | Satu dokumen bisa dibatasi seperti koleksi: admin selalu bisa, selebihnya hanya orang di daftarnya, selain itu "tidak ditemukan" di dokumen, daftar, pencarian (hasil dan total), jumlah per koleksi, riwayat, favorit, dan daftar terkait. Harus lolos aturan koleksi DAN dokumen. Hanya admin yang mengatur (bagian "Batasi akses dokumen ini" di form dokumen); mengubah batas bukan suntingan teks (tanpa revisi, `updatedAt` tetap). Ikon gembok menandai dokumen terbatas. Ditunda: grup, editor hanya-baca, merekam perubahan akses di riwayat |
| Undang pengguna dan atur peran | selesai | `prisma/migrations/6_invitations`, `src/lib/services/users.ts`, `src/app/admin/users/`, `src/components/admin/`, `src/auth.ts` | Halaman `/admin/users` (admin): undang email dengan peran Viewer, Editor, atau Admin; ubah peran lewat dropdown; batalkan undangan; cabut akses. Undangan adalah baris di tabel `invitations` (peran menunggu sampai orangnya masuk dengan Google; tanpa email keluar). Daftar `AUTH_ALLOWED_DOMAIN` dan `AUTH_ALLOWED_EMAILS` tetap berlaku bersama undangan. Dikunci: admin dari `AUTH_ADMIN_EMAILS` (perannya dikembalikan tiap login) dan akun sendiri. Mencabut menghapus undangan dan sesi orangnya; akun dan tulisannya tetap, dan ia masih bisa masuk bila domain atau `AUTH_ALLOWED_EMAILS` mengizinkannya. Ditunda: undangan lewat email, menghapus akun, masa berlaku undangan |
| Langkah bergambar dan kotak peringatan | selesai | `src/components/document/step-blocks.ts`, `StepCards.tsx`, `MarkdownContent.tsx`, aturan di `src/lib/ai/assistant.ts` | Meniru lembar SOP Canva untuk pembaca awam: blok berpagar ```` ```langkah ```` (satu baris per langkah, `Judul | penjelasan`) tampil sebagai kartu bernomor (satu kolom dengan panah di HP, grid dua atau tiga kolom di layar lebar), dan ```` ```peringatan ```` (baris pertama judul, sisanya tindakan) sebagai kotak merah. Tetap teks Markdown biasa (pencarian, riwayat, editor, cetak PDF); blok yang tidak bisa dibaca (kosong, lebih dari 12 langkah) tampil sebagai blok kode biasa. Asisten AI memakainya untuk alur berurutan, Mermaid hanya untuk alur bercabang. Tanpa migrasi |
| Diagram alur (Mermaid) di dokumen | selesai | `src/components/document/MermaidDiagram.tsx`, `src/components/document/MarkdownContent.tsx`, aturan di `src/lib/ai/assistant.ts` | Blok berpagar ```` ```mermaid ```` di isi dokumen digambar sebagai diagram (kotak dan panah) di halaman dokumen dan ikut tercetak ke PDF. Tampilan ramah pembaca awam: kartu membulat berwarna lembut, kelas siap pakai `:::start`, `:::decision`, `:::stop`, `:::done` (pertanyaan berupa kotak membulat, bukan belah ketupat), tombol **Perbesar** (zoom 50 sampai 300 persen) untuk membaca teks kecil di HP. Pustaka `mermaid` dimuat hanya bila halaman memuat diagram; `securityLevel: strict`. Kartu putih agar terbaca di tema gelap. Direktif `%%{}%%`, frontmatter `---`, karakter `\`, baris `click`, `url(` dan tag HTML (selain `<br>`) ditolak. Bila sintaks salah, ditolak, atau pustaka tidak bisa dimuat, tampil pesan dan teks sumbernya. Isinya tetap Markdown biasa (muat utuh di editor, pencarian, riwayat). Asisten AI diajari menulisnya. Tanpa migrasi. Ditunda: pratinjau diagram di editor, lihat `TODO.md` |
| Bagikan dan simpan sebagai PDF | selesai | `src/components/document/DocumentShareActions.tsx`, `src/lib/share.ts`, `@media print` di `src/app/globals.css`, kelas `print:hidden` di halaman dokumen dan menu | Tombol **Bagikan** dan **Simpan PDF** di halaman dokumen untuk semua yang bisa membacanya. Bagikan: lembar bagikan bawaan HP (`navigator.share`, hanya judul dan tautan) atau salin tautan; tautannya tetap meminta masuk dan memeriksa akses penerima, jadi tidak melebarkan siapa yang bisa membaca. Simpan PDF: dialog cetak browser (pilih Simpan sebagai PDF); cetakan tanpa menu, selalu terang, dengan baris asal (koleksi, tautan, tanda DRAF) di atas judul. Tanpa migrasi dan tanpa dependensi. Ditunda: lihat `TODO.md` |
| Asisten AI untuk admin di form dokumen | selesai (belum diuji dengan kunci API asli) | `src/app/api/ai/document-assistant/route.ts`, `src/lib/ai/`, `src/components/document/AiAssistantPanel.tsx`, `DocumentForm.tsx` | Tombol **Asisten AI** di Dokumen Baru dan Edit Dokumen, hanya untuk ADMIN. Panel chat: admin menempel bahan atau memberi perintah, AI membalas dan mengusulkan dokumen (judul, slug, koleksi, jenis, ringkasan, isi). **AI tidak pernah menyimpan atau menerbitkan**: admin menekan "Terapkan ke form", memeriksa, lalu menyimpan seperti biasa. Model `claude-opus-5-5` lewat `@anthropic-ai/sdk`, butuh `ANTHROPIC_API_KEY` (tanpa itu panel berkata "AI belum dikonfigurasi"). Alat baca-saja: daftar koleksi, cari dokumen, baca dokumen (dengan hak admin). Usulan dipindai: email, tautan, nomor panjang, kata kredensial, dan nama orang memunculkan peringatan. Tanpa migrasi, riwayat chat tidak disimpan. Ditunda: lihat `TODO.md` |
| Impor draf dokumen dari berkas | selesai | `content/drafts/`, `scripts/import-drafts.ts`, `src/lib/draft-import.ts`, `src/lib/services/draft-import.ts` | `npm run docs:import` memasukkan berkas markdown sebagai **draf** (hanya yang slug-nya belum ada, tidak pernah menimpa, penulis di riwayat = admin). Enam draf pertama berasal dari log tiket CS (laporan Sales Payment Summary lambat, Purchase Invoice gagal submit, permission brand, PO/PR tidak bisa submit, harga/diskon POS tidak sesuai, mode offline POS). Isinya perlu ditinjau pemilik pengetahuan sebelum terbit |
| Penolakan izin yang jelas | selesai | `src/app/akses-ditolak/`, `requireRole` di `src/lib/auth/session.ts` | VIEWER yang mencoba aksi EDITOR melihat penjelasan, bukan dilempar ke beranda |

## Dipertimbangkan (belum diputuskan dipakai atau tidak)

### Ekspor dokumen ke `.md` di GitHub
Status: **ide**, 24 Okt 2026; pemilik belum memutuskan akan dipakai. Belum ada kode. Catatan rancangan
supaya tidak dibahas dari nol:

- Tujuannya belum dipilih: **cadangan di luar database** atau **bisa dibaca di Obsidian**. Cadangan
  cukup dengan ekspor sederhana; untuk Obsidian struktur (folder per koleksi, tautan antar dokumen) perlu dirancang.
- Satu arah, database ke Git. Kalau berkas diedit di GitHub, database tidak ikut berubah, jadi repo harus
  tertulis sebagai hasil ekspor.
- Repo privat terpisah dari repo kode (isinya prosedur internal).
- Semua dokumen bukan draf, bukan hanya yang diarsipkan, dengan status di frontmatter (judul, slug, jenis,
  koleksi, status, tanggal, penyunting) agar bisa diimpor kembali dan dokumen yang dibuka dari arsip tidak jadi kasus khusus.
- Urutan yang dianjurkan: (1) tombol **Ekspor** khusus admin yang mengunduh zip `.md`, tanpa infrastruktur
  dan tanpa token; (2) baru kemudian sinkronisasi terjadwal ke repo privat, yang butuh token GitHub dan
  tempat menyimpan rahasia, dan sebaiknya berjalan sebagai pekerjaan terpisah, bukan dari tombol Arsipkan
  (GitHub bisa gagal atau lambat saat tombol ditekan).

### Kolaborasi real-time di editor
Status: **ide**, 24 Okt 2026. Editor sekarang (Tiptap/ProseMirror) bisa dikembangkan ke penyuntingan bersama lewat
Yjs, tetapi butuh server WebSocket yang tetap hidup (Hocuspocus atau sejenisnya); Vercel serverless tidak cocok
untuk itu. Belum ada kode. Cukup bernilai hanya bila sering ada dua editor di dokumen yang sama pada saat yang sama;
saat ini penyunting terakhir dan riwayat sudah menutup kebutuhan "siapa mengubah apa".

## Direncanakan

### Fase 0 — Jaring pengaman
Sudah: pesan penolakan izin, halaman `error`/`not-found`/`loading`, banner draf palsu, validasi env Google, test (`npm test`), dan CI GitHub Actions (hijau di PR #21; belum diwajibkan lewat branch protection).
Belum: pemisahan database Preview. Hydration error #418 dari draf lokal sudah diperbaiki; kemungkinan sisanya di production dicatat di `TODO.md`.

### Fase 1 — Mudah dipakai
Pencarian full-text Postgres dengan filter dan sorotan hasil (sudah) · UI Pengetahuan
Terkait (sudah) · penyunting terakhir dan
riwayat revisi (sudah; pemulihan versi belum). Penanda kesegaran dibatalkan (lihat "Diputuskan tidak dikerjakan").

### Fase 2 — Lampiran
Object storage untuk gambar dan file, upload dari editor, dan cache gambar untuk
baca offline.

### Fase 3 — Jika terbukti perlu
Redis (rate limit, antrean), ekspor cermin Obsidian, antrean sinkron tulis-offline.

## Diputuskan tidak dikerjakan

### Penanda kesegaran dokumen ("perlu ditinjau")
Diputuskan pemilik 24 Okt 2026: **tidak dibangun.** Alasannya: dokumen prosedur diperbarui bersamaan
dengan perubahan di POS, jadi dokumen yang usang tanpa disadari tidak diperkirakan terjadi, dan
penanda tinjau hanya menambah pekerjaan. Rancangan yang sempat dibahas, bila suatu hari dibutuhkan lagi:
`reviewedAt` dan `reviewedById` di `documents` (migrasi aditif), pemilik = pembuat dokumen (`authorId`,
tanpa kolom baru), ambang 90 hari terhitung dari yang terbaru antara tanggal tinjau dan tanggal
diperbarui, hanya dokumen terbit yang ditandai, EDITOR/ADMIN bisa menandai "sudah ditinjau"
tanpa mengubah tanggal "Diperbarui", plus halaman "Perlu Ditinjau" khusus editor.
