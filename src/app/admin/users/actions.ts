"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { userMessage } from "@/lib/errors";
import { inviteUser, setUserRole, revokeInvitation } from "@/lib/services/users";

export type UserActionState = { error?: string; ok?: string };

export async function inviteUserAction(
  _prev: UserActionState | null,
  formData: FormData
): Promise<UserActionState> {
  const admin = await requireRole(Role.ADMIN);
  try {
    const invitation = await inviteUser(
      { email: formData.get("email"), role: formData.get("role") },
      { id: admin.id, role: admin.role }
    );
    revalidatePath("/admin/users");
    return { ok: `${invitation.email} diundang. Minta orangnya masuk dengan akun Google itu.` };
  } catch (err) {
    return { error: userMessage(err, "Gagal mengundang pengguna") };
  }
}

export async function setUserRoleAction(userId: string, role: string): Promise<UserActionState> {
  const admin = await requireRole(Role.ADMIN);
  try {
    await setUserRole(userId, role, { id: admin.id, role: admin.role });
    revalidatePath("/admin/users");
    return { ok: "Peran diperbarui" };
  } catch (err) {
    return { error: userMessage(err, "Gagal mengubah peran") };
  }
}

export async function revokeInvitationAction(email: string): Promise<UserActionState> {
  const admin = await requireRole(Role.ADMIN);
  try {
    await revokeInvitation(email, { id: admin.id, role: admin.role });
    revalidatePath("/admin/users");
    return { ok: "Akses dicabut" };
  } catch (err) {
    return { error: userMessage(err, "Gagal mencabut akses") };
  }
}
