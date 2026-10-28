import { Role } from "@prisma/client";
import { isAssistantKey } from "../services/ai-conversations";
import { canUseAssistant, type ConversationStore, isSameOrigin, json } from "./http";

export interface ConversationHandlerDeps {
  getUser(): Promise<{ id: string; role: Role } | null>;
  store: ConversationStore;
}

const noStore = { "Cache-Control": "no-store" };

/**
 * The list, one chat, rename and delete. Everything is scoped to the signed-in
 * user inside the store: another person's chat answers exactly like a missing one.
 */
export async function handleConversationRequest(
  request: Request,
  id: string | null,
  deps: ConversationHandlerDeps,
): Promise<Response> {
  const user = await deps.getUser();
  if (!user) return json(401, "Silakan masuk lebih dulu.");

  if (request.method === "GET" && id === null) {
    const assistant = new URL(request.url).searchParams.get("assistant");
    if (!isAssistantKey(assistant)) return json(400, "Jenis asisten tidak dikenal.");
    if (!canUseAssistant(assistant, user.role)) return json(403, "Fitur ini hanya untuk admin.");
    const items = await deps.store.list(user.id, assistant);
    return Response.json({ conversations: items }, { headers: noStore });
  }
  if (id === null) return json(405, "Metode tidak didukung.");

  const conversation = await deps.store.get(user.id, id);
  const allowed = conversation && isAssistantKey(conversation.assistant) && canUseAssistant(conversation.assistant, user.role);
  if (!conversation || !allowed) return json(404, "Percakapan tidak ditemukan.");

  if (request.method === "GET") {
    return Response.json({ conversation }, { headers: noStore });
  }

  if (request.method === "PATCH" || request.method === "DELETE") {
    if (!isSameOrigin(request)) return json(403, "Permintaan ditolak.");
    if (request.method === "DELETE") {
      await deps.store.remove(user.id, id);
      return Response.json({ ok: true }, { headers: noStore });
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return json(415, "Permintaan harus berformat JSON.");
    }
    const body = (await request.json().catch(() => null)) as { title?: unknown } | null;
    if (typeof body?.title !== "string" || !body.title.trim() || body.title.length > 200) {
      return json(400, "Judul tidak valid.");
    }
    await deps.store.rename(user.id, id, body.title);
    return Response.json({ ok: true }, { headers: noStore });
  }
  return json(405, "Metode tidak didukung.");
}
