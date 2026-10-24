# Knowledge Base — Project Context

Dokumen ini adalah konteks project untuk AI agent (Claude, ChatGPT, Jules, dll). Baca dokumen ini bersama `thinking.md`, `coding-principles.md`, `architecture-principles.md`, dan `ui-ux-principles.md` sebelum mengerjakan task apa pun.

Untuk kondisi terkini project, baca `project-status.md`. Katalog fitur dan arsitektur ada di `docs/`.

---

## 1. Tujuan Produk

Knowledge Base untuk menyimpan problem, solusi, dan konteks project agar bisa dicari dan dibaca ulang oleh tim.

Latar belakang: owner project terbiasa menulis di Obsidian dan menyukai tampilan Outline, tetapi sinkronisasi Obsidian lintas-device (HP Android ↔ laptop) tanpa layanan berbayar sulit dilakukan. Web app ini dibuat agar knowledge bisa diakses dari device mana pun, termasuk offline, tanpa bergantung pada sinkronisasi file manual.

Alur utama pengguna: **Search → Read → Related Knowledge**.

---

## 2. Keputusan Arsitektur (sudah diputuskan)

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Sumber kebenaran data | PostgreSQL (Neon) via Prisma | Bisa diakses lintas-device, mendukung relasi, search, dan role |
| Markdown / Obsidian | Obsidian hanya sebagai **cermin ekspor**, bukan sumber data. Opsional, tahap akhir | Push/pull Git dari HP tidak practical |
| Hosting | Vercel | Deploy otomatis dari GitHub |
| Offline | **Tahap 1: offline-baca** (PWA Serwist + cache halaman yang pernah dibuka). Penulisan offline disokong via **Draf Lokal (localStorage)**. Antrian sinkron otomatis **belum** masuk scope | Offline-tulis penuh butuh IndexedDB, antrian sinkron, dan resolusi konflik; draf lokal menangani kegagalan form secara anggun tanpa kehilangan tulisan |
| Editor konten | MDXEditor (`@mdxeditor/editor`) | Mengedit visual (WYSIWYG) rasa markdown, ramah untuk HP Android, menghasilkan markdown bersih, serta mendukung Mode Markdown mentah dan Dark Mode token CSS |
| Bahasa UI | Indonesia | Pengguna internal |
| Mode tampilan | Light mode & dark mode diselaraskan via variabel CSS project dan MDXEditor | — |

Jangan mengubah keputusan di atas tanpa persetujuan eksplisit dari owner project.

---

## 3. Stack Aktual (terverifikasi dari kode)

- Next.js 16.3.5 (App Router), React 19.2.8, TypeScript 5
- Editor: MDXEditor (`@mdxeditor/editor` `4.3.2`)
- Tailwind CSS 4, shadcn/ui, lucide-react, next-themes
- Prisma 5.22.0, PostgreSQL (target: Neon)
- Auth.js v5 (`next-auth@5.0.0-beta.32`), `@auth/prisma-adapter@2.11.3`
- Validasi: `zod` (`^3.24.x`)
- PWA: `@serwist/next` `9.5.13` + `serwist` `9.5.13`
- Font: Inter + JetBrains Mono via `next/font/google`

Catatan: `AGENTS.md` dan `CLAUDE.md` di repo adalah file auto-generated Next.js. Ikuti peringatannya (baca `node_modules/next/dist/docs/` sebelum menulis kode Next.js), tetapi konteks project yang sebenarnya ada di folder `_AI_CONTEXT/` ini.

---

## 4. Model Data

Didefinisikan di `prisma/schema.prisma` (Model Collection → Document, serta Auth.js models):

- **User** — `id`, `email` (unique), `name`, `emailVerified`, `image`, `role` (`VIEWER` | `EDITOR` | `ADMIN`, default `VIEWER`)
- **Account**, **Session**, **VerificationToken** — tabel pendukung adapter Auth.js / NextAuth
- **Collection** — `id`, `slug` (unique), `name`, `description`, `icon`, `status` (`ACTIVE` | `ARCHIVED`, default `ACTIVE`)
- **Document** — `id`, `slug` (unique), `title`, `excerpt`, `content` (markdown), `type` (`PANDUAN` | `MASALAH` | `REFERENSI`, default `PANDUAN`; `SOLUSI` digabung ke `MASALAH` oleh migrasi `2_merge_solusi_into_masalah`), `status` (`DRAFT` | `PUBLISHED` | `ARCHIVED`, default `DRAFT`), `collectionId` (relasi wajib ke Collection, `onDelete: Restrict`), `authorId` (opsional, relasi ke User, `onDelete: SetNull`)
- **DocumentRelation** — relasi many-to-many antar Document untuk "Related Knowledge" (`fromId`, `toId`, `createdAt`, `onDelete: Cascade`)
- **Favorite** — `userId` + `entityType` + `entityId` (unique)
- **RecentView** — `userId`, `entityType`, `entityId`, `viewedAt`

Aturan relasi & visualisasi:
- Konten disimpan sebagai satu markdown di `Document.content`; struktur section diturunkan dari heading markdown pada task UI.
- Hanya dokumen berstatus `PUBLISHED` yang ditampilkan kepada VIEWER secara default.

---

## 5. Autentikasi & Hak Akses (RBAC)

- **Library Auth**: Auth.js v5 (`next-auth@5.0.0-beta.32`) dengan `@auth/prisma-adapter`.
- **Provider**: Hanya Google OAuth.
- **Aturan Akses**:
  - Domain utama dibatasi melalui env `AUTH_ALLOWED_DOMAIN` (misal: `thunderlab.id`).
  - Pengecualian email spesifik diizinkan via env `AUTH_ALLOWED_EMAILS` (dipisah koma).
  - Percobaan login dari email/domain di luar ketentuan ditolak dan diarahkan ke `/login?error=DomainAccessDenied` dengan pesan ramah bahasa Indonesia.
- **Bootstrap Role ADMIN**:
  - Email yang terdaftar di env `AUTH_ADMIN_EMAILS` (dipisah koma) secara otomatis diberi role `ADMIN` saat pembuatan user maupun login.
  - Role user yang sudah dinaikkan (misal ke `EDITOR` atau `ADMIN`) tidak akan diturunkan secara otomatis.
- **Proteksi Rute**:
  - Seluruh rute aplikasi terlindungi via Next.js 16 `src/proxy.ts` (kecuali `/login`, `/api/auth/*`, `/offline`, `/manifest.webmanifest`, `/icons/*`, dan SW assets).
  - Request tanpa autentikasi otomatis didorong ke `/login?callbackUrl=...`.
- **Helper Server Session**:
  - `getCurrentUser()` — Mengambil objek user aktif dari server session.
  - `requireUser()` — Memastikan user sudah login (redirect ke `/login` jika belum).
  - `requireRole(allowedRoles)` — Memastikan user memiliki role yang disyaratkan.

### Matriks Hak Akses

| Aksi | VIEWER | EDITOR | ADMIN |
|---|---|---|---|
| Baca dokumen PUBLISHED | ✓ | ✓ | ✓ |
| Lihat dokumen DRAFT/ARCHIVED | – | ✓ | ✓ |
| Buat / ubah dokumen | – | ✓ | ✓ |
| Publish / arsipkan dokumen | – | ✓ | ✓ |
| Hapus dokumen | – | – | ✓ |
| Buat / ubah / arsipkan koleksi | – | – | ✓ |
| Hapus koleksi | – | – | ✓ (hanya jika tidak ada dokumen) |

---

## 6. Editor Content

Editor markdown utama diimplementasikan menggunakan MDXEditor (`@mdxeditor/editor` `4.3.2`) di `src/components/document/MarkdownEditor.tsx` (yang secara dinamis memuat `InitializedMDXEditor.tsx` dengan `ssr: false`).
- **Antarmuka Props**: Menjaga antarmuka props persis `{ value: string; onChange: (value: string) => void; id?: string; name?: string; placeholder?: string; rows?: number; className?: string }` tanpa mengubah `DocumentForm.tsx`.
- **Fitur Toolbar & GFM**: Mendukung Headings (H1-H6), Bold, Italic, List (peluru, nomor, checklist), Link, Quote, Kode inline, Blok Kode (CodeMirror), dan Tabel GFM.
- **Mode Markdown Mentah & Fallback Error**: Menyediakan tombol "Mode Markdown" untuk mengedit markdown mentah (cocok untuk paster Obsidian) dan secara otomatis jatuh kembali (*fallback*) ke textarea mentah jika ada sintaks markdown tak tersupport / error parser.
- **Tema Dark Mode & Responsivitas**: Seluruh variabel CSS internal MDXEditor (`--baseBg`, `--baseText`, `--baseBorder`, `--accentBg`, dll.) dipetakan ke design tokens project di `markdown-editor.css`. `InitializedMDXEditor` juga meneruskan class `dark-theme` dari `next-themes` (`resolvedTheme`) agar dialog/popover portal otomatis berwarna gelap. Toolbar dapat di-scroll horizontal pada HP Android (~380px).

---

## 7. PWA, Offline-Baca, & Draf Lokal

PWA diimplementasikan dengan Serwist (`@serwist/next` `9.5.13` + `serwist` `9.5.13`):
- **Build**: `next build --webpack` digunakan dalam script `build` di `package.json` untuk menjamin build Vercel dan lokal berjalan mulus.
- **Strategi Cache**:
  - `NetworkFirst` (timeout 3 detik, max 100 entri, kedaluwarsa 30 hari) untuk halaman navigasi & request RSC (`/`, `/collections`, `/collections/*`, `/docs/*`, `/search*`), serta `GET /api/auth/session`.
  - **Dokumen HTML Latar Belakang**: Ketika navigasi client mengambil payload RSC (`_rsc`), Service Worker mengambil dokumen HTML dari rute tersebut satu kali di latar belakang dan menyimpan hasilnya di `pages-rsc-cache` (deduplikasi 5 menit) agar rute dapat dibuka kembali saat offline via reload/PWA icon.
  - `StaleWhileRevalidate` untuk aset statis (`/_next/static/*`, font Google, `/icons/*`).
  - `NetworkOnly` (tanpa cache) untuk `/api/auth/*` (selain `GET /api/auth/session`), `/login`, request non-GET, dan halaman editor/pembuatan (`/docs/new`, `/docs/*/edit`, `/collections/new`, `/collections/*/edit`).
- **Simpan saat Offline & Draf Lokal**:
  - Form dokumen dan koleksi memantau status jaringan via hook `useOnlineStatus`.
  - Saat offline, tombol submit dinonaktifkan, submit via Enter diblokir, dan pesan peringatan offline ditampilkan.
  - Form dokumen secara otomatis menyimpan isian ke `localStorage` (`kb:draft:doc:<id>` atau `kb:draft:doc:new:<collection>`) dengan debounce ~1 detik.
  - Ketika halaman form dibuka dan draf lokal tersedia (serta lebih baru dari data server), banner konfirmasi "Pulihkan" / "Buang" ditampilkan tanpa menimpa data server secara otomatis.
  - Setelah pengiriman server action berhasil, draf lokal untuk dokumen tersebut otomatis dihapus.
  - Catatan: Ini adalah **draf lokal**, bukan antrian sinkron otomatis.
- **Halaman Fallback Offline**: Menampilkan halaman statis `/offline` dalam Bahasa Indonesia ketika pengguna offline dan membuka halaman yang belum pernah di-cache.
- **Indikator Offline & Refresh**: Komponen `OfflineIndicator.tsx` menggunakan `useOnlineStatus` untuk menampilkan banner saat offline dan memanggil `router.refresh()` **sekali** saat koneksi internet kembali pulih.

---

## 8. Aturan Khusus Project

- **Hapus `src/lib/mockData.ts` dari jalur produksi** begitu service Prisma dipakai oleh komponen UI. Tidak boleh ada data palsu di production.
- Semua akses data lewat lapisan service (`src/lib/services/`), bukan query Prisma langsung di komponen halaman.
- Slug harus unik dan stabil; dokumen yang telah dipublikasikan (`PUBLISHED` / `ARCHIVED`) tidak boleh diubah slugnya (ditegakkan di client form dan server action/service).
- Hanya konten `PUBLISHED` yang tampil ke VIEWER. `DRAFT`/`ARCHIVED` hanya terlihat oleh EDITOR/ADMIN.
- Migrasi Prisma: `0_init` diselaraskan untuk schema awal, `1_auth` untuk tabel autentikasi Auth.js.
- Jangan menambah dependency tanpa alasan yang jelas di PR description.
- Ikuti `ui-ux-principles.md`: minimalis, whitespace, tidak banyak card/border, referensi Outline.
- UI dalam bahasa Indonesia.

---

## 9. Alur Kerja Agent

1. Baca `_AI_CONTEXT/` (semua file) dan `project-status.md`.
2. Periksa branch, commit, dan PR terkini di GitHub — jangan anggap `project-status.md` selalu mutakhir.
3. Buat plan sebelum implementasi untuk task yang substansial.
4. Kerjakan dalam scope task; jangan memperluas scope.
5. Validasi dengan `npm run lint`, `npx tsc --noEmit`, dan `npx next build --webpack`. Laporkan hasil yang **benar-benar dijalankan**.
6. Laporkan: file yang berubah, perintah yang dijalankan beserta hasilnya, masalah yang belum selesai, dan detail commit/PR.
7. Perbarui `project-status.md` di PR yang sama jika task mengubah status project.
8. Catat setiap fitur baru atau perubahan fitur di `docs/FEATURES.md` di PR yang sama. Dokumentasi lengkap ada di `docs/`.

---

## 10. Urutan Implementasi yang Disepakati

1. Konteks project di `_AI_CONTEXT/` + rapikan metadata repo (package name, README)
2. Align Prisma Schema (Collection → Document), Service layer, Idempotent Seed, dan build di Vercel
3. Hubungkan halaman UI dengan `src/lib/services` menggantikan `mockData`
4. Autentikasi sungguhan + RBAC (VIEWER / EDITOR / ADMIN)
5. CRUD Document / Collection + editor markdown
6. Integrasi Rich-Text Markdown Editor (MDXEditor)
7. Search (PostgreSQL full-text)
8. Favorit & Recent persisten
9. PWA + offline-baca
10. Polish, testing, verifikasi Vercel
11. (Opsional) Ekspor markdown untuk Obsidian
