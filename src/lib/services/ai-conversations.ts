import { Prisma } from "@prisma/client";
import { db } from "../db";

/** The assistants that keep a history. Each has its own list for a user. */
export const AI_ASSISTANTS = ["document"] as const;
export type AiAssistantKey = (typeof AI_ASSISTANTS)[number];

import { RETENTION_DAYS } from "../ai/retention";

export { RETENTION_DAYS };
export const LIST_LIMIT = 30;
export const TITLE_MAX = 80;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

/**
 * Chats are private to the person who had them. There is no admin path here on
 * purpose: every function takes the owner's id and puts it in the `where`, so a
 * conversation that is not yours is indistinguishable from one that does not exist.
 */
export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  proposal?: unknown;
  warnings?: string[];
  error?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: Date;
  documentId: string | null;
}

export function isAssistantKey(value: unknown): value is AiAssistantKey {
  return typeof value === "string" && (AI_ASSISTANTS as readonly string[]).includes(value);
}

/** The first words of the first message, on one line, as the list's label. */
export function titleFrom(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (!oneLine) return "Percakapan baru";
  return oneLine.length > TITLE_MAX ? `${oneLine.slice(0, TITLE_MAX - 1).trimEnd()}…` : oneLine;
}

let lastPurge = 0;

/** Deletes chats nobody touched for the retention period. At most once an hour per instance, and never fails the caller. */
export async function purgeExpired(now = Date.now(), force = false): Promise<number> {
  if (!force && now - lastPurge < 60 * 60 * 1000) return 0;
  lastPurge = now;
  try {
    const { count } = await db.aiConversation.deleteMany({ where: { updatedAt: { lt: new Date(now - RETENTION_MS) } } });
    return count;
  } catch {
    return 0;
  }
}

export async function listConversations(userId: string, assistant: AiAssistantKey): Promise<ConversationSummary[]> {
  return db.aiConversation.findMany({
    where: { userId, assistant },
    orderBy: { updatedAt: "desc" },
    take: LIST_LIMIT,
    select: { id: true, title: true, updatedAt: true, documentId: true },
  });
}

export async function getConversation(userId: string, id: string) {
  const conversation = await db.aiConversation.findFirst({
    where: { id, userId },
    select: {
      id: true,
      assistant: true,
      title: true,
      documentId: true,
      updatedAt: true,
      messages: {
        orderBy: { seq: "asc" },
        select: { role: true, content: true, proposal: true, warnings: true, error: true },
      },
    },
  });
  if (!conversation) return null;
  return {
    ...conversation,
    messages: conversation.messages.map(
      (m): StoredMessage => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
        proposal: m.proposal ?? undefined,
        warnings: Array.isArray(m.warnings) ? (m.warnings as string[]) : undefined,
        error: m.error ?? undefined,
      }),
    ),
  };
}

/** Starts a chat with its first message in one step, so a chat never exists empty. */
export async function createConversation(
  userId: string,
  assistant: AiAssistantKey,
  firstMessage: string,
  documentId?: string,
): Promise<{ id: string; title: string }> {
  void purgeExpired();
  // A made-up id must not make the chat fail: it is only a hint for the list.
  const document = documentId ? await db.document.findUnique({ where: { id: documentId }, select: { id: true } }) : null;
  const title = titleFrom(firstMessage);
  const created = await db.aiConversation.create({
    data: {
      userId,
      assistant,
      title,
      documentId: document?.id ?? null,
      messages: { create: { seq: 1, role: "user", content: firstMessage } },
    },
    select: { id: true },
  });
  return { id: created.id, title };
}

/** Adds a message to one of the user's own chats; false when it is not theirs. */
export async function appendMessage(userId: string, conversationId: string, message: StoredMessage): Promise<boolean> {
  return db.$transaction(async (tx) => {
    // Two requests on one chat must not both take the next position.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ai_conversation:${conversationId}`}))`;
    const owned = await tx.aiConversation.count({ where: { id: conversationId, userId } });
    if (owned === 0) return false;
    const last = await tx.aiMessage.aggregate({ where: { conversationId }, _max: { seq: true } });
    await tx.aiMessage.create({
      data: {
        conversationId,
        seq: (last._max.seq ?? 0) + 1,
        role: message.role,
        content: message.content,
        proposal: message.proposal === undefined ? Prisma.DbNull : (message.proposal as Prisma.InputJsonValue),
        warnings: message.warnings === undefined ? Prisma.DbNull : message.warnings,
        error: message.error ?? null,
      },
    });
    await tx.aiConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    return true;
  });
}

/** "Abaikan" on a proposal: it is removed from the chat, so it is neither shown again nor sent to the model. */
export async function dropLastProposal(userId: string, conversationId: string): Promise<boolean> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ai_conversation:${conversationId}`}))`;
    if ((await tx.aiConversation.count({ where: { id: conversationId, userId } })) === 0) return false;
    const last = await tx.aiMessage.findFirst({
      where: { conversationId, proposal: { not: Prisma.DbNull } },
      orderBy: { seq: "desc" },
      select: { id: true },
    });
    if (!last) return true;
    await tx.aiMessage.update({ where: { id: last.id }, data: { proposal: Prisma.DbNull, warnings: Prisma.DbNull } });
    return true;
  });
}

export async function renameConversation(userId: string, id: string, title: string): Promise<boolean> {
  const clean = titleFrom(title);
  const { count } = await db.aiConversation.updateMany({ where: { id, userId }, data: { title: clean } });
  return count > 0;
}

export async function deleteConversation(userId: string, id: string): Promise<boolean> {
  const { count } = await db.aiConversation.deleteMany({ where: { id, userId } });
  return count > 0;
}
