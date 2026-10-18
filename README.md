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

---

Sebelum melakukan perubahan atau kontribusi, seluruh agent dan kontributor wajib membaca pedoman di folder `_AI_CONTEXT/`.
