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

- **Status:** diusulkan.
- **Konteks:** `ILIKE '%kata%'` tidak bisa memakai index (lihat `TODO.md`).
- **Keputusan:** kolom `tsvector` dengan index GIN, didukung Neon. Tidak perlu mesin pencari terpisah pada skala ini.
