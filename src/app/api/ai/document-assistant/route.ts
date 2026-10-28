import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { getCollections } from "@/lib/services/collections";
import { getDocumentBySlug, searchDocuments } from "@/lib/services/documents";
import { createRateLimiter } from "@/lib/ai/rate-limit";
import { handleAssistantRequest } from "@/lib/ai/handler";
import type { AssistantClient } from "@/lib/ai/assistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Opus with thinking and a long document can run for minutes.
export const maxDuration = 300;

const rateLimit = createRateLimiter({ limit: 20, windowMs: 10 * 60 * 1000 });

export async function POST(request: Request) {
  return handleAssistantRequest(request, {
    getUser: async () => {
      const session = await auth();
      return session?.user ? { id: session.user.id, role: session.user.role } : null;
    },
    createClient: () => {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      return apiKey ? (new Anthropic({ apiKey }) as unknown as AssistantClient) : undefined;
    },
    rateLimit,
    assistant: {
      getCollections: (viewer) => getCollections(viewer),
      searchDocuments: async (query, viewer) =>
        (await searchDocuments(query, { viewer, includeDrafts: true })).results,
      getDocument: (slug, viewer) => getDocumentBySlug(slug, { viewer, includeDrafts: true }),
    },
  });
}
