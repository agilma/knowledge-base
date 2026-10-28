import { Role } from "@prisma/client";
import type { Viewer } from "../collection-access";
import { type AssistantClient, type AssistantDeps, type AssistantEvent, logFailure, runAssistant } from "./assistant";
import { requestSchema, TOO_LONG_MESSAGE } from "./request";

export interface HandlerDeps {
  getUser(): Promise<{ id: string; role: Role } | null>;
  /** Undefined while no API key is configured. */
  createClient(): AssistantClient | undefined;
  assistant: AssistantDeps;
  rateLimit: { take(key: string): { ok: true } | { ok: false; retryAfterMs: number } };
}

const json = (status: number, message: string, headers?: Record<string, string>) =>
  Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store", ...headers } });

/**
 * Same-origin only. The session cookie would ride along on a cross-site POST,
 * and each request here costs money, so a page elsewhere must not be able to
 * make an admin's browser call it.
 */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return host !== null && new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function handleAssistantRequest(request: Request, deps: HandlerDeps): Promise<Response> {
  const user = await deps.getUser();
  if (!user) return json(401, "Silakan masuk lebih dulu.");
  if (user.role !== Role.ADMIN) return json(403, "Fitur ini hanya untuk admin.");

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
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    const tooLong = parsed.error.issues.some(
      (i) => i.message === TOO_LONG_MESSAGE || i.code === "too_big",
    );
    return tooLong ? json(413, TOO_LONG_MESSAGE) : json(400, "Permintaan tidak valid.");
  }

  const limit = deps.rateLimit.take(user.id);
  if (!limit.ok) {
    return json(429, "Terlalu banyak permintaan. Coba lagi beberapa menit lagi.", {
      "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
    });
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
      const emit = (e: AssistantEvent) => {
        if (e.type === "text") send("text", { text: e.text });
        else if (e.type === "proposal") send("proposal", { proposal: e.proposal, warnings: e.warnings });
        else send("error", { message: e.message });
      };
      try {
        await runAssistant({ client, request: parsed.data, viewer, deps: deps.assistant, emit, signal: request.signal });
      } catch (err) {
        logFailure("request", err);
        // The provider's error text can carry request details; the person gets a fixed sentence.
        if (!request.signal.aborted) {
          send("error", { message: "Asisten AI sedang tidak bisa dihubungi. Coba lagi sebentar." });
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
