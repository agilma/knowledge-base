import { auth } from "@/auth";
import { conversationStore } from "@/lib/ai/store";
import { handleConversationRequest } from "@/lib/ai/conversations-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleConversationRequest(request, null, { getUser, store: conversationStore });
}

async function getUser() {
  const session = await auth();
  return session?.user ? { id: session.user.id, role: session.user.role } : null;
}
