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

export const requestSchema = z
  .object({
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().min(1).max(LIMITS.messageChars),
        }),
      )
      .min(1)
      .max(LIMITS.turns),
    form: formContextSchema,
  })
  .refine((v) => v.messages[0].role === "user" && v.messages[v.messages.length - 1].role === "user", {
    message: "Percakapan harus diawali dan diakhiri oleh pesan Anda",
  })
  .refine((v) => v.messages.reduce((n, m) => n + m.content.length, 0) <= LIMITS.totalChars, {
    message: TOO_LONG_MESSAGE,
  });

export type AssistantRequest = z.infer<typeof requestSchema>;
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
  content: z.string().min(1).max(LIMITS.formContentChars),
});

export type Proposal = z.infer<typeof proposalSchema>;
