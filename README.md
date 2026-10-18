# Thunderlab Knowledge Base

Thunderlab Knowledge Base adalah sistem manajemen pengetahuan internal untuk menyimpan problem, solusi, dan konteks project agar mudah dicari dan diakses oleh tim. Aplikasi ini dirancang agar pengetahuan dapat diakses dari device mana pun secara cepat dan efisien.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, shadcn/ui, next-themes
- **Database & ORM**: PostgreSQL (Neon), Prisma 5.22

## Cara Menjalankan Lokal

1. Install dependensi:
   ```bash
   npm install
   ```
2. Salin file `.env.example` ke `.env`:
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

## Automated Migration & Seed pada Vercel Build

Proses build aplikasi (`npm run build`) dikonfigurasi untuk menjalankan:
```bash
prisma migrate deploy && prisma db seed && next build
```

- **Migrasi**: Menjalankan migrasi database PostgreSQL secara otomatis saat deploy di Vercel.
- **Seed**: Script seed (`prisma/seed.ts`) bersifat idempoten. Seed hanya akan mengisi data awal jika tabel `Collection` di database masih kosong (count = 0). Apabila database sudah berisi data, proses seed dilewati secara aman.

---

Sebelum melakukan perubahan atau kontribusi, seluruh agent dan kontributor wajib membaca pedoman di folder `_AI_CONTEXT/`.
