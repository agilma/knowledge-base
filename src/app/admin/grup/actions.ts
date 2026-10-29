"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { userMessage } from "@/lib/errors";
import { createGroup, deleteGroup, MAX_GROUP_MEMBERS, renameGroup, setGroupMembers } from "@/lib/services/groups";

function back(path: string, error: unknown, fallback: string): never {
  redirect(`${path}?galat=${encodeURIComponent(userMessage(error, fallback).slice(0, 200))}`);
}

export async function createGroupAction(formData: FormData): Promise<void> {
  const admin = await requireRole(Role.ADMIN);
  let id: string;
  try {
    ({ id } = await createGroup(formData.get("name"), { id: admin.id, role: admin.role }));
  } catch (err) {
    back("/admin/grup", err, "Gagal membuat grup");
  }
  revalidatePath("/admin/grup");
  redirect(`/admin/grup/${id}`);
}

/** Name and members of one group, saved together. */
export async function saveGroupAction(groupId: string, formData: FormData): Promise<void> {
  const admin = await requireRole(Role.ADMIN);
  if (typeof groupId !== "string") return;
  const viewer = { id: admin.id, role: admin.role };
  try {
    const memberIds = formData.getAll("memberIds").filter((v): v is string => typeof v === "string");
    // Said before the name is saved, so a refused list does not leave a half-saved group.
    if (formData.get("membersTouched") === "1" && new Set(memberIds).size > MAX_GROUP_MEMBERS) {
      throw new Error(`Anggota grup maksimal ${MAX_GROUP_MEMBERS} orang`);
    }
    await renameGroup(groupId, formData.get("name"), viewer);
    if (formData.get("membersTouched") === "1") await setGroupMembers(groupId, memberIds, viewer);
  } catch (err) {
    back(`/admin/grup/${encodeURIComponent(groupId)}`, err, "Gagal menyimpan grup");
  }
  revalidatePath("/admin/grup");
  revalidatePath(`/admin/grup/${groupId}`);
  redirect("/admin/grup");
}

export async function deleteGroupAction(groupId: string): Promise<void> {
  const admin = await requireRole(Role.ADMIN);
  if (typeof groupId !== "string") return;
  try {
    await deleteGroup(groupId, { id: admin.id, role: admin.role });
  } catch (err) {
    back("/admin/grup", err, "Gagal menghapus grup");
  }
  revalidatePath("/admin/grup");
  redirect("/admin/grup");
}
