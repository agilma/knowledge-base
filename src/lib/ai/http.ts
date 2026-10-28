import { Role } from "@prisma/client";
import type { AiAssistantKey, ConversationSummary, StoredMessage } from "../services/ai-conversations";

export const json = (status: number, message: string, headers?: Record<string, string>) =>
  Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store", ...headers } });

/**
 * Same-origin only. The session cookie would ride along on a cross-site POST,
 * and each request here costs money or changes a chat, so a page elsewhere must
 * not be able to make a signed-in browser call it.
 */
export function isSameOrigin(request: Request): boolean {
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

/** Who may use each assistant, and so see its history. */
export function canUseAssistant(assistant: AiAssistantKey, role: Role): boolean {
  switch (assistant) {
    case "document":
      return role === Role.ADMIN;
  }
}

export interface ConversationStore {
  list(userId: string, assistant: AiAssistantKey): Promise<ConversationSummary[]>;
  get(
    userId: string,
    id: string,
  ): Promise<{ id: string; assistant: string; title: string; documentId: string | null; messages: StoredMessage[] } | null>;
  create(userId: string, assistant: AiAssistantKey, firstMessage: string, documentId?: string): Promise<{ id: string; title: string }>;
  append(userId: string, conversationId: string, message: StoredMessage): Promise<boolean>;
  rename(userId: string, id: string, title: string): Promise<boolean>;
  dropLastProposal(userId: string, id: string): Promise<boolean>;
  remove(userId: string, id: string): Promise<boolean>;
}
