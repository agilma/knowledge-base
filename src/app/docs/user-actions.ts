"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { setFavorite } from "@/lib/services/favorites";
import { recordView } from "@/lib/services/recent-views";

export type FavoriteResult = { ok: boolean; favorite: boolean };

// Server actions can be POSTed directly, so TypeScript's types say nothing about
// what arrives. An object here would reach Prisma as a filter, not an id.
function isValidId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 100;
}

export async function setFavoriteAction(
  documentId: string,
  favorite: boolean
): Promise<FavoriteResult> {
  if (!isValidId(documentId) || typeof favorite !== "boolean") {
    return { ok: false, favorite: false };
  }
  const user = await getCurrentUser();
  if (!user) return { ok: false, favorite: !favorite };

  const ok = await setFavorite(user.id, documentId, favorite, user.role);
  if (!ok) return { ok: false, favorite: !favorite };

  revalidatePath("/favorites");
  return { ok: true, favorite };
}

/** Fire-and-forget from the client; a failed record is never worth an error page. */
export async function recordViewAction(documentId: string): Promise<void> {
  if (!isValidId(documentId)) return;
  const user = await getCurrentUser();
  if (!user) return;

  try {
    await recordView(user.id, documentId, user.role);
  } catch (error) {
    console.error("Gagal mencatat riwayat tampilan:", error);
  }
}
