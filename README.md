# Thunderlab Knowledge Base

Thunderlab Knowledge Base adalah sistem manajemen pengetahuan internal untuk menyimpan problem, solusi, dan konteks project agar mudah dicari dan diakses oleh tim. Aplikasi ini dirancang agar pengetahuan dapat diakses dari device mana pun secara cepat dan efisien.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, shadcn/ui, next-themes
- **Database & ORM**: PostgreSQL (Neon), Prisma 5.22
- **Autentikasi**: Auth.js v5 (`next-auth@5`) dengan `@auth/prisma-adapter` & Google OAuth
- **PWA**: `@serwist/next` `9.5.13` + `serwist` `9.5.13`

## Cara Menjalankan Lokal

1. Install dependensi:
   ```bash
   npm install
   ```
2. Salin file `.env.example` ke `.env` dan isi variabel autentikasi & database:
   ```bash
   cp .env.example .env
   ```
3. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
4. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```

## Autentikasi & Konfigurasi Google OAuth

Aplikasi menggunakan Auth.js v5 (`next-auth@5`) dengan login khusus Google OAuth.

### Variable Environment

- `AUTH_SECRET`: Key enkripsi sesi (dapat dibuat dengan `npx auth secret`).
- `AUTH_GOOGLE_ID`: Client ID Google OAuth dari Google Cloud Console.
- `AUTH_GOOGLE_SECRET`: Client Secret Google OAuth dari Google Cloud Console.
- `AUTH_ALLOWED_DOMAIN`: Domain email utama yang diizinkan (contoh: `thunderlab.id`).
- `AUTH_ALLOWED_EMAILS`: Daftar email di luar domain utama yang diizinkan (dipisah koma).
- `AUTH_ADMIN_EMAILS`: Daftar email yang otomatis diberikan role `ADMIN` saat login (dipisah koma).

### URL Callback / Redirect Google Cloud Console

Saat mendaftarkan OAuth Client ID di Google Cloud Console, tambahkan URL callback berikut pada **Authorized redirect URIs**:

- **Pengembangan Lokal**:
  `http://localhost:3000/api/auth/callback/google`
- **Produksi (Vercel / Domain Kustom)**:
  `https://<domain-aplikasi>/api/auth/callback/google`

## Automated Migration & Seed pada Vercel Build

Proses build aplikasi (`npm run build`) dikonfigurasi untuk menjalankan:
```bash
prisma migrate deploy && prisma db seed && next build --webpack
```

- **Migrasi**: Menjalankan migrasi database PostgreSQL secara otomatis saat deploy di Vercel.
- **Seed**: Script seed (`prisma/seed.ts`) bersifat idempoten. Seed hanya akan mengisi data awal jika tabel `Collection` di database masih kosong (count = 0). Apabila database sudah berisi data, proses seed dilewati secara aman.

## PWA & Offline-Baca

Aplikasi didukung PWA (Progressive Web App) menggunakan **Serwist** (`@serwist/next` + `serwist`) dengan kemampuan offline-baca untuk halaman yang telah dibuka sebelumnya.

### Strategi Cache
- **NetworkFirst (Timeout 3 detik)**: Navigasi halaman dan request RSC (`/`, `/collections`, `/collections/*`, `/docs/*`, `/search*`, `/favorites`, `/recent`).
- **StaleWhileRevalidate**: Aset statis (`/_next/static/*`, font Google, `/icons/*`).
- **Tidak Di-cache (NetworkOnly)**:
  - Route autentikasi (`/api/auth/*`, `/login`).
  - Request non-GET (`POST`, `PUT`, `DELETE`, Server Actions).
  - Halaman pembuatan/pengeditan (`/docs/new`, `/docs/*/edit`, `/collections/new`, `/collections/*/edit`).
- **Halaman Fallback Offline (`/offline`)**: Tampil saat pengguna offline dan mencoba mengakses halaman yang belum pernah disimpan/dibuka sebelumnya. Halaman ini di-precache otomatis.
- **Pembersihan Cache Logout**: Saat pengguna menekan "Keluar", Service Worker dan Cache Storage secara otomatis menghapus cache runtime halaman (`pages-rsc-cache`).

### Panduan Pengujian di Android
1. **Install PWA**: Buka aplikasi di Google Chrome pada HP Android, lalu pilih menu **"Tambahkan ke Layar Utama" / "Install Aplikasi"**.
2. **Buka Beberapa Halaman**: Login, lalu kunjungi Halaman Utama, satu Koleksi, dan satu Dokumen dalam kondisi online.
3. **Uji Mode Pesawat**: Aktifkan **Mode Pesawat (Offline)** pada HP Android.
4. **Buka Ulang Halaman**: Buka kembali 3 halaman yang pernah dikunjungi dari ikon PWA di Layar Utama (halaman dapat dibaca dengan lancar dari cache, indikator offline kuning akan muncul di bagian atas).
5. **Akses Halaman Belum Disimpan**: Coba buka dokumen yang belum pernah dikunjungi saat offline — aplikasi akan menampilkan halaman `/offline` berbahasa Indonesia.
6. **Matikan Mode Pesawat**: Matikan Mode Pesawat (Online kembali). Indikator offline otomatis hilang dan data halaman segar dimuat ulang dari server (`router.refresh()`).
7. **Uji Logout**: Tekan menu user dan pilih **"Keluar"**.
8. **Verifikasi Keamanan Cache**: Aktifkan kembali Mode Pesawat. Konten KB internal tidak lagi tertinggal atau dapat diakses dari cache perangkat.

---

Sebelum melakukan perubahan atau kontribusi, seluruh agent dan kontributor wajib membaca pedoman di folder `_AI_CONTEXT/`.
