"use server";

import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import { searchRelationCandidates } from "@/lib/services/documents";

/** The picker's search: titles the editor may read, never the document being edited. */
export async function searchRelatedAction(query: string, excludeId?: string) {
  const user = await requireRole([Role.EDITOR, Role.ADMIN]);
  if (typeof query !== "string" || (excludeId !== undefined && typeof excludeId !== "string")) return [];
  return searchRelationCandidates(query, { id: user.id, role: user.role }, excludeId);
}
