import * as conversations from "../services/ai-conversations";
import type { ConversationStore } from "./http";

/** The database-backed store the routes use; tests pass a fake with the same shape. */
export const conversationStore: ConversationStore = {
  list: conversations.listConversations,
  get: conversations.getConversation,
  create: conversations.createConversation,
  append: conversations.appendMessage,
  rename: conversations.renameConversation,
  remove: conversations.deleteConversation,
};
