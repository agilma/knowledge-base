import { Role } from "@prisma/client";
import { z } from "zod";

/** The roles an admin may hand out, in the order the screen lists them. */
export const ROLE_LABELS: Record<Role, string> = {
  VIEWER: "Viewer (hanya membaca)",
  EDITOR: "Editor (menulis dan menerbitkan)",
  ADMIN: "Admin (mengelola koleksi dan pengguna)",
};

export const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email wajib diisi")
    .max(254, "Email terlalu panjang")
    .email("Format email tidak valid"),
  role: z.nativeEnum(Role, { message: "Peran tidak valid" }),
});

export type InviteInput = z.infer<typeof inviteSchema>;
