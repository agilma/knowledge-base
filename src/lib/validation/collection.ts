import { z } from "zod";
import { CollectionStatus } from "@prisma/client";

export const collectionSchema = z.object({
  name: z
    .string({ message: "Nama koleksi wajib diisi" })
    .min(3, "Nama koleksi minimal 3 karakter")
    .max(150, "Nama koleksi maksimal 150 karakter"),
  slug: z
    .string({ message: "Slug wajib diisi" })
    .min(3, "Slug minimal 3 karakter")
    .max(100, "Slug maksimal 100 karakter")
    .regex(/^[a-z0-9-]+$/, "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-)"),
  description: z
    .string()
    .max(300, "Deskripsi maksimal 300 karakter")
    .optional()
    .or(z.literal("")),
  icon: z.string().optional().or(z.literal("")),
  status: z.nativeEnum(CollectionStatus, {
    message: "Status koleksi tidak valid",
  }).default(CollectionStatus.ACTIVE),
});

export type CollectionInput = z.infer<typeof collectionSchema>;
