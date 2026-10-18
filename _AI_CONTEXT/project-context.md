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

- Next.js 16.3.5 (App Router), React 19.2.8, TypeScript 5
- Tailwind CSS 4, shadcn/ui, lucide-react, next-themes
- Prisma 5.22.0, PostgreSQL (target: Neon)
- Font: Inter + JetBrains Mono via `next/font/google`

Catatan: `AGENTS.md` dan `CLAUDE.md` di repo adalah file auto-generated Next.js. Ikuti peringatannya (baca `node_modules/next/dist/docs/` sebelum menulis kode Next.js), tetapi konteks project yang sebenarnya ada di folder `_AI_CONTEXT/` ini.

---

## 4. Model Data

Didefinisikan di `prisma/schema.prisma` (Model Collection → Document):

- **User** — `id`, `email` (unique), `name`, `role` (`VIEWER` | `EDITOR` | `ADMIN`, default `VIEWER`)
- **Collection** — `id`, `slug` (unique), `name`, `description`, `icon`, `status` (`ACTIVE` | `ARCHIVED`, default `ACTIVE`)
- **Document** — `id`, `slug` (unique), `title`, `excerpt`, `content` (markdown), `type` (`PANDUAN` | `MASALAH` | `SOLUSI` | `REFERENSI`, default `PANDUAN`), `status` (`DRAFT` | `PUBLISHED` | `ARCHIVED`, default `DRAFT`), `collectionId` (relasi wajib ke Collection, `onDelete: Restrict`), `authorId` (opsional, relasi ke User, `onDelete: SetNull`)
- **DocumentRelation** — relasi many-to-many antar Document untuk "Related Knowledge" (`fromId`, `toId`, `createdAt`, `onDelete: Cascade`)
- **Favorite** — `userId` + `entityType` + `entityId` (unique)
- **RecentView** — `userId`, `entityType`, `entityId`, `viewedAt`

Aturan relasi & visualisasi:
- Konten disimpan sebagai satu markdown di `Document.content`; struktur section diturunkan dari heading markdown pada task UI.
- Hanya dokumen berstatus `PUBLISHED` yang ditampilkan kepada VIEWER secara default.

---

## 5. Aturan Khusus Project

- **Hapus `src/lib/mockData.ts` dari jalur produksi** begitu service Prisma dipakai oleh komponen UI. Tidak boleh ada data palsu di production.
- Semua akses data lewat lapisan service (`src/lib/services/`), bukan query Prisma langsung di komponen halaman.
- Slug harus unik dan stabil; jangan mengubah slug yang sudah PUBLISHED tanpa redirect.
- Hanya konten `PUBLISHED` yang tampil ke VIEWER. `DRAFT` hanya terlihat oleh penulis/EDITOR/ADMIN.
- Migrasi Prisma: `0_init` diselaraskan untuk schema Collection/Document.
- Jangan menambah dependency tanpa alasan yang jelas di PR description.
- Ikuti `ui-ux-principles.md`: minimalis, whitespace, tidak banyak card/border, referensi Outline.
- UI dalam bahasa Indonesia.

---

## 6. Alur Kerja Agent

1. Baca `_AI_CONTEXT/` (semua file) dan `project-status.md`.
2. Periksa branch, commit, dan PR terkini di GitHub — jangan anggap `project-status.md` selalu mutakhir.
3. Buat plan sebelum implementasi untuk task yang substansial.
4. Kerjakan dalam scope task; jangan memperluas scope.
5. Validasi dengan `npm run lint`, `npx tsc --noEmit`, dan `npx next build`. Laporkan hasil yang **benar-benar dijalankan**.
6. Laporkan: file yang berubah, perintah yang dijalankan beserta hasilnya, masalah yang belum selesai, dan detail commit/PR.
7. Perbarui `project-status.md` di PR yang sama jika task mengubah status project.

---

## 7. Urutan Implementasi yang Disepakati

1. Konteks project di `_AI_CONTEXT/` + rapikan metadata repo (package name, README)
2. Align Prisma Schema (Collection → Document), Service layer, Idempotent Seed, dan build di Vercel
3. Hubungkan halaman UI dengan `src/lib/services` menggantikan `mockData`
4. Autentikasi sungguhan + RBAC (VIEWER / EDITOR / ADMIN)
5. CRUD Document / Collection + editor markdown
6. Search (PostgreSQL full-text)
7. Favorit & Recent persisten
8. PWA + offline-baca
9. Polish, testing, verifikasi Vercel
10. (Opsional) Ekspor markdown untuk Obsidian
