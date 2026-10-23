# Dokumentasi

Dokumen di folder ini menjelaskan apa yang sudah ada, bagaimana ia disusun, dan
bagaimana memakainya. Semuanya ditulis dalam bahasa Indonesia.

| Dokumen | Untuk siapa | Isi |
| --- | --- | --- |
| [FEATURES.md](./FEATURES.md) | Semua orang | Katalog fitur: yang sudah jalan, yang direncanakan, dan di mana kodenya |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Pengembang | Model data, alur, infrastruktur, dan keputusan arsitektur (ADR) |
| [USER-GUIDE.md](./USER-GUIDE.md) | Pengguna (tim, CS) | Cara mencari, membaca, menulis, dan memakai offline |

Backlog pekerjaan ada di [`../TODO.md`](../TODO.md). Konteks untuk agen AI ada di
[`../_AI_CONTEXT/`](../_AI_CONTEXT/).

## Aturan

**Setiap fitur yang ditambah atau diubah harus tercatat di `FEATURES.md` dalam
PR yang sama.** Cukup satu baris: nama, status, lokasi kode, dan PR. Template PR
(`.github/pull_request_template.md`) menagih ini.

Ikuti juga:

- Keputusan yang menambah infrastruktur atau mengubah model data dicatat di
  `ARCHITECTURE.md` bagian *Keputusan*, lengkap dengan alasan dan alternatif yang ditolak.
- Perubahan yang terlihat oleh pengguna dicatat di `USER-GUIDE.md`.
- Jangan menulis klaim yang belum diverifikasi sebagai "selesai". Pakai status
  *direncanakan* atau *berjalan sebagian* dan jelaskan sisanya.
