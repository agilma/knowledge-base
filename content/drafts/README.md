# Draf dokumen

Dokumen yang disiapkan sebagai berkas markdown, lalu dimasukkan ke database sebagai **draf** dengan satu perintah:

```bash
DATABASE_URL=postgresql://... npm run docs:import            # penulis = admin pertama
DATABASE_URL=postgresql://... npm run docs:import -- --as admin@contoh.com
```

- Hanya membuat dokumen yang slug-nya belum ada. Tidak pernah menimpa, jadi aman diulang dan aman setelah dokumen disunting di aplikasi.
- Selalu berstatus **DRAFT**: hanya editor dan admin yang melihatnya sampai ada yang menekan Publish.
- Satu berkas = satu dokumen. Nama berkas harus sama dengan `slug`. Bidang wajib di bagian atas: `title`, `slug`, `type` (PANDUAN, MASALAH, atau REFERENSI), `collection` (slug koleksi yang sudah ada), `excerpt`.
- Setiap berkas harus punya bagian **Sumber** (nomor baris tiket) dan **Perlu dikonfirmasi** atau **Perlu dilengkapi**, tanpa email, tautan, atau nama orang. Itu diperiksa otomatis oleh `src/lib/draft-import.test.ts`, yang juga memastikan isinya terbuka di editor visual.

## Sumber enam draf pertama (25 Okt 2026)

Dari log tiket CS "TOOLS THUNDER CSI" (tab Sheet2, 129 tiket). Pemilik mengonfirmasi dua hal yang dipakai di draf:
persetujuan selisih Purchase Invoice oleh Area Manager (role manager operasional), dan permission brand ditambahkan oleh HRD, atau user mendaftar sendiri lewat aplikasi BA lalu disetujui HR.
Topik lain dari log yang belum dibuat ada di `TODO.md`.
