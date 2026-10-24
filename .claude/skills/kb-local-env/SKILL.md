---
name: kb-local-env
description: Menjalankan aplikasi Knowledge Base secara lokal untuk menguji perubahan di browser, dengan Postgres lokal, data seed, sesi login palsu, dan Playwright. Pakai saat perlu membuktikan sebuah perubahan bekerja di aplikasi nyata (bukan hanya test), mengambil screenshot, atau mereproduksi bug UI/data.
---

# Menjalankan Knowledge Base secara lokal

Sesi cloud berjalan sebagai **root** dan tidak punya Docker. Postgres 16 sudah terpasang, tinggal
dijalankan sebagai user `postgres`. Semua langkah di bawah sudah terbukti jalan; ikuti persis.

Simpan skrip Playwright dan file sementara di scratchpad sesi, bukan di dalam repo.

## 1. Dependensi

```bash
npm ci          # bukan `npm install`: install mengubah package-lock.json
```

## 2. Postgres (port 5433, data di /var/tmp)

```bash
D=/var/tmp/kbpg; rm -rf $D; mkdir -p $D && chown postgres $D
su postgres -c "/usr/lib/postgresql/16/bin/initdb -D $D -A trust >/dev/null && \
  /usr/lib/postgresql/16/bin/pg_ctl -D $D -o '-p 5433 -k /var/tmp' -l /var/tmp/kbpg.log start"
sleep 3
psql -h localhost -p 5433 -U postgres -c "create database kb"
```

Data dir **harus** di `/var/tmp` (user `postgres` tidak bisa menulis ke scratchpad atau /tmp milik root).

## 3. Env, migrasi, seed

```bash
export DATABASE_URL=postgresql://postgres@localhost:5433/kb AUTH_SECRET=x \
  AUTH_GOOGLE_ID=a AUTH_GOOGLE_SECRET=b AUTH_TRUST_HOST=true AUTH_URL=http://localhost:3113
npx prisma migrate deploy
npx prisma db seed        # satu koleksi dan satu dokumen terbit: slug `pos-gagal-closing`
```

## 4. Pengguna dan sesi palsu

Login Google tidak bisa dipakai. Auth.js memakai sesi database, jadi cukup buat barisnya:

```bash
psql -h localhost -p 5433 -U postgres kb <<'SQL'
insert into users(id,email,name,role,"updatedAt") values
  ('u1','a@x.com','Admin','ADMIN',now()),
  ('u2','v@x.com','Viewer','VIEWER',now());
insert into sessions(id,session_token,user_id,expires) values
  ('s1','tokadmin','u1',now()+interval '1 day'),
  ('s2','tokviewer','u2',now()+interval '1 day');
SQL
```

Untuk menguji visibilitas draf, tambahkan dokumen `status = 'DRAFT'` dengan `"collectionId"` dari
dokumen seed. Pakai dua pengguna (ADMIN dan VIEWER) bila fitur bergantung pada peran.

## 5. Build dan jalankan

```bash
npx next build --webpack                    # SELALU --webpack; tanpa flag build gagal
(npx next start -p 3113 >/tmp/server.log 2>&1 &); sleep 6
```

Build tanpa database mencetak galat `UntrustedHost`/Prisma di log tetapi tetap sukses; abaikan.
Mengubah kode berarti build ulang (`next start` memakai hasil build).

## 6. Browser (Playwright)

Chromium ada di `/opt/pw-browsers/chromium`; modulnya di `/opt/node-tools/node_modules/playwright-core`
(bukan di `node_modules` repo, jangan `npm install` playwright).

```js
const { chromium } = require('/opt/node-tools/node_modules/playwright-core');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 390, height: 800 } }); // 390 = lebar HP
await ctx.addCookies([{ name: 'authjs.session-token', value: 'tokadmin', domain: 'localhost', path: '/' }]);
const p = await ctx.newPage();
p.on('console', m => { if (m.type() === 'error') console.log(m.text()); });  // pantau galat konsol
await p.goto('http://localhost:3113/docs/pos-gagal-closing');
await p.screenshot({ path: '/path/di/scratchpad/shot.png' });   // lalu baca dengan Read untuk melihatnya
```

Cookie bernama `authjs.session-token` (HTTP biasa, bukan `__Secure-`). Untuk memuat ulang halaman setelah
menunggu autosave atau efek klien, pakai `waitForTimeout(2500)`. Jalankan skrip dari scratchpad
(`cd` ke sana), karena Node memuat modul dari direktori skrip.

## 7. Bersihkan (wajib)

```bash
fuser -k 3113/tcp
su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/tmp/kbpg stop"
rm -rf /var/tmp/kbpg
git status --short      # pastikan tidak ada file nyasar, dan package-lock.json tidak berubah
```

## Test berbasis database

`*.integration.test.ts` dilewati secara bawaan (CI tidak punya database). Setelah langkah 2 dan 3:

```bash
KB_DB_TESTS=1 node --import tsx --test src/lib/services/user-lists.integration.test.ts
```

Test itu hanya menyentuh baris yang dibuatnya sendiri dan membersihkannya.

## Jebakan

- **Jangan** memakai `pkill -f ...` atau `pgrep -f "next start"` dalam perintah yang barisnya memuat
  pola itu: yang mati justru shell-nya sendiri (exit 144, sisa perintah tidak jalan). Pakai `fuser -k <port>/tcp`.
- Jangan menjalankan `npm run build`: skripnya menjalankan `prisma migrate deploy` dan seed. Pakai
  `npx next build --webpack`.
- Matikan database untuk menguji "DB mati" tidak memunculkan halaman galat: `auth()` menganggap
  gagalnya pencarian sesi sebagai belum login dan menampilkan halaman login (tercatat di `TODO.md`).
- Hydration error #418 belum bisa direproduksi lokal; jangan buang waktu mencarinya di sini tanpa data baru.
