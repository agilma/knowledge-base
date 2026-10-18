# Thunderlab Knowledge Base — Project Context

Dokumen ini adalah konteks project untuk AI agent (Claude, ChatGPT, Jules, dll). Baca dokumen ini bersama `thinking.md`, `coding-principles.md`, `architecture-principles.md`, dan `ui-ux-principles.md` sebelum mengerjakan task apa pun.

Untuk kondisi terkini project, baca `project-status.md`.

---

## 1. Tujuan Produk

Knowledge Base internal Thunderlab untuk menyimpan problem, solusi, dan konteks project agar bisa dicari dan dibaca ulang oleh tim.

Latar belakang: owner project terbiasa menulis di Obsidian dan menyukai tampilan Outline, tetapi sinkronisasi Obsidian lintas-device (HP Android ↔ laptop) tanpa layanan berbayar sulit dilakukan. Web app ini dibuat agar knowledge bisa diakses dari device mana pun, termasuk offline, tanpa bergantung pada sinkronisasi file manual.

Alur utama pengguna: **Search → Read → Related Knowledge**.

---

## 2. Keputusan Arsitektur (sudah diputuskan)

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Sumber kebenaran data | PostgreSQL (Neon) via Prisma | Bisa diakses lintas-device, mendukung relasi, search, dan role |
| Markdown / Obsidian | Obsidian hanya sebagai **cermin ekspor**, bukan sumber data. Opsional, tahap akhir | Push/pull Git dari HP tidak praktis |
| Hosting | Vercel | Deploy otomatis dari GitHub |
| Offline | **Tahap 1: offline-baca** (PWA + cache halaman yang pernah dibuka). Offline-tulis + sinkron **belum** masuk scope | Offline-tulis butuh IndexedDB, antrian sinkron, dan resolusi konflik; dikerjakan setelah fitur dasar stabil |
| Editor konten | Markdown disimpan di DB; editor web rich-text rasa markdown (kandidat: Tiptap / MDXEditor). Belum dipilih final | Pengguna tidak perlu hafal sintaks markdown; output tetap markdown bersih |
| Bahasa UI | Indonesia | Pengguna internal |
| Mode tampilan | Light mode utama; dark mode sudah ada di prototype | — |

Jangan mengubah keputusan di atas tanpa persetujuan eksplisit dari owner project.

---

## 3. Stack Aktual (terverifikasi dari kode)

Sumber: branch PR #5 (`feature/thunderlab-kb-prototype-...-7145903340380807370`), diperiksa 2026-10-18.

- Next.js 16.3.5 (App Router), React 19.2.8, TypeScript 5
- Tailwind CSS 4, shadcn/ui, lucide-react, next-themes
- Prisma 5.22.0, PostgreSQL (target: Neon)
- Font: Inter + JetBrains Mono via `next/font/google`

Catatan: `AGENTS.md` dan `CLAUDE.md` di repo adalah file auto-generated Next.js. Ikuti peringatannya (baca `node_modules/next/dist/docs/` sebelum menulis kode Next.js), tetapi konteks project yang sebenarnya ada di folder `_AI_CONTEXT/` ini.

---

## 4. Model Data

Didefinisikan di `prisma/schema.prisma`.

- **User** — `id`, `email` (unique), `name`, `role` (`VIEWER` | `EDITOR` | `ADMIN`, default `VIEWER`)
- **Project** — `slug` (unique), `name`, `description`, `status` (`ACTIVE` | `MAINTENANCE` | `ARCHIVED`)
- **Problem** — `slug` (unique), `title`, `description`, `content`, `status` (`DRAFT` | `PUBLISHED` | `ARCHIVED`), `authorId`, `projectId` (opsional)
- **Solution** — `slug` (unique), `title`, `content`, `status` (`DRAFT` | `PUBLISHED` | `ARCHIVED`), `problemId`, `authorId`
- **Favorite** — `userId` + `entityType` + `entityId` (unique)
- **RecentView** — `userId`, `entityType`, `entityId`, `viewedAt`

Relasi saat ini: Problem → Solution (one-to-many), Problem → Project (opsional, many-to-one).

**Pertanyaan terbuka:** rencana awal menyebut relasi Solution ↔ Project secara langsung. Di schema saat ini Solution hanya terhubung ke Project lewat Problem. Perlu konfirmasi owner sebelum mengubah schema.

---

## 5. Aturan Khusus Project

- **Hapus `src/lib/mockData.ts` dari jalur produksi** begitu service Prisma tersedia. Tidak boleh ada data palsu di production.
- Semua akses data lewat lapisan service (`src/lib/services/` atau pola yang disepakati), bukan query Prisma langsung di komponen halaman.
- Slug harus unik dan stabil; jangan mengubah slug yang sudah PUBLISHED tanpa redirect.
- Hanya konten `PUBLISHED` yang tampil ke VIEWER. `DRAFT` hanya terlihat oleh penulis/EDITOR/ADMIN.
- Migrasi Prisma: jangan menulis ulang migrasi yang sudah ada. Buat migrasi baru untuk setiap perubahan schema.
- Jangan menambah dependency tanpa alasan yang jelas di PR description.
- Ikuti `ui-ux-principles.md`: minimalis, whitespace, tidak banyak card/border, referensi Outline.
- UI dalam bahasa Indonesia.

---

## 6. Alur Kerja Agent

1. Baca `_AI_CONTEXT/` (semua file) dan `project-status.md`.
2. Periksa branch, commit, dan PR terkini di GitHub — jangan anggap `project-status.md` selalu mutakhir.
3. Buat plan sebelum implementasi untuk task yang substansial.
4. Kerjakan dalam scope task; jangan memperluas scope.
5. Validasi dengan `npm run lint`, `npx tsc --noEmit`, dan `npm run build`. Laporkan hasil yang **benar-benar dijalankan**.
6. Laporkan: file yang berubah, perintah yang dijalankan beserta hasilnya, masalah yang belum selesai, dan detail commit/PR.
7. Perbarui `project-status.md` di PR yang sama jika task mengubah status project.

---

## 7. Urutan Implementasi yang Disepakati

1. Konteks project di `_AI_CONTEXT/` + rapikan metadata repo (package name, README)
2. Deploy ke Vercel + koneksi Neon, pastikan build jalan
3. Lapisan service Prisma + seed data awal, ganti semua pemakaian `mockData`
4. Autentikasi sungguhan + RBAC (VIEWER / EDITOR / ADMIN)
5. CRUD Problem / Solution / Project + editor markdown
6. Search (PostgreSQL full-text)
7. Favorit & Recent persisten
8. PWA + offline-baca
9. Polish, testing, verifikasi Vercel
10. (Opsional) Ekspor markdown untuk Obsidian
