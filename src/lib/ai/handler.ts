import { Role } from "@prisma/client";
import type { Viewer } from "../collection-access";
import type { StoredMessage } from "../services/ai-conversations";
import { type AssistantClient, type AssistantDeps, type AssistantEvent, logFailure, runAssistant } from "./assistant";
import { canUseAssistant, type ConversationStore, isSameOrigin, json } from "./http";
import { checkHistorySize, chatRequestSchema, TOO_LONG_MESSAGE, type AssistantRequest } from "./request";

export interface HandlerDeps {
  getUser(): Promise<{ id: string; role: Role } | null>;
  /** Undefined while no API key is configured. */
  createClient(): AssistantClient | undefined;
  assistant: AssistantDeps;
  conversations: ConversationStore;
  rateLimit: { take(key: string): { ok: true } | { ok: false; retryAfterMs: number } };
}

/** An assistant reply is kept up to this long; the model's limit is far below it. */
const STORED_TEXT_LIMIT = 100_000;
const ASSISTANT = "document" as const;

/**
 * The history as the model should see it. Only the newest proposal is repeated in
 * full: older ones are superseded and would eat the size budget.
 */
export function toModelMessages(stored: StoredMessage[]): AssistantRequest["messages"] {
  const lastProposal = stored.map((m) => m.proposal !== undefined).lastIndexOf(true);
  return stored.flatMap((m, i) => {
    const withProposal = i === lastProposal && m.proposal !== undefined;
    const content = withProposal ? `${m.content}\n\n[Usulan dokumen yang sudah dikirim]\n${JSON.stringify(m.proposal)}`.trim() : m.content;
    return content ? [{ role: m.role, content }] : [];
  });
}

export async function handleAssistantRequest(request: Request, deps: HandlerDeps): Promise<Response> {
  const user = await deps.getUser();
  if (!user) return json(401, "Silakan masuk lebih dulu.");
  if (!canUseAssistant(ASSISTANT, user.role)) return json(403, "Fitur ini hanya untuk admin.");

  if (!isSameOrigin(request)) return json(403, "Permintaan ditolak.");
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json(415, "Permintaan harus berformat JSON.");
  }

  const client = deps.createClient();
  if (!client) return json(503, "AI belum dikonfigurasi. Hubungi pemilik aplikasi untuk mengisi ANTHROPIC_API_KEY.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, "Isi permintaan bukan JSON yang valid.");
  }
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    const tooLong = parsed.error.issues.some((i) => i.code === "too_big");
    return tooLong ? json(413, TOO_LONG_MESSAGE) : json(400, "Permintaan tidak valid.");
  }
  const chat = parsed.data;

  const limit = deps.rateLimit.take(user.id);
  if (!limit.ok) {
    return json(429, "Terlalu banyak permintaan. Coba lagi beberapa menit lagi.", {
      "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
    });
  }

  // The history comes from the store, scoped to this user: another person's chat is "not found".
  const history = chat.conversationId ? await deps.conversations.get(user.id, chat.conversationId) : null;
  if (chat.conversationId && (!history || history.assistant !== ASSISTANT)) {
    return json(404, "Percakapan tidak ditemukan.");
  }
  const messages = [...toModelMessages(history?.messages ?? []), { role: "user" as const, content: chat.message }];
  const tooLong = checkHistorySize(messages);
  if (tooLong) return json(413, `${tooLong} Mulai percakapan baru.`);

  // The question is saved before the model is asked, so it is not lost if the answer fails.
  let conversationId: string;
  let title: string;
  if (history) {
    conversationId = history.id;
    title = history.title;
    const saved = await deps.conversations.append(user.id, history.id, { role: "user", content: chat.message });
    if (!saved) return json(404, "Percakapan tidak ditemukan.");
  } else {
    ({ id: conversationId, title } = await deps.conversations.create(user.id, ASSISTANT, chat.message, chat.documentId));
  }

  const viewer: Viewer = { id: user.id, role: user.role };
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // The browser went away; nothing left to tell it.
        }
      };
      send("conversation", { id: conversationId, title });

      // What the assistant said, kept as it streams, so it is saved even if the browser leaves halfway.
      const reply: StoredMessage = { role: "assistant", content: "" };
      const emit = (e: AssistantEvent) => {
        if (e.type === "text") {
          if (reply.content.length < STORED_TEXT_LIMIT) reply.content += e.text;
          send("text", { text: e.text });
        } else if (e.type === "proposal") {
          reply.proposal = e.proposal;
          reply.warnings = e.warnings;
          send("proposal", { proposal: e.proposal, warnings: e.warnings });
        } else {
          reply.error = e.message;
          send("error", { message: e.message });
        }
      };
      try {
        await runAssistant({
          client,
          request: { messages, form: chat.form },
          viewer,
          deps: deps.assistant,
          emit,
          signal: request.signal,
        });
      } catch (err) {
        logFailure("request", err);
        // The provider's error text can carry request details; the person gets a fixed sentence.
        if (!request.signal.aborted) emit({ type: "error", message: "Asisten AI sedang tidak bisa dihubungi. Coba lagi sebentar." });
      }
      if (reply.content || reply.proposal !== undefined || reply.error) {
        try {
          await deps.conversations.append(user.id, conversationId, reply);
        } catch (err) {
          logFailure("save", err);
        }
      }
      send("done", {});
      try {
        controller.close();
      } catch {
        // already closed by an abort
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
