import { z } from "zod";
import { DocumentType } from "@prisma/client";

/**
 * Limits on what one request may carry. Anything over is refused with a
 * message, never cut: a silently shortened source would produce a document
 * that looks complete and is not.
 */
export const LIMITS = {
  turns: 30,
  messageChars: 20_000,
  totalChars: 60_000,
  formContentChars: 100_000,
  /** Smaller than the form: a proposal is sent back with the next message, and must fit beside it. */
  proposalContentChars: 40_000,
} as const;

export const TOO_LONG_MESSAGE =
  "Bahan terlalu panjang untuk satu percakapan. Persingkat bahan atau mulai percakapan baru.";

const formContextSchema = z.object({
  title: z.string().max(300),
  slug: z.string().max(200),
  collectionSlug: z.string().max(200),
  type: z.nativeEnum(DocumentType),
  excerpt: z.string().max(1000),
  /** Omitted by the client while the form still holds only the untouched template. */
  content: z.string().max(LIMITS.formContentChars).optional(),
});

/**
 * One turn from the browser. The history is not sent: the server keeps it (a chat
 * is stored per user), so the browser can neither rewrite what was said earlier
 * nor skip the size limits by sending less.
 */
export const chatRequestSchema = z.object({
  /** Absent on the first message of a new chat. */
  conversationId: z.string().min(1).max(64).optional(),
  /** The document being edited, kept only as context for the history list. */
  documentId: z.string().min(1).max(64).optional(),
  message: z.string().min(1).max(LIMITS.messageChars),
  form: formContextSchema,
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

/** The stored history as the model should see it; null when it no longer fits and a new chat is needed. */
export function checkHistorySize(messages: { content: string }[]): string | null {
  if (messages.length > LIMITS.turns) return TOO_LONG_MESSAGE;
  const total = messages.reduce((n, m) => n + m.content.length, 0);
  return total > LIMITS.totalChars ? TOO_LONG_MESSAGE : null;
}

export interface AssistantRequest {
  messages: { role: "user" | "assistant"; content: string }[];
  form: FormContext;
}
export type FormContext = z.infer<typeof formContextSchema>;

/** What the model may propose; checked again here because strict tool schemas cannot express lengths. */
export const proposalSchema = z.object({
  title: z.string().min(3).max(150),
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  collection_slug: z.string().min(1).max(200),
  type: z.nativeEnum(DocumentType),
  excerpt: z.string().max(300),
  content: z.string().min(1).max(LIMITS.proposalContentChars),
});

export type Proposal = z.infer<typeof proposalSchema>;
