import { auth } from "@/auth";
import { conversationStore } from "@/lib/ai/store";
import { handleConversationRequest } from "@/lib/ai/conversations-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

async function getUser() {
  const session = await auth();
  return session?.user ? { id: session.user.id, role: session.user.role } : null;
}

async function handle(request: Request, { params }: Context) {
  const { id } = await params;
  return handleConversationRequest(request, id, { getUser, store: conversationStore });
}

export const GET = handle;
export const PATCH = handle;
export const DELETE = handle;
