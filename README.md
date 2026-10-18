# Thunderlab Knowledge Base

Thunderlab Knowledge Base adalah sistem manajemen pengetahuan internal untuk menyimpan problem, solusi, dan konteks project agar mudah dicari dan diakses oleh tim. Aplikasi ini dirancang agar pengetahuan dapat diakses dari device mana pun secara cepat dan efisien.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, shadcn/ui, next-themes
- **Database & ORM**: PostgreSQL (Neon), Prisma 5.22
- **Autentikasi**: Auth.js v5 (`next-auth@5`) dengan `@auth/prisma-adapter` & Google OAuth

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
prisma migrate deploy && prisma db seed && next build
```

- **Migrasi**: Menjalankan migrasi database PostgreSQL secara otomatis saat deploy di Vercel.
- **Seed**: Script seed (`prisma/seed.ts`) bersifat idempoten. Seed hanya akan mengisi data awal jika tabel `Collection` di database masih kosong (count = 0). Apabila database sudah berisi data, proses seed dilewati secara aman.

---

Sebelum melakukan perubahan atau kontribusi, seluruh agent dan kontributor wajib membaca pedoman di folder `_AI_CONTEXT/`.
