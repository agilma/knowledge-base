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
- **DocumentRelation**: relasi antar dokumen untuk "Pengetahuan Terkait".
- **Favorite**, **RecentView**: per pengguna. Tabelnya ada, belum dipakai.

Hanya dokumen `PUBLISHED` terlihat oleh VIEWER. Draf dan arsip hanya untuk EDITOR dan ADMIN.

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
