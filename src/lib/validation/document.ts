import { z } from "zod";
import { DocumentType, DocumentStatus } from "@prisma/client";

export const documentSchema = z.object({
  title: z
    .string({ message: "Judul dokumen wajib diisi" })
    .min(3, "Judul dokumen minimal 3 karakter")
    .max(150, "Judul dokumen maksimal 150 karakter"),
  slug: z
    .string({ message: "Slug wajib diisi" })
    .min(3, "Slug minimal 3 karakter")
    .max(100, "Slug maksimal 100 karakter")
    .regex(/^[a-z0-9-]+$/, "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-)"),
  collectionId: z
    .string({ message: "Koleksi wajib dipilih" })
    .min(1, "Koleksi wajib dipilih"),
  type: z.nativeEnum(DocumentType, {
    message: "Jenis dokumen tidak valid",
  }).default(DocumentType.PANDUAN),
  excerpt: z
    .string()
    .max(300, "Ringkasan maksimal 300 karakter")
    .optional()
    .or(z.literal("")),
  content: z
    .string({ message: "Konten dokumen wajib diisi" })
    .min(1, "Konten dokumen tidak boleh kosong"),
  status: z.nativeEnum(DocumentStatus, {
    message: "Status dokumen tidak valid",
  }).default(DocumentStatus.DRAFT),
});

export type DocumentInput = z.infer<typeof documentSchema>;
