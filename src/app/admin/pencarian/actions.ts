"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { dismissSearchMiss } from "@/lib/services/search-misses";

/** "Abaikan": the phrase is taken off the list of searches that found nothing. */
export async function dismissSearchMissAction(formData: FormData): Promise<void> {
  await requireRole([Role.EDITOR, Role.ADMIN]);
  const query = formData.get("query");
  if (typeof query !== "string") return;
  await dismissSearchMiss(query);
  revalidatePath("/admin/pencarian");
}
