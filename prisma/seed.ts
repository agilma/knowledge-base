import { PrismaClient, DocumentType, DocumentStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const collectionCount = await prisma.collection.count();
  if (collectionCount > 0) {
    console.log("Database sudah berisi data, seed dilewati.");
    return;
  }

  const murniErpnext = await prisma.collection.create({
    data: {
      slug: "murni-erpnext",
      name: "Murni ERPNext",
      description: "Pengetahuan operasional ERPNext untuk Bali Murni",
    },
  });

  await prisma.collection.create({
    data: {
      slug: "murni-booth",
      name: "Murni Booth",
      description: "Aplikasi picking untuk BA/booth Bali Murni",
    },
  });

  await prisma.collection.create({
    data: {
      slug: "thunderlab",
      name: "Thunderlab",
      description: "Proses internal, HRD, dan konteks tim Thunderlab",
    },
  });

  const content = `## Konteks

Masalah ini muncul saat kasir menutup sesi POS dan proses closing gagal karena ada transaksi offline yang belum berhasil tersinkron ke server.

## Langkah Penyelesaian

1. Login menggunakan akun koordinator.
2. Buka menu **Riwayat Offline**.
3. Cari transaksi yang bermasalah.
4. Klik **Retry**.
5. Perhatikan hasilnya, lalu ikuti skenario yang sesuai.

## Skenario Hasil

_Bagian ini masih perlu dilengkapi oleh pemilik pengetahuan._`;

  await prisma.document.create({
    data: {
      slug: "pos-gagal-closing",
      title: "Panduan Penyelesaian POS Gagal Closing",
      excerpt:
        "Langkah penanganan ketika kasir tidak bisa closing karena ada transaksi offline yang belum tersinkron.",
      content,
      type: DocumentType.MASALAH,
      status: DocumentStatus.PUBLISHED,
      collectionId: murniErpnext.id,
    },
  });

  console.log("Seed selesai dijalankan.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
