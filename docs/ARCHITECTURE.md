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
- **Kenapa ekspresi, bukan kolom `tsvector`:** menambah kolom (generated atau lewat trigger) menulis ulang atau memperbarui seluruh tabel `documents` dan mengunci tabel itu selama migrasi, padahal build Vercel menjalankan migrasi di setiap PR dan database Preview mungkin sama dengan production. `CREATE INDEX CONCURRENTLY` hanya menambah index tanpa menghalangi tulis. Harganya: ekspresi harus identik di migrasi dan di query (dijaga test `search-query.test.ts`), dan `ts_rank` menghitung ulang vektor untuk baris yang cocok. Diukur: kata yang cocok di *semua* 30 ribu dokumen butuh sekitar 7 detik; pada skala ratusan sampai ribuan dokumen tidak terasa. Bila suatu hari terasa, jalur lanjutannya kolom `tsvector` tersimpan, dibuat dengan migrasi terjadwal tersendiri.
- **Batas:** isi dipotong 200 000 karakter dalam index (`left(content, 200000)`) karena satu `tsvector` tidak boleh lebih dari 1 MB; tanpa itu menyimpan dokumen raksasa gagal. Hasil dibatasi 50 teratas. Pencocokan memakai kata utuh atau awalan kata (tiga huruf ke atas), bukan potongan di tengah kata seperti `ILIKE` dulu.
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

`POST /api/ai/document-assistant` (SSE) memanggil Claude (`claude-opus-5-5`, `@anthropic-ai/sdk`) untuk membantu admin menyusun dokumen di form. Tanpa migrasi; riwayat chat hanya ada di peramban.

- **AI tidak punya jalur tulis.** Alatnya `list_collections`, `search_documents`, `read_document` (baca-saja, memakai viewer admin) dan `propose_document`, yang **tidak dijalankan server**: usulan diteruskan ke klien sebagai kejadian SSE dan giliran berhenti. Admin menerapkannya ke form dan menyimpan lewat aksi yang sudah ada (validasi, revisi, aturan akses tetap berlaku). Karena itu injeksi prompt lewat bahan yang ditempel atau dokumen yang dibaca paling jauh menghasilkan teks usulan, yang dibaca admin; pemindai `src/lib/ai/sensitive.ts` menandai email, tautan, nomor panjang, kata kredensial, dan nama orang.
- **Otorisasi di server** (`src/lib/ai/handler.ts`): sesi wajib dan `role === ADMIN` (prop `aiEnabled` di form hanya menyembunyikan tombol). `Origin` harus sama dengan host dan `Content-Type` JSON (cegah CSRF, karena tiap permintaan berbiaya). Batas ukuran **menolak** dengan pesan, tidak memotong. Pembatas laju di memori per admin (`rate-limit.ts`; per instance serverless, jadi rem kasar; batas pengeluaran di akun Anthropic yang menjadi batas keras). Isi percakapan tidak dicatat; galat penyedia diganti kalimat tetap.
- **Pengaturan model** (`src/lib/ai/assistant.ts`): thinking bawaan model (tidak bisa dimatikan), `output_config.effort: "medium"` eksplisit, tanpa `tool_choice` paksa (ditolak 400 oleh model ini; prompt yang mengarahkan), `max_tokens` 32.000 dengan streaming, fallback server-side (`server-side-fallback-2026-07-01`), `stop_reason` `refusal` dan `max_tokens` ditangani sebelum alat dijalankan, giliran asisten dikembalikan utuh (blok thinking ikut) dalam putaran alat, maksimal 6 putaran. Prompt sistem beku (dengan `cache_control`); daftar koleksi dan isi form masuk di giliran pengguna agar prefiks cache tidak berubah.
- Service worker: POST tidak pernah di-cache (`isNetworkOnlyRequest`), dan ada tes yang mengunci `/api/ai/*`.
- **Yang tidak dilakukan**: menyimpan riwayat chat, memberi AI hak tulis, memakai AI untuk editor non-admin, lampiran berkas ke chat. Lihat `TODO.md`.

### 8. Bagikan = tautan internal, PDF = cetak browser

Keputusan pemilik (28 Okt 2026). **Bagikan** hanya memberi tautan biasa ke `/docs/<slug>`: penerima tetap melewati login dan `getDocumentBySlug(viewer)`, sehingga aturan koleksi dan dokumen terbatas tidak bisa dilewati lewat berbagi. **PDF** adalah `window.print()` terhadap halaman yang sama dengan `@media print` (cangkang aplikasi yang tingginya tetap diratakan agar mengalir ke banyak lembar; token terang dipasang kembali di `@media print` sehingga mencetak dari tema gelap tetap terbaca, termasuk lewat Ctrl+P atau menu bagikan iOS; blok kode dibungkus dan tabel dipaksa selebar halaman). Tidak dipilih: tautan publik berbunyi rahasia (butuh tabel dan migrasi, menembus aturan akses, risiko bocor) dan PDF dari server (Chromium headless di Vercel berat dan rawan gagal). Tidak ada perubahan pada proxy atau service worker.

### 9. Diagram alur memakai Mermaid, tersimpan sebagai teks Markdown

Keputusan pemilik (28 Okt 2026). Diagram adalah blok berpagar ```` ```mermaid ```` di dalam isi dokumen, jadi tetap teks: ikut pencarian, riwayat revisi, ekspor, dan lolos bolak-balik editor (ada kasusnya di `editor-roundtrip.test.ts`). Penggambarnya `MermaidDiagram` (komponen klien) yang dipakai `MarkdownContent` untuk blok `language-mermaid`; blok kode lain tidak berubah.

- **Keamanan**: teks dokumen adalah data. `securityLevel: "strict"` menghapus skrip dan penangan event, tetapi **tidak** menghapus gambar, tautan, dan CSS `url()` (terbukti: gambar di label ikut diminta peramban). Karena itu `unsafeDiagramReason` menolak sebelum digambar: direktif `%%{...}%%`, frontmatter `---`, karakter `\` (CSS bisa mengeja `url(` sebagai `\75rl(`), baris `click`, `url(`, dan tag HTML selain `<br>`; yang ditolak tampil sebagai pesan dan teks sumber. Pengaturan `securityLevel` sendiri tidak bisa ditimpa direktif (mermaid menghapus kunci aman).
- **Beban**: `mermaid` diimpor dinamis hanya saat ada diagram, dan gambar dibuat satu per satu (mermaid menyimpan status global). Halaman tanpa diagram tidak memuatnya saat dibuka; tetapi service worker men-precache semua potongan `_next/static`, termasuk potongan mermaid (sekitar 3 MB mentah) yang diunduh saat service worker dipasang.
- **Tampilan** (`mermaid-style.ts`): kartu putih tetap, karena diagram menggambar teks gelap. Tema `base` kustom: kartu membulat, bayangan tipis, warna lembut, label jawaban berbentuk pil; kelas `start`, `decision`, `stop`, `done` ditambahkan otomatis ke flowchart yang tidak mendefinisikannya sendiri. Pertanyaan berupa kotak membulat, bukan belah ketupat, supaya tidak terlihat teknis. Tombol Perbesar membuka dialog dengan zoom; tombol itu disembunyikan saat cetak.
- **Gagal tampil**: sintaks salah atau pustaka tak bisa dimuat (misalnya offline sebelum pernah dimuat) menampilkan pesan dan teks sumber, tidak pernah halaman kosong.
- **Yang tidak dilakukan**: pratinjau di editor, gambar dari Canva (butuh penyimpanan gambar), tema gelap untuk diagram.

### 10. Langkah bergambar: konvensi blok berpagar, bukan sintaks baru

Keputusan pemilik (28 Okt 2026), setelah flowchart Mermaid dinilai terlalu rumit bagi pembaca awam dibanding lembar SOP Canva. Blok ```` ```langkah ```` dan ```` ```peringatan ```` adalah blok kode Markdown biasa, jadi tersimpan sebagai teks dan lolos editor (kasus di `editor-roundtrip.test.ts`), pencarian, riwayat. `parseSteps` dan `parseCallout` (`step-blocks.ts`, murni dan diuji) membaca isinya; `MarkdownContent` menggambarnya sebagai `StepCards` dan `CalloutBox` (komponen server, teks dipasang sebagai teks React, tanpa HTML mentah). Yang tidak terbaca (kosong, judul hilang, lebih dari 12 langkah) tidak pernah menghilang: ditampilkan sebagai blok kode. Tidak dipilih: sintaks khusus atau komponen MDX (merusak editor dan penyimpanan teks), dan gambar dari Canva (butuh penyimpanan gambar). Diagram Mermaid (keputusan 9) tetap untuk alur yang bercabang.
