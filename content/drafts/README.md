# Draf dokumen

Dokumen yang disiapkan sebagai berkas markdown, lalu dimasukkan ke database sebagai **draf** dengan satu perintah:

```bash
DATABASE_URL=postgresql://... npm run docs:import            # penulis = admin pertama
DATABASE_URL=postgresql://... npm run docs:import -- --as admin@contoh.com   # admin atau editor
```

- Hanya membuat dokumen yang slug-nya belum ada. Tidak pernah menimpa, jadi aman diulang dan aman setelah dokumen disunting di aplikasi.
- Selalu berstatus **DRAFT**: hanya editor dan admin yang melihatnya sampai ada yang menekan Publish.
- Satu berkas = satu dokumen. Nama berkas harus sama dengan `slug`. Bidang wajib di bagian atas: `title`, `slug`, `type` (PANDUAN, MASALAH, atau REFERENSI), `collection` (slug koleksi yang sudah ada). `excerpt` (ringkasan) boleh kosong. Impor dari folder lain (termasuk hasil ekstrak zip ekspor, yang berisi sub-folder): `npm run docs:import -- --dir <folder>`. Baris lain di bagian atas (`status`, `restricted`, `created`, `updated`, `author`, `last_edited_by`, dari ekspor) diabaikan saat impor.
- Setiap berkas harus punya bagian **Sumber** (nomor baris tiket, atau nama dokumen tim bila ditulis dari dokumen) dan **Perlu dikonfirmasi** atau **Perlu dilengkapi**, tanpa email, tautan, atau nama orang. Itu diperiksa otomatis oleh `src/lib/draft-import.test.ts`, yang juga memastikan isinya terbuka di editor visual.

## Sumber enam draf pertama (25 Okt 2026)

Dari log tiket CS "TOOLS THUNDER CSI" (tab Sheet2, 129 tiket). Pemilik mengonfirmasi dua hal yang dipakai di draf:
persetujuan selisih Purchase Invoice oleh Area Manager (role manager operasional), dan permission brand ditambahkan oleh HRD, atau user mendaftar sendiri lewat aplikasi BA lalu disetujui HR.
Topik lain dari log yang belum dibuat ada di `TODO.md`.

## Draf ketujuh (27 Okt 2026)

`panduan-training-pos-ungu-dan-mode-offline`: disalin dari Google Doc materi training kasir milik tim (bukan log tiket), dengan nomor bagian yang ganda dirapikan dan contoh nama customer diganti.
Tumpang tindih dengan `mode-offline-pos` dan dokumen terbit `pos-gagal-closing`; lihat `TODO.md`.

Penulis yang tercatat di riwayat adalah pengguna yang disebut `--as` (admin atau editor; orangnya harus sudah pernah masuk). Untuk dokumen yang aslinya ditulis orang lain,
mis. materi training POS ungu dari Lala, jalankan: `npm run docs:import -- --as lalaagnesta@gmail.com`. Penulis tidak ditulis di isi dokumen.

## Draf kedelapan sampai keempat belas (27 Okt 2026)

Dari dua sheet log isu, ditulis dari baris sumbernya (dibaca ulang langsung dari sheet) dan ditandai "Perlu dikonfirmasi" untuk yang tidak jelas:

- Koleksi `bintang-berkat` (log isu go-live ERPNext, 2023 sampai 2026): `surat-jalan-gagal-submit-stok-kurang`, `koreksi-penerimaan-barang-yang-salah`, `revisi-atau-cancel-sales-order-yang-sudah-submit`, `invoice-tidak-masuk-pos-closing-entry`.
- Koleksi `smpn-13-malang` (log isu ujian berbasis komputer): `alur-pengaturan-ujian-v2`, `login-siswa-dan-batas-satu-perangkat`, `soal-tidak-muncul-karena-salah-format-input`.

Dua sheet itu ditulis Lala, jadi impor dengan `--as lalaagnesta@gmail.com`. Kata sandi akun pengawas yang terlihat di sheet ujian tidak disalin.

## Draf kelima belas sampai kedua puluh satu (27 Okt 2026)

Dari tab LIVE (PROBLEM & SOP) di sheet "List Fitur Tambahan Murni" (koleksi `murni-erp`): `pos-lambat-hang-atau-tidak-bisa-diklik`, `pos-tidak-bisa-login-no-app-atau-layar-logout`, `pos-diblokir-smart-app-control-windows`, `sales-invoice-item-entered-multiple-times`, `harga-nol-atau-tidak-muncul-di-pos`, `laporan-sell-out-dan-sell-in`, `barang-gratis-di-pembelian-dan-penjualan`.
Kata sandi atau kunci bawaan aplikasi HR yang tertulis di sheet itu, email, dan nama pelapor tidak disalin. Banyak solusi POS bergantung versi (1.8.x, 2.0.0, 2.1); dokumen menyebut versinya bila log menyebutnya.

## Draf kedua puluh dua sampai dua puluh tujuh (27 Okt 2026)

Dari desain Canva "6 SOP THUNDERLAB" (koleksi `thunderlab`): `sop-01-workflow-produksi`, `sop-02-cs-operational`, `sop-03-proposal-maksimal-4-jam`, `sop-04-project-visibility`, `sop-05-eskalasi-isu-lama`, `sop-06-akses-di-luar-scope`.
SOP 01 memakai halaman yang berlaku sejak 21 Okt 2026 (enam langkah, Tim QA); versi lain di desain dicatat di bagian "Perlu dikonfirmasi". SOP 05 hanya Eskalasi Isu Lama (halaman 7); halaman Closure Issue Berulang tidak dimasukkan atas keputusan pemilik. Nama orang di desain diganti peran dan tautan Canva tidak disalin.
