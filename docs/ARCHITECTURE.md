# Arsitektur

## Gambaran

Aplikasi web Next.js 16 (App Router) di Vercel, region `sin1` (Singapura), dengan
PostgreSQL di Neon (`ap-southeast-1`). Halaman dirender di server dan membaca data
lewat lapisan service; sebagian kecil interaksi (editor, form) berjalan di klien.

```text
Browser (PWA + service worker)
   │
   ▼
Vercel · Next.js (src/proxy.ts → halaman server → server actions)
   │                         │
   ▼                         ▼
src/lib/services/*      src/auth.ts (Auth.js v5)
   │                         │
   └──────────► Prisma ◄─────┘
                  │
                  ▼
            PostgreSQL (Neon)
```

Aturan: akses data lewat `src/lib/services/`, bukan query Prisma langsung di komponen.

## Model data

Didefinisikan di `prisma/schema.prisma`.

- **User** (`role`: VIEWER, EDITOR, ADMIN) beserta tabel Auth.js: Account, Session, VerificationToken.
- **Collection** berisi banyak **Document**. Menghapus koleksi yang masih berisi dokumen ditolak (`onDelete: Restrict`).
- **Document**: `type` (PANDUAN, MASALAH, REFERENSI), `status` (DRAFT, PUBLISHED, ARCHIVED), `content` berupa markdown, `authorId` opsional.
- **DocumentRelation**: relasi antar dokumen untuk "Pengetahuan Terkait". Bagi pembaca relasi itu dua arah (A menunjuk B berarti B juga menampilkan A), tetapi satu pasangan disimpan sebagai satu baris, searah penulisan pertamanya. Karena itu membaca dan mengubah selalu memperlakukan kedua arah sebagai relasi yang sama (`getRelatedDocumentIds`, `setRelatedDocuments`), dan semua penulisan relasi diserialkan dengan satu `pg_advisory_xact_lock`: kunci per dokumen terbukti tidak cukup, karena A menyimpan [B] bersamaan dengan B menyimpan [A] menulis dua baris (40 dari 40 percobaan). Maksimal 20 per dokumen (`MAX_RELATED`).
- **DocumentRevision**: satu keadaan dokumen (judul, ringkasan, isi, jenis, status, penyunting, waktu) dengan nomor versi `unique(documentId, version)`. Ditulis dalam satu transaksi dengan penyimpanan dokumen, hanya bila teksnya benar-benar berubah (`hasMeaningfulChange`: editor visual menulis ulang markdown saat memuat, jadi perbandingannya memakai `isEquivalentMarkdown`). Nomor versi "terbaru + 1" sehingga simpan bersamaan diserialkan dengan `pg_advisory_xact_lock` per dokumen; tanpa kunci itu simpan bersamaan gagal dengan pelanggaran unik. Dokumen yang lahir sebelum fitur ini tidak punya revisi: simpan pertamanya menyimpan keadaan sebelumnya sebagai versi 1 (migrasi sengaja tidak mengisi ulang data). Dipangkas ke 100 terbaru (`REVISION_LIMIT`). `Document.lastEditedById` mencatat siapa yang menyimpan terakhir, termasuk perubahan status. Halaman `/docs/<slug>/history` hanya untuk EDITOR/ADMIN dan tidak di-cache service worker. Dokumen dibaca ulang di dalam transaksi setelah kunci diambil; pembacaan sebelum kunci bisa basi, dan membandingkan dengannya menganggap pengembalian ke isi lama sebagai "tidak berubah" sehingga revisinya terlewat (terukur pada 25 dari 30 percobaan, kini ada test). Kolom `status` pada revisi adalah status saat simpan itu, bukan status dokumen sekarang. Perubahan status juga membuat revisi (isi disalin, `status` berisi status barunya), baik dari tombol terbit/arsip (`setDocumentStatus`) maupun dari kolom status di form (`updateDocument`; satu revisi bila teks ikut berubah). Menetapkan status yang sudah berlaku tidak mencatat apa pun dan tidak mengubah `lastEditedById`. Label di daftar riwayat tidak disimpan: diturunkan dari perbandingan status dengan versi sebelumnya (`statusChangeLabel`), sehingga tidak butuh kolom baru. Pembuatan versi dasar, penguncian, dan pemangkasan dipakai bersama oleh kedua jalur (`lockRevisions`, `snapshotBaseline`, `appendRevision`).\n\n**Koreksi catatan migrasi 4:** komentar di `prisma/migrations/4_document_revisions/migration.sql` menyebut pembacaan `documents` tidak terblokir. Itu keliru: `ADD COLUMN` memegang kunci `ACCESS EXCLUSIVE` pada `documents` sampai transaksi migrasi commit, jadi pembacaan ikut menunggu sesaat (terukur: sebuah `SELECT` menunggu 3 detik selama transaksi 4 detik). Pada puluhan dokumen jedanya milidetik; risikonya hanya bila ada transaksi panjang yang memegang `documents` saat `migrate deploy` berjalan. Berkas SQL-nya sengaja tidak diubah, karena sudah diterapkan ke database Preview dan mengubah teksnya mengubah checksum yang tercatat Prisma.
- **Favorite**, **RecentView**: daftar per pengguna (`entityType` = `DOCUMENT`). Keduanya tanpa foreign key, jadi baris bisa menunjuk dokumen yang sudah dihapus atau tidak boleh dilihat pembaca; saat dibaca baris seperti itu disaring. `RecentView` tidak punya unique key: satu dokumen satu baris dijaga dengan menghapus lalu menulis di dalam transaksi yang diserialkan per pengguna (`pg_advisory_xact_lock`), dipangkas ke 50 terbaru.

Hanya dokumen `PUBLISHED` terlihat oleh VIEWER. Draf dan arsip hanya untuk EDITOR dan ADMIN.

Service worker men-cache halaman baca per URL, tanpa membedakan pengguna. Karena itu halaman yang berisi data pribadi (`/favorites`, `/recent`) **tidak** di-cache (`src/lib/sw-routes.ts`, `isPersonalRoute`). `/search` ikut di dalamnya (hasil bergantung peran, editor juga mendapat draf). Halaman baru yang menampilkan data satu pengguna harus ikut ke sana.

Halaman lain (mis. dokumen draf yang dibuka editor) tetap di-cache, jadi cache dikaitkan dengan pemiliknya: setiap halaman mencatat `id:peran` pengguna di `localStorage` (`kb:cache-owner`), dan `CacheGuard` mengosongkan `pages-rsc-cache` bila pengguna atau perannya berbeda dari yang tercatat (`src/lib/cache-owner.ts`). Keluar tetap mengosongkannya lewat `UserMenu`.

Tabel `documents` punya index GIN pencarian berbasis ekspresi (`documents_search_idx`, lihat keputusan 3). Prisma tidak bisa menggambarkannya di `schema.prisma`; migrasi adalah sumber kebenarannya, dan `prisma migrate diff` tidak melaporkannya sebagai drift.

## Infrastruktur

| Komponen | Status | Peran |
| --- | --- | --- |
| PostgreSQL (Neon) | dipakai | Sumber kebenaran: dokumen, koleksi, pengguna, sesi |
| Object storage | direncanakan (Fase 2) | File dan lampiran |
| Redis | ditunda | Lihat keputusan di bawah |

## Keputusan

Format: konteks, keputusan, alasan, alternatif yang ditolak. Tambahkan di bawah,
terbaru di atas.

### 1. Redis ditunda sampai ada pemicu

- **Status:** diusulkan, menunggu persetujuan owner.
- **Konteks:** belum ada pekerjaan latar belakang. Beban baca masih kecil, dan Next.js dengan Neon di region yang sama cukup cepat.
- **Keputusan:** jangan menambah Redis sekarang. Tambahkan bila salah satu terjadi: perlu rate limit, perlu antrean (ekspor, impor, email), atau cache hasil pencarian terbukti diperlukan.
- **Catatan:** di Vercel serverless, pakai Redis berbasis HTTP (mis. Upstash). Antrean sederhana bisa dimulai dari tabel Postgres.
- **Ditolak:** memasang sekarang "untuk berjaga-jaga" — menambah layanan, biaya, dan kegagalan yang harus dipantau tanpa manfaat yang terukur.

### 2. Object storage untuk lampiran

- **Status:** diusulkan, menunggu persetujuan owner (pilihan penyedia belum diputuskan).
- **Konteks:** dokumen panduan dan masalah hampir pasti membutuhkan tangkapan layar. Menyimpan gambar sebagai base64 di kolom `content` membengkakkan baris dan memperlambat pencarian.
- **Keputusan:** simpan file di object storage, metadata di tabel `Attachment`, unggah langsung dari klien lewat URL bertanda tangan.
- **Pilihan penyedia:** Vercel Blob (konfigurasi paling sedikit) atau Cloudflare R2 / S3 (tidak terikat Vercel).

### 3. Pencarian memakai full-text Postgres

- **Status:** diterapkan (migrasi `3_fulltext_search`).
- **Konteks:** `ILIKE '%kata%'` tidak bisa memakai index (lihat `TODO.md`): selalu membaca seluruh tabel, dan `content` panjang. Diukur lokal pada 30 ribu dokumen: `ILIKE` 970 ms, full-text untuk kata yang jarang 0,5 ms.
- **Keputusan:** index GIN pada *ekspresi* `setweight(to_tsvector('indonesian', title), 'A') || ...excerpt 'B' || ...content 'C'`, tanpa kolom baru. Query (`searchDocuments`) memakai `to_tsquery` yang disusun dari input pengguna oleh `src/lib/search-query.ts`, diurutkan dengan `ts_rank` (judul lebih berat daripada ringkasan, ringkasan daripada isi), disorot dengan `ts_headline`. Hak lihat (hanya `PUBLISHED` untuk VIEWER) ditegakkan di SQL yang sama. Tidak perlu mesin pencari terpisah pada skala ini.
- **Konfigurasi bahasa `indonesian`:** stemmer Snowball bawaan PostgreSQL 15+ yang membuang imbuhan (memotong, dipotong, pemotongan → potong). Teks campuran Indonesia–Inggris aman: kata Inggris nyaris tidak diubah, dan dokumen serta query distem oleh konfigurasi yang sama sehingga tetap saling cocok. Alternatif `simple` (tanpa stem) ditolak karena "dipotong" tidak akan menemukan "memotong". Konfigurasi ini tidak punya daftar stop word (diverifikasi di PostgreSQL 16), jadi kata seperti "yang" tetap ikut dicari.
- **Kenapa ekspresi, bukan kolom `tsvector` (digantikan 28 Okt 2026, lihat pembaruan di bawah):** menambah kolom (generated atau lewat trigger) menulis ulang atau memperbarui seluruh tabel `documents` dan mengunci tabel itu selama migrasi, padahal build Vercel menjalankan migrasi di setiap PR dan database Preview mungkin sama dengan production. `CREATE INDEX CONCURRENTLY` hanya menambah index tanpa menghalangi tulis. Harganya: ekspresi harus identik di migrasi dan di query (dijaga test `search-query.test.ts`), dan `ts_rank` menghitung ulang vektor untuk baris yang cocok. Diukur: kata yang cocok di *semua* 30 ribu dokumen butuh sekitar 7 detik; pada skala ratusan sampai ribuan dokumen tidak terasa. Bila suatu hari terasa, jalur lanjutannya kolom `tsvector` tersimpan, dibuat dengan migrasi terjadwal tersendiri.
- **Batas:** isi dipotong 200 000 karakter dalam index (`left(content, 200000)`) karena satu `tsvector` tidak boleh lebih dari 1 MB; tanpa itu menyimpan dokumen raksasa gagal. Hasil dibatasi 50 teratas. Pencocokan memakai kata utuh atau awalan kata (tiga huruf ke atas), bukan potongan di tengah kata seperti `ILIKE` dulu.
- **Pembaruan 28 Okt 2026 (migrasi `9_search_vector`): kolom `tsvector` tersimpan.** Jalur lanjutan di atas diambil karena terukur perlu: pada 20.000 dokumen (sekitar 6 KB), kata yang ada di hampir semua dokumen ("kasir closing") butuh **11,6 detik** (indeks ekspresi tidak dipakai bila hampir semua baris cocok, dan `ts_rank` menghitung ulang vektor tiap baris); dengan kolom tersimpan **0,2 detik** (247 ms terukur lewat aplikasi, data hasil 346 KB menjadi 24 KB), kata jarang 4 ms. Kolom `search_vector` bersifat `GENERATED ALWAYS AS (...) STORED` (ekspresi sama dengan `SEARCH_VECTOR_SQL`, dijaga `search-query.test.ts`), diberi indeks GIN, dan dibaca oleh `searchDocuments`; aplikasi tidak pernah menulisnya (di Prisma bertipe `Unsupported("tsvector")` dengan `@default(dbgenerated(...))` agar `migrate diff` tidak melaporkan selisih). Harga: menambah kolom menulis ulang tabel dengan kunci penuh (baca dan tulis menunggu; `lock_timeout` 5 detik agar tidak membekukan aplikasi bila ada transaksi panjang; sekitar 50 detik pada 20.000 dokumen, hampir seketika pada ratusan, jadi dikerjakan selagi dokumen sedikit) dan tabel membesar dua kali lipat (58 MB menjadi 117 MB). Indeks ekspresi lama `documents_search_idx` sengaja dipertahankan agar kode lama tetap punya indeks bila di-rollback; hapus di migrasi berikutnya setelah tidak ada versi lama yang berjalan. Bersamaan: indeks `updatedAt` (beranda), daftar koleksi dan hasil pencarian hanya mengambil kolom yang ditampilkan, halaman koleksi dibagi 50 per halaman, dan pemilih dokumen terkait mencari di seluruh perpustakaan lewat server (sebelumnya hanya 500 judul pertama menurut abjad).
- **Ditolak:** `pg_trgm` (mencocokkan potongan huruf, tidak mengenal imbuhan, index jauh lebih besar), mesin pencari terpisah (infrastruktur baru tanpa manfaat pada skala ini).

### 4. Editor memakai Tiptap (ProseMirror), isi tetap markdown
Diputuskan 24 Okt 2026. Pengguna menulis SOP dan panduan dari HP, jadi yang dipilih adalah editor rich text
ala Outline (menu `/`, bilah alat di atas keyboard, simbol markdown disembunyikan), bukan gaya Live Preview
Obsidian: itu berbasis CodeMirror, yang sering bermasalah dengan keyboard HP, dan menampilkan simbol yang
mengganggu penulis non-teknis. Editor Outline sendiri berlisensi BSL sehingga tidak dipakai; Tiptap (MIT)
dibangun di ProseMirror yang sama.

- **Penyimpanan tidak berubah.** `Document.content` tetap markdown; tidak ada migrasi dan halaman baca
  (`react-markdown`) tidak berubah.
- **Editor menulis ulang seluruh dokumen pada tiap simpan, jadi yang tidak dikenalnya hilang.** Review independen
  membuktikan bahwa gambar, catatan kaki, HTML mentah, pagar kode bersarang, karakter yang di-escape (`\#`, `1\.`)
  dan daftar yang dipisah baris kosong rusak atau berubah arti pada edit pertama. Karena itu `RichTextEditor` memeriksa
  setiap dokumen yang masuk (saat dibuka, memulihkan draf, ganti template): isi dibaca, ditulis ulang
  seperti saat disimpan, lalu kedua versi dibandingkan sebagai pohon markdown (`isLosslessRoundTrip` di
  `src/lib/editor-content.ts`, tanpa melihat tata letak: spasi tabel, `*` atau `-`, `_a_` atau `*a*`, daftar rapat atau
  longgar tidak dihitung). Bila berbeda, editor memanggil `onUnsupported` dan `MarkdownEditor` membuka dokumen
  dalam mode Markdown dengan pemberitahuan. Pemeriksaan ini umum, jadi sintaks baru yang tidak dikenal
  ikut tertangkap tanpa daftar khusus. Fixture kasus aman dan berisiko ada di `src/lib/editor-roundtrip.test.ts` dan
  dijalankan dengan `MarkdownManager` yang sama dengan editor.
- **Yang tetap berubah tanpa kehilangan arti:** tabel diberi spasi rata, setext menjadi `#`, tautan referensi menjadi
  inline, tautan otomatis ditulis eksplisit, dan satu baris kosong tambahan setelah blok kode. Diff revisi bisa
  sedikit lebih ramai pada edit pertama sebuah dokumen lama.
- **Paragraf kosong tidak disimpan.** Serializer menulis tiap Enter kosong sebagai `&nbsp;`; `dropEmptyParagraphs`
  membuangnya di tingkat atas dokumen sebelum ditulis. Yang di dalam daftar, kutipan, dan tabel dibiarkan. Dua daftar
  yang sengaja dipisah paragraf kosong tidak bisa ditulis ulang dengan setia, sehingga dokumen seperti itu
  dibuka dalam mode Markdown (lihat di atas).
- **Kolaborasi real-time ditunda** (butuh server WebSocket yang hidup terus); lihat FEATURES "Dipertimbangkan".

### 5. Koleksi terbatas: satu kebijakan, disaring di setiap jalur baca dan tulis
Diputuskan 24 Okt 2026. Per koleksi (bukan per dokumen), dengan daftar pengguna per koleksi; admin selalu bisa, editor
dan viewer ikut daftar. Model: `collections.restricted` (bawaan `false`, jadi data lama tetap terbuka) dan tabel
`collection_members(collectionId, userId)`.

- **Satu definisi** di `src/lib/collection-access.ts` (`canAccessCollection`, `collectionReadableWhere`,
  `documentReadableWhere`, `collectionReadableSql`). Sebelumnya tidak ada fungsi visibilitas pusat dan satu-satunya
  masukan identitas adalah peran, jadi tiap fungsi baca kini **wajib** menerima `viewer: { id, role }` (tipenya
  mewajibkan; bukan opsional) supaya jalur baru tidak bisa lupa.
- **Tidak berhak = tidak ditemukan**, bukan "akses ditolak": respons halaman untuk dokumen/koleksi terbatas identik byte
  per byte dengan alamat yang tidak ada (diukur), jadi keberadaannya tidak bocor lewat status atau isi.
- **Pencarian** menyaring di `WHERE` yang sama dengan `count(*) OVER ()`, bukan di JS sesudahnya, supaya `total` tidak
  membocorkan jumlah. Favorit dan terakhir dibuka menyaring di query (bukan di JS), jadi entri lama yang aksesnya dicabut
  disembunyikan, tidak dihapus: muncul lagi bila akses dikembalikan.
- **Relasi terkait**: dokumen terbuka yang berelasi ke dokumen terbatas tidak menampilkannya ke yang tidak berhak.
  Editor yang menyimpan daftar terkait tidak bisa menambah atau menghapus relasi ke dokumen yang tidak bisa ia baca
  (relasi tersembunyi dipertahankan; kalau tidak, menyimpan form akan menghapusnya diam-diam).
- **Tulis**: `createDocument`, `updateDocument` (termasuk memindahkan dokumen ke/dari koleksi terbatas),
  `setDocumentStatus`, `deleteDocument` menolak aktor yang tidak berhak. Dijaga di service karena server action bisa
  dipanggil lewat POST langsung.
- **Cache offline**: service worker menyimpan halaman hanya berdasarkan URL. `cacheOwner` memuat kunci akses
  (`accessKey`): sidik jari **semua** koleksi terbatas (id dan `updatedAt`) ditambah keanggotaan orang itu. Karena itu
  membalik `restricted` pada sebuah koleksi, menambah koleksi terbatas, mengubah anggota, atau memindahkan dokumen ke/dari
  koleksi terbatas (menyentuh `updatedAt` kedua koleksi) mengubah kunci bagi semua orang non-admin, termasuk yang bukan
  anggota, sehingga cache mereka dikosongkan. Admin dan semua orang selama belum ada koleksi terbatas memakai bentuk lama
  `id:role`, jadi cache mereka tidak dikosongkan oleh fitur ini. Review independen menemukan versi pertama hanya
  mengikuti keanggotaan dan melewatkan kasus utamanya (koleksi yang tadinya terbuka dibuat terbatas); itu diperbaiki
  dan dites. Batas yang jujur: pengosongan baru terjadi saat orang itu membuka aplikasi **online** berikutnya; salinan
  yang sudah ada di perangkatnya tetap terbaca offline sampai saat itu.
- **Slug adalah ruang nama global (keputusan pemilik, 24 Okt 2026)**: pesan "slug dokumen sudah digunakan" tetap, jadi
  editor di luar koleksi terbatas bisa tahu bahwa sebuah slug sudah dipakai. Yang terbuka hanya itu, bukan judul atau isi.
  Memeriksa akses ke koleksi tujuan dilakukan **sebelum** pemeriksaan slug, sehingga permintaan ke koleksi yang tidak boleh
  dibaca dijawab sama apa pun slug-nya. Mengganti ini berarti mengubah bentuk URL dokumen.
- **Fungsi baca mana pun menerima `viewer`**, termasuk `getRelatedDocumentIds` (id masuk ke halaman form edit),
  `getRevisionList` dan `getRevision`. Satu-satunya pengecualian yang disengaja adalah `getDocumentForRevalidate`
  (menyegarkan halaman setelah penulisan yang sudah diotorisasi). Aksi server menolak `id` yang bukan string dan tidak lagi
  meneruskan teks galat Prisma mentah ke klien (`src/lib/errors.ts`).
- **Layar admin** (`CollectionForm`, `CollectionMembersPicker`, `setCollectionMembers`): hanya ADMIN, baik di UI maupun di service
  (aksi bisa dipanggil lewat POST langsung). Daftar anggota diganti utuh dalam satu transaksi dengan `pg_advisory_xact_lock`
  per koleksi, dan menyentuh `updatedAt` koleksi supaya kunci cache offline berubah. Form menyertakan penanda
  `restrictedTouched` dan `membersTouched`: form yang tidak membawanya (dikirim manual, atau dari tab yang dibuka sebelum
  fitur ada) tidak boleh dibaca sebagai "buka koleksi" atau "kosongkan anggota". Anggota disimpan saat koleksi dibuka kembali.


### 6. Dokumen terbatas: aturan yang sama, dan harus lolos koleksi dan dokumen

Satu dokumen bisa dibatasi seperti koleksi: `Document.restricted` dan tabel `document_members` (migrasi `7_document_access`). Perilakunya sama: admin selalu bisa, selebihnya hanya orang di daftar dokumen (viewer membaca, editor membaca dan menulis), dan yang tidak berhak mendapat "tidak ditemukan".

- **Harus lolos keduanya** (keputusan pemilik): dokumen terbatas di koleksi terbatas butuh tempat di dua daftar; dokumen terbuka di koleksi terbatas tetap mengikuti koleksi; berada di daftar dokumen tidak membuka koleksi yang tertutup. Aturannya ada di `src/lib/collection-access.ts` (`documentReadableWhere`, bentuk `AND` agar tidak bertabrakan dengan pemanggil yang men-spread hasilnya; `documentReadableSql` untuk SQL mentah; `canAccessDocument`).
- **Hanya admin** yang membatasi dokumen dan mengatur daftar (`setDocumentAccess`, kunci advisory `document_members:<id>`, maksimal 200 anggota). Editor tidak bisa mengubahnya, tidak ada bagian itu di form mereka, dan aksi mengabaikan field-nya. Mengubah batas **bukan suntingan teks**: `updatedAt` dokumen tidak berubah dan tidak ada revisi.
- **Raw SQL**: pencarian dan daftar revisi menyaring di `WHERE` yang sama dengan `count(*) OVER ()`; jumlah dokumen per koleksi (`_count`) ikut aturan yang sama, jadi tidak ada angka yang membocorkan dokumen tersembunyi.
- **Kunci cache offline** memuat id semua dokumen terbatas dan dokumen tempat orang itu terdaftar. Sengaja **tidak** memakai `Document.updatedAt`: itu berubah di setiap suntingan, dan setiap suntingan dokumen terbatas akan mengosongkan cache semua orang. Kunci berubah saat dokumen dibatasi, dibuka, dibuat, dihapus, atau saat orang itu ditambah atau dicabut.
- **Yang tidak dilakukan**: grup, batas baca-saja untuk editor, merekam perubahan akses di riwayat. Lihat `TODO.md`.


### 7. Asisten AI untuk admin: mengusulkan, tidak menulis

`POST /api/ai/document-assistant` (SSE) memanggil Claude (`claude-opus-5-5`, `@anthropic-ai/sdk`) untuk membantu admin menyusun dokumen di form. Riwayat chat disimpan per pengguna (keputusan 11).

- **AI tidak punya jalur tulis.** Alatnya `list_collections`, `search_documents`, `read_document` (baca-saja, memakai viewer admin) dan `propose_document`, yang **tidak dijalankan server**: usulan diteruskan ke klien sebagai kejadian SSE dan giliran berhenti. Admin menerapkannya ke form dan menyimpan lewat aksi yang sudah ada (validasi, revisi, aturan akses tetap berlaku). Karena itu injeksi prompt lewat bahan yang ditempel atau dokumen yang dibaca paling jauh menghasilkan teks usulan, yang dibaca admin; pemindai `src/lib/ai/sensitive.ts` menandai email, tautan, nomor panjang, kata kredensial, dan nama orang.
- **Otorisasi di server** (`src/lib/ai/handler.ts`): sesi wajib dan `role === ADMIN` (prop `aiEnabled` di form hanya menyembunyikan tombol). `Origin` harus sama dengan host dan `Content-Type` JSON (cegah CSRF, karena tiap permintaan berbiaya). Batas ukuran **menolak** dengan pesan, tidak memotong. Pembatas laju di memori per admin (`rate-limit.ts`; per instance serverless, jadi rem kasar; batas pengeluaran di akun Anthropic yang menjadi batas keras). Isi percakapan tidak dicatat di log (riwayat tersimpan di basis data, lihat keputusan 11); galat penyedia diganti kalimat tetap.
- **Pengaturan model** (`src/lib/ai/assistant.ts`): thinking bawaan model (tidak bisa dimatikan), `output_config.effort: "medium"` eksplisit, tanpa `tool_choice` paksa (ditolak 400 oleh model ini; prompt yang mengarahkan), `max_tokens` 32.000 dengan streaming, fallback server-side (`server-side-fallback-2026-07-01`), `stop_reason` `refusal` dan `max_tokens` ditangani sebelum alat dijalankan, giliran asisten dikembalikan utuh (blok thinking ikut) dalam putaran alat, maksimal 6 putaran. Prompt sistem beku (dengan `cache_control`); daftar koleksi dan isi form masuk di giliran pengguna agar prefiks cache tidak berubah.
- Service worker: POST tidak pernah di-cache (`isNetworkOnlyRequest`), dan ada tes yang mengunci `/api/ai/*`.
- **Yang tidak dilakukan**: memberi AI hak tulis, memakai AI untuk editor non-admin, lampiran berkas ke chat. Lihat `TODO.md`.

### 8. Bagikan = tautan internal, PDF = cetak browser

Keputusan pemilik (28 Okt 2026). **Bagikan** hanya memberi tautan biasa ke `/docs/<slug>`: penerima tetap melewati login dan `getDocumentBySlug(viewer)`, sehingga aturan koleksi dan dokumen terbatas tidak bisa dilewati lewat berbagi. **PDF** adalah `window.print()` terhadap halaman yang sama dengan `@media print` (cangkang aplikasi yang tingginya tetap diratakan agar mengalir ke banyak lembar; token terang dipasang kembali di `@media print` sehingga mencetak dari tema gelap tetap terbaca, termasuk lewat Ctrl+P atau menu bagikan iOS; blok kode dibungkus dan tabel dipaksa selebar halaman). Tidak dipilih: tautan publik berbunyi rahasia (butuh tabel dan migrasi, menembus aturan akses, risiko bocor) dan PDF dari server (Chromium headless di Vercel berat dan rawan gagal). Tidak ada perubahan pada proxy atau service worker.

### 9. Diagram alur memakai Mermaid, tersimpan sebagai teks Markdown

Keputusan pemilik (28 Okt 2026). Diagram adalah blok berpagar ```` ```mermaid ```` di dalam isi dokumen, jadi tetap teks: ikut pencarian, riwayat revisi, ekspor, dan lolos bolak-balik editor (ada kasusnya di `editor-roundtrip.test.ts`). Penggambarnya `MermaidDiagram` (komponen klien) yang dipakai `MarkdownContent` untuk blok `language-mermaid`; blok kode lain tidak berubah.

- **Keamanan**: teks dokumen adalah data. `securityLevel: "strict"` menghapus skrip dan penangan event, tetapi **tidak** menghapus gambar, tautan, dan CSS `url()` (terbukti: gambar di label ikut diminta peramban). Karena itu `unsafeDiagramReason` menolak sebelum digambar: direktif `%%{...}%%`, frontmatter `---`, karakter `\` (CSS bisa mengeja `url(` sebagai `\75rl(`), baris `click`, `url(`, dan tag HTML selain `<br>`; yang ditolak tampil sebagai pesan dan teks sumber. Pengaturan `securityLevel` sendiri tidak bisa ditimpa direktif (mermaid menghapus kunci aman).
- **Beban**: `mermaid` diimpor dinamis hanya saat ada diagram, dan gambar dibuat satu per satu (mermaid menyimpan status global). Halaman tanpa diagram tidak memuatnya saat dibuka; tetapi service worker men-precache semua potongan `_next/static`, termasuk potongan mermaid (sekitar 3 MB mentah) yang diunduh saat service worker dipasang.
- **Tampilan** (`mermaid-style.ts`): kartu putih tetap, karena diagram menggambar teks gelap. Tema `base` kustom: kartu membulat, bayangan tipis, warna lembut, label jawaban berbentuk pil; kelas `start`, `decision`, `stop`, `done` ditambahkan otomatis ke flowchart yang tidak mendefinisikannya sendiri. Pertanyaan berupa kotak membulat, bukan belah ketupat, supaya tidak terlihat teknis. Tombol Perbesar membuka dialog dengan zoom; tombol itu disembunyikan saat cetak.
- **Gagal tampil**: sintaks salah atau pustaka tak bisa dimuat (misalnya offline sebelum pernah dimuat) menampilkan pesan dan teks sumber, tidak pernah halaman kosong.
- **Yang tidak dilakukan**: gambar dari Canva (butuh penyimpanan gambar), tema gelap untuk diagram.

### 10. Langkah bergambar: konvensi blok berpagar, bukan sintaks baru

Keputusan pemilik (28 Okt 2026), setelah flowchart Mermaid dinilai terlalu rumit bagi pembaca awam dibanding lembar SOP Canva. Blok ```` ```langkah ```` dan ```` ```peringatan ```` adalah blok kode Markdown biasa, jadi tersimpan sebagai teks dan lolos editor (kasus di `editor-roundtrip.test.ts`), pencarian, riwayat. `parseSteps` dan `parseCallout` (`step-blocks.ts`, murni dan diuji) membaca isinya; `MarkdownContent` menggambarnya sebagai `StepCards` dan `CalloutBox` (komponen server, teks dipasang sebagai teks React, tanpa HTML mentah). Yang tidak terbaca (kosong, judul hilang, lebih dari 12 langkah) tidak pernah menghilang: ditampilkan sebagai blok kode. Tidak dipilih: sintaks khusus atau komponen MDX (merusak editor dan penyimpanan teks), dan gambar dari Canva (butuh penyimpanan gambar). Diagram Mermaid (keputusan 9) tetap untuk alur yang bercabang.

### 11. Riwayat chat AI: disimpan per pengguna, milik pribadi, dihapus setelah 90 hari

Keputusan pemilik (28 Okt 2026): riwayat hanya terlihat oleh pemiliknya (admin lain tidak), disimpan 90 hari, berbentuk daftar percakapan per pengguna dan per jenis AI. Migrasi `8_ai_conversations` (aditif): `ai_conversations` (`userId`, `assistant`, `title`, `documentId` opsional) dan `ai_messages` (`seq` unik per percakapan, `role`, `content`, `proposal`, `warnings`, `error`).

- **Privasi di setiap kueri**: semua fungsi di `src/lib/services/ai-conversations.ts` menerima id pemilik dan memasukkannya ke `where`; tidak ada jalur admin. Percakapan orang lain sama dengan yang tidak ada ("tidak ditemukan"), untuk baca, buka lanjut, ganti nama, dan hapus. Akses basis data langsung (pemilik proyek, Neon) tentu tetap bisa membacanya; riwayat tidak dienkripsi.
- **Server yang memegang riwayat**: browser hanya mengirim `conversationId` dan pesan baru. Server memuat riwayat dari basis data, menerapkan batas ukuran (30 giliran, 60.000 karakter; melebihi = "Mulai percakapan baru", tidak dipotong), menyimpan pertanyaan **sebelum** model dipanggil dan jawaban (termasuk yang terputus di tengah, dan galatnya) sesudahnya. Hanya usulan terbaru yang diulang utuh ke model.
- **Retensi**: `RETENTION_DAYS = 90` (`src/lib/ai/retention.ts`, dipakai juga oleh layar). Dihapus saat percakapan baru dibuat (paling sering sekali per jam per instance) dengan `deleteMany` pada `updatedAt` yang berindeks; tanpa cron. Pengguna yang dihapus membawa percakapannya (CASCADE); dokumen yang dihapus hanya mengosongkan `documentId` (SET NULL).
- **Per jenis AI**: kolom `assistant` dan `canUseAssistant` (`src/lib/ai/http.ts`) menentukan siapa boleh memakai tiap AI dan karenanya melihat riwayatnya, supaya "Tanya Knowledge Base" nanti memakai mesin yang sama.
- **Yang tidak dilakukan**: ekspor riwayat, pencarian di dalam riwayat, berbagi percakapan, dan pembersihan terjadwal (lihat `TODO.md`).

### 12. Pratinjau di editor: tampilan tambahan pada blok kode, skema tidak berubah

Blok `langkah`, `peringatan`, dan `mermaid` tetap blok kode berpagar di editor visual; `CodeBlockWithPreview` (`src/components/editor/code-block-preview.tsx`) adalah `CodeBlock` dengan *node view* React yang menambahkan tampilan baca-saja di bawah kode (`contentEditable={false}`), memakai komponen yang sama dengan halaman dokumen (`StepCards`, `CalloutBox`, `MermaidDiagram`). Karena skema dan cara baca-tulis Markdown tidak berubah, dokumen lama tetap lolos bolak-balik; ini dijaga tes yang membandingkan hasil serialisasi dengan dan tanpa node view untuk semua kasus di `editor-roundtrip.test.ts` ditambah blok kode bersarang (daftar, kutipan), pagar `~~~`, string info, dan blok kosong. Yang tidak dijalankan di tes adalah node view itu sendiri (butuh DOM); itu dicek di peramban. `createContentExtensions(codeBlock)` menerima blok kode dari luar (StarterKit dikonfigurasi `codeBlock: false`), sehingga tes memakai daftar ekstensi yang sama dengan peramban. Pratinjau diagram ditunda 400 ms setelah mengetik berhenti karena penggambaran Mermaid mahal. Contoh yang disisipkan (`src/lib/block-templates.ts`) diuji valid untuk kode yang menggambarnya. Mode Markdown mentah mendapat tombol Pratinjau yang menggambar seluruh dokumen dengan `MarkdownContent`. Ditolak: sintaks khusus atau MDX (merusak penyimpanan teks), dan panel pratinjau terpisah di sisi layar (tidak muat di HP).

### 13. Pulihkan versi adalah simpan biasa; beda versi dihitung saat dilihat

`restoreRevision` (`src/lib/services/revisions.ts`) membaca versi lewat `getRevision` (aturan akses yang sama dengan membaca riwayat) lalu memanggil `updateDocument`, jadi semua aturan simpan berlaku (akses koleksi, kunci revisi, versi baru hanya bila ada perubahan bermakna). Judul, ringkasan, jenis, dan isi diambil dari versi; **slug, koleksi, dan status tetap yang sekarang**, karena versi adalah versi teks, bukan versi lokasi atau status terbit. Tidak ada tabel atau kolom baru: pemulihan memperpanjang riwayat (batas 100 versi berlaku seperti biasa) dan tidak menulis ulang apa pun, sehingga dapat dibatalkan dengan memulihkan versi sebelumnya. Hanya EDITOR dan ADMIN. Beda versi (`src/lib/text-diff.ts`) dihitung di server saat halaman dibuka: bagian awal dan akhir yang sama dipangkas, sisanya memakai LCS per baris; di atas 4 juta sel (sekitar 2.000 x 2.000 baris yang berubah) isi ditampilkan sebagai diganti seluruhnya agar tidak menggantung. Teks hasil diff dipasang sebagai teks React (tanpa HTML mentah). Ditolak: menyimpan diff di database (tidak perlu, revisi sudah utuh) dan pustaka diff pihak ketiga (kebutuhan kecil).

Batas yang diketahui: `restoreRevision` membaca slug dan koleksi sekarang di luar kunci revisi; bila editor lain memindahkan dokumen dalam jendela sempit itu, pemulihan mengembalikannya (butuh akses ke koleksi lama). Layar tidak menawarkan pemulihan bila teksnya setara dengan dokumen sekarang (aturan yang sama dengan `hasMeaningfulChange`, sehingga "hanya penulisan Markdown yang berbeda" tidak dihitung perubahan).

### 14. Ekspor: zip buatan sendiri, ditulis per batch, hanya admin

`GET /api/admin/export[?koleksi=slug]` (`src/lib/export-handler.ts`) menulis zip langsung ke aliran: `exportBatch` mengambil 200 dokumen per putaran (urutan `id`, stabil walau dokumen diedit), `ZipWriter` (`src/lib/zip.ts`, deflate tanpa ZIP64, nama UTF-8, CRC32 buatan sendiri) memadatkan satu berkas per kali, dan direktori penutup ditulis di akhir; memori tidak bergantung pada jumlah dokumen (kecuali daftar manifest yang kecil). Alasan tanpa pustaka zip: kebutuhannya kecil, bisa diuji penuh (pembaca minimal di tes memeriksa ukuran dan CRC tiap entri, dan `unzip -t` memeriksa arsipnya), dan tidak menambah dependensi. Batas: 65.535 berkas dan 4 GB (di atas 60.000 dokumen diminta ekspor per koleksi). **Karena memuat draf dan dokumen terbatas**: ADMIN saja (diperiksa di handler dan di layanan), `Sec-Fetch-Site` lintas situs ditolak (tautan di situs lain tidak boleh memulai unduhan berat di peramban admin), pembatas laju 3 per 10 menit per instance, `Cache-Control: no-store`, dan `/api/admin/*` network-only di service worker. Berkas memakai format `content/drafts/` (kunci `title, slug, type, collection, excerpt` ditambah `status, restricted, created, updated, author, last_edited_by` sebagai catatan) sehingga pemuat draf membacanya kembali (`excerpt` kini boleh kosong; `scripts/import-drafts.ts` kini membaca sub-folder, jadi zip diekstrak ke folder di luar repositori dan dimasukkan dengan `--dir`, bukan disalin ke `content/drafts/` yang dijaga tes dan bisa ikut ter-commit). Diuji ad hoc pada 451 berkas hasil ekspor (semuanya terbaca). Pembatalan unduhan menghentikan pembacaan database, dan permintaan yang ditolak (koleksi tak ada, terlalu besar) tidak memakai jatah pembatas laju. Ditolak: sinkron terjadwal ke Git (butir 20, butuh token dan pekerjaan terpisah) dan enkripsi zip (kunci perlu dikelola; cukup peringatan di halaman).

### 15. Log pencarian tanpa hasil: kata saja, tanpa identitas, dengan batas

Halaman pencarian mencatat kueri yang menghasilkan nol dokumen (hanya tanpa filter koleksi atau jenis) lewat `recordSearchMiss`: `normalizeMissQuery` (`src/lib/search-miss.ts`) menormalkan (NFKC, huruf kecil, hanya huruf dan angka) dan menolak kueri berisi `@`, angka 6+ digit, kurang dari 2 atau lebih dari 100 karakter, atau lebih dari 8 kata, agar email, nomor telepon, dan kalimat tempelan tidak tersimpan. Tabel `search_misses` berkunci kata itu sendiri (`INSERT ... ON CONFLICT DO UPDATE count+1`), tidak ada kolom pengguna. `purgeSearchMisses` (paling sering sekali per jam per instance) menghapus yang lebih dari 180 hari dan yang melewati 2000 baris terbaru. Pencatatan gagal diam-diam supaya pencarian tidak pernah rusak karenanya. Halaman `/admin/pencarian` hanya EDITOR dan ADMIN. Kompromi: memuat ulang halaman hasil menaikkan hitungan (tanpa dedupe); hitungan adalah petunjuk, bukan statistik.

### 16. Salah ketik: saran judul dengan `pg_trgm`; sinonim: daftar di kode

Dua cara terpisah, keduanya tanpa mengubah pencarian utama. **Sinonim** diperluas di `buildTsQuery` (`(kasir:* | cashier)`) dari daftar statis `src/lib/search-synonyms.ts`, sehingga sorotan (`ts_headline` memakai query yang sama) dan peringkat ikut bekerja; daftar di kode dipilih daripada tabel agar tidak butuh layar admin dan mudah diuji. **Salah ketik** hanya dicari bila pencarian kosong: `suggestDocumentTitles` memakai `word_similarity` (operator `<%`, ambang 0,35 lewat `SET LOCAL` dalam transaksi) pada judul, dengan indeks GIN `gin_trgm_ops` (migrasi 11) dan `documentReadableSql` yang sama dengan pencarian. Hanya judul yang dibandingkan, bukan isi, agar indeks kecil dan hasil bisa dijelaskan. Ukur: pada 20.000 judul yang semuanya memuat kata yang sama, kueri pemindaian penuh 260 ms; kueri yang tidak mirip apa pun memakai indeks (0,2 ms). Karena hanya berjalan pada pencarian kosong, biaya ini jarang dibayar.

### 17. Tempat sampah: tabel terpisah berisi potret JSON, bukan kolom `deletedAt`

Hapus lunak lewat kolom `deletedAt` berarti setiap kueri yang membaca `documents` (pencarian, daftar, hitungan, ekspor, aturan akses, tautan terkait, riwayat) harus mengingat `deletedAt IS NULL`; satu kueri yang lupa membocorkan dokumen yang sudah dihapus, dan butir-butir roadmap berikutnya menambah kueri baru. Maka `trashDocument` (`src/lib/services/trash.ts`) menyalin dokumen beserta riwayat versi, anggota, dan tautannya menjadi satu potret JSON di `trashed_documents` dan menghapus barisnya dari `documents` dalam satu transaksi (dengan kunci `revision:<id>` yang sama dengan penyimpanan teks). Semua yang sudah ada tetap benar tanpa diubah. `restoreTrashedDocument` menulis potret kembali dengan id yang sama dalam satu transaksi; yang sudah tidak ada dilewati (pengguna dihapus menjadi "tidak dikenal", dokumen terkait yang hilang tidak ditautkan), slug yang terpakai diberi `-pulih`, koleksi yang hilang menolak pemulihan, dan baris sampah diklaim lebih dulu agar dua admin tidak memulihkan dua kali. Tabel tanpa kunci asing karena dokumen asalnya sudah tidak ada. Potret berversi (`v: 1`). Kompromi: potret memuat semua versi dokumen (bisa beberapa ratus KB); tautan percakapan AI ke dokumen tidak dipulihkan (favorit dan "terakhir dibuka" tidak punya kunci asing, jadi kembali sendiri); pembersihan 30 hari berjalan saat sampah dibuka atau diisi, bukan oleh penjadwal.

### 18. Dokumen bersarang: induk dan urutan di baris dokumen, aturan di satu layanan

`documents.parentId` (kunci asing ke dirinya sendiri, `ON DELETE SET NULL`) dan `position` (migrasi 13). Daftar bersaudara tidak disimpan terpisah: anak adalah `WHERE parentId = ?` berurut `position, title`. Aturan yang tidak bisa diungkapkan di basis data (induk di koleksi yang sama, tanpa siklus, kedalaman paling 4 tingkat termasuk tinggi subpohon yang dipindah) dijaga satu tempat, `setDocumentParent` (`src/lib/services/document-tree.ts`), di dalam transaksi dengan kunci penasihat global `document_tree` (dua pemindahan yang masing-masing sah bisa membuat siklus bila berjalan bersamaan; pohon ini kecil, jadi kunci global murah). Pembacaan menghormati akses seperti biasa: `getAncestors` berhenti di halaman pertama yang tidak boleh dilihat pembaca (judul bab terbatas tidak bocor lewat breadcrumb), `getChildren` hanya yang boleh dibaca. Daftar koleksi memakai `topLevelOnly`: tanpa induk, atau induk yang tidak terlihat dalam daftar itu, sehingga bab yang induknya draf atau terbatas tidak hilang dari semua orang. Mengubah induk atau urutan bukan penyuntingan isi (`updatedAt` ditulis kembali apa adanya, tanpa revisi). Kompromi: urutan memakai angka berurutan yang dinomori ulang saat naik/turun (bukan seret), pohon tidak ada di sidebar (sidebar dimuat di setiap halaman; pohon penuh di sana menambah kueri ke setiap permintaan), dan pencarian tetap datar.

### 19. Grup: aturan akses tetap di satu tempat, keanggotaan lewat tabel penghubung

Empat tabel (migrasi 14): `groups`, `group_members`, `collection_groups`, `document_groups`, semuanya berantai hapus. Seluruh pembacaan akses sudah lewat empat fungsi di `src/lib/collection-access.ts` (`collectionReadableWhere`, `documentReadableWhere`, `collectionReadableSql`, `documentReadableSql`), jadi grup cukup menambah satu cabang di tiap fungsi: "ada grup yang tercatat pada koleksi atau dokumen ini yang beranggotakan pembaca" (`EXISTS` pada SQL mentah, `groups: { some: { group: { members: { some } } } }` pada Prisma). Kueri lain (pencarian, daftar, hitungan, ekspor, favorit) tidak diubah dan tidak bisa lupa. Grup mengisi daftar anggota, bukan menggantikannya: dokumen terbatas di koleksi terbatas tetap butuh lolos di kedua daftar. Kunci cache offline (`accessKey`) membaca daftar koleksi dan dokumen tempat pengguna menjadi anggota; `getMemberCollectionIds` dan `getMemberDocumentIds` kini menyertakan yang lewat grup, dan perubahan anggota grup atau penghapusan grup menandai koleksi yang memakainya sebagai berubah (`updatedAt`), sama seperti perubahan anggota biasa. Kompromi: biaya satu `EXISTS` lagi per baris pada kueri pembaca non-admin (kedua indeks `groupId` dan kunci utama tabel penghubung menutupinya), dan form hanya memuat 100 grup pertama.

### 20. Mode langkah: membaca blok yang sudah ada, kemajuan hanya di perangkat

Tidak ada sintaks baru dan tidak ada tabel. `extractStepFlow` (`src/lib/step-mode.ts`, murni dan diuji) membaca Markdown yang sudah ada dan mengambil setiap blok berpagar ```` ```langkah ```` (lewat `parseSteps` yang sama dengan kartu langkah) dan ```` ```peringatan ````, berurutan, masing-masing langkah membawa judul bagian terdekat di atasnya; blok yang tidak terurai dilewati seperti di tampilan biasa, dan dokumen tanpa langkah tidak punya mode ini (halaman `/docs/<slug>/langkah` menjawab "tidak ditemukan", tombolnya tidak ditampilkan). Halaman membaca dokumen lewat `getDocumentBySlug`, jadi aturan akses dan draf persis sama dengan halaman dokumen, dan karena berada di bawah `/docs` ia ikut disimpan untuk dibaca offline tanpa perubahan pada service worker. Tanda selesai ada di `localStorage` perangkat (kunci `kb:steps:<id dokumen>:<sidik jari judul langkah>`), dibaca lewat `useSyncExternalStore` supaya render server dan klien sama (server tidak punya tanda) dan tanpa efek yang mengubah state. Sidik jari hanya dari judul, jadi mengubah kalimat keterangan tidak mengulang kemajuan tetapi mengganti atau menambah langkah mengulangnya. Kompromi: kemajuan tidak berpindah antar perangkat dan tidak bisa dilihat penyelia (sengaja: tidak ada data orang yang tersimpan); mode ini hanya mengenal blok `langkah` dan `peringatan`, bukan daftar bernomor biasa.

### 21. Masukan pembaca: satu tabel utas, halaman sendiri yang tidak di-cache, akses mengikuti dokumen

`document_comments` (migrasi 15): akar (`parentId` kosong) adalah masukan seorang pembaca dan sekaligus utasnya (terbuka atau `resolved`), balasan menunjuk akarnya (satu tingkat; cukup untuk percakapan penyunting dengan penulis, dan tidak butuh pohon). Aturan lihat satu tempat, `src/lib/services/comments.ts`: seseorang melihat sebuah akar bila ia penulisnya, atau penyunting/admin yang boleh membaca dokumennya (`documentReadableWhere`), jadi masukan pada dokumen terbatas tidak muncul di kotak masuk penyunting yang tidak boleh membacanya, dan yang lain mendapat "tidak ditemukan", bukan "dilarang". Pembaca hanya bisa menulis pada dokumen yang boleh dibacanya (draf dan arsip hanya untuk penyunting). Isi disimpan dan ditampilkan sebagai teks biasa (`whitespace-pre-wrap`, tanpa Markdown atau HTML), dibersihkan oleh `cleanCommentBody` (`src/lib/comment-text.ts`, murni dan diuji). Batas 10 masukan per jam per orang dihitung di dalam transaksi dengan kunci penasihat per pengguna agar kiriman serentak tidak melewatinya. Masukan ditaruh di halaman `/docs/<slug>/masukan` dan `/admin/masukan`, bukan di halaman dokumen: halaman dokumen disimpan service worker untuk dibaca offline, dan masukan seseorang tidak boleh ikut tersimpan di perangkat yang dipakai bergantian (`/docs/<slug>/masukan` masuk `isEditorRoute`, jadi selalu ke jaringan). Formulir adalah form biasa ke aksi server (jalan tanpa JavaScript); galat kembali lewat `?galat=` (dipotong 200 karakter, dirender sebagai teks). Dokumen yang dihapus membawa masukannya di potret sampah. Kompromi: tidak ada notifikasi (penyunting harus membuka kotak masuk; butir 31), tidak ada `@nama`, dan tidak ada komentar pada bagian tertentu dokumen.

### 22. Templat tersimpan: salinan teks, tidak terhubung ke dokumen sumber; kolom jenis berupa teks

`document_templates` (migrasi 16) menyimpan salinan isi dan jenis dokumen pada saat dijadikan templat, tanpa kunci ke dokumen sumber: mengubah atau menghapus sumbernya tidak mengubah templat, dan templat tidak membawa pembatasan akses apa pun, sehingga **semua penyunting membaca semua templat**. Karena itu `createTemplateFromDocument` hanya menerima dokumen yang terbuka untuk semua yang bisa masuk (bukan `restricted`, bukan di koleksi terbatas) dan menolak yang lain; tanpa pemeriksaan itu templat menjadi jalan membocorkan isi dokumen terbatas ke penyunting yang tidak boleh membacanya. Dokumen Baru membaca templat di server (`/docs/new?templat=<id>`) dan mengisi formulir lewat `defaultTemplate` (kunci draf lokal diberi akhiran id templat agar tidak bertabrakan dengan draf kosong). Kolom `type` memakai teks, bukan enum `DocumentType`: **Prisma menjalankan folder migrasi menurut urutan abjad ("16_" sebelum "2_")**, dan kolom bertipe enum itu membuat migrasi 2, yang membangun ulang enum, gagal pada basis data baru (ditemukan lewat `prisma migrate diff --shadow-database-url`, yang membuat basis data dari nol; basis data yang sudah berjalan tidak terpengaruh karena hanya migrasi yang belum diterapkan yang dijalankan). Aturan untuk migrasi 10 ke atas: tabel baru tidak boleh bergantung pada enum atau objek yang diubah migrasi 2 sampai 9. Migrasi 17 menambah `sourceDocumentId` (SET NULL; dokumen asal) supaya halaman Templat bisa menandai templat yang sumbernya kemudian dibatasi (tanpa menampilkan judul sumber yang dibatasi). Pembacaan dokumen sumber dan penyalinannya terjadi dalam satu transaksi dengan kunci baris (`FOR SHARE`), jadi dokumen tidak bisa dibatasi di antara pemeriksaan dan penyalinan. Kompromi: templat tidak diperbarui otomatis, tidak ada versi, dan aksi "perbarui templat dari dokumen" belum ada (buat ulang dan hapus yang lama).

### 23. Sematan: daftar penyedia tertutup, alamat dibangun ulang, kartu dulu baru bingkai, CSP hanya `frame-src`

Sematan menempatkan halaman perusahaan lain di dalam halaman kita, jadi tiga hal dijaga. (1) **Apa yang boleh**: `parseEmbed` (`src/lib/embed.ts`, murni dan diuji dengan tautan jahat) hanya menerima https, tanpa pengguna, kata sandi, atau port, dengan nama host persis milik empat penyedia (bukan akhiran: `youtube.com.evil.example` ditolak) dan id dengan bentuk yang benar; yang diteruskan ke `src` dan `href` adalah alamat yang **dibangun dari id itu**, bukan teks penulis, jadi parameter asing, `javascript:`, dan karakter yang bisa keluar dari atribut tidak bisa sampai ke halaman. (2) **Kapan dimuat**: `EmbedFrame` menampilkan kartu dulu; bingkai (`sandbox` tanpa `allow-top-navigation` atau `allow-forms`, `referrerPolicy` terbatas) dibuat hanya setelah pembaca menekan Tampilkan, sehingga membuka dokumen tidak mengirim apa pun ke penyedia (tanpa pelacakan, tanpa menunggu, dan offline tetap aman), dan YouTube memakai domain `youtube-nocookie`. (3) **Lapis kedua di peramban**: `next.config.ts` mengirim `Content-Security-Policy: frame-src 'self' <empat host> https://vercel.live` untuk semua rute; hanya direktif itu, jadi skrip, gaya, dan gambar tidak dibatasi dan tidak ada yang rusak oleh CSP; bila suatu hari CSP penuh ditambahkan, direktif ini harus ikut digabung (daftar host diambil dari `EMBED_FRAME_HOSTS`, satu sumber dengan parser). Sematan tersimpan sebagai blok berpagar biasa (`sematan`), jadi pencarian, riwayat, ekspor, dan editor memperlakukannya sebagai teks; blok yang tidak lolos tampil sebagai blok kode, seperti `langkah` yang tidak terurai. Kompromi: konten yang tampil mengikuti izin akun pembaca di penyedia (kami tidak bisa membuat dokumen Canva pribadi menjadi terbuka dan tidak mencoba), rasio bingkai tetap (16:9; Figma 16:10) sehingga desain berbentuk lain tampil dengan pita, dan Loom, Miro, atau penyedia lain butuh menambah parser dan host (satu fungsi dan satu entri daftar).

### 24. Persetujuan dan kunci: aturan tulis di satu fungsi, permintaan sebagai baris, dokumen hidup tidak disentuh

Dua kolom boolean (`collections.requiresApproval`, `documents.locked`) dan tabel `document_reviews` (migrasi 18; enum `ReviewKind` dan `ReviewStatus` miliknya sendiri, tanpa bergantung pada enum buatan migrasi 2 sampai 9 karena urutan abjad). Aturannya ada di **satu fungsi**, `assertMayWrite` di `documents.ts`, yang dipanggil `createDocument`, `updateDocument`, dan `setDocumentStatus`: admin tidak pernah ditahan; dokumen terkunci hanya untuk admin; di koleksi yang butuh persetujuan penyunting tidak boleh membuat status akhir menjadi `PUBLISHED` (menerbitkan draf, mengubah yang terbit, memindahkan yang terbit masuk), sedangkan membuatnya kurang terbuka (draf, arsip) selalu boleh. Karena aturan ada di lapisan layanan, jalan lain (pulihkan versi, aksi server yang dipanggil langsung) ikut terjaga tanpa diingat satu per satu; `reviews.ts` melewatinya hanya lewat opsi `approved` yang tidak bisa diisi dari formulir. Alur: `submitPublish` dan `submitChange` membuat baris `PENDING` (satu per dokumen, diperiksa di bawah kunci penasihat `review:<id>`; permintaan perubahan dari orang yang sama menggantikan yang lama, dan usulan memuat judul, ringkasan, jenis, dan isi saja, bukan slug, koleksi, atau status); dokumen yang tampil **tidak disentuh** sampai `approveReview`, yang lebih dulu mengklaim baris (`updateMany ... WHERE status = PENDING`, jadi dua admin tidak menerapkannya dua kali) lalu menerapkannya lewat `setDocumentStatus` atau `updateDocument` sebagai admin, dan mengembalikan baris ke `PENDING` bila penerapan gagal. Penerapan atas nama admin berarti riwayat versi mencatat admin sebagai penyunting; pengaju dan catatannya tetap ada pada baris permintaan. Mengunci memakai SQL langsung (`UPDATE documents SET locked`), jadi `updatedAt`, yang berarti "isinya berubah", tidak bergeser. Halaman `/docs/<slug>/tinjau` masuk `isEditorRoute` (tanpa cache offline). Kompromi: satu tingkat (admin); bertingkat seperti Project Leader lalu Project Controller dan penyetuju per grup butuh model penyetuju (lihat TODO); tanpa notifikasi (kotak masuk harus dibuka, butir 31); permintaan yang menunggu hilang bila dokumennya dihapus.
