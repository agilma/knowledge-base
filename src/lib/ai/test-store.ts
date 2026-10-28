import type { AiAssistantKey, StoredMessage } from "../services/ai-conversations";
import { titleFrom } from "../services/ai-conversations";
import type { ConversationStore } from "./http";

interface Row {
  id: string;
  userId: string;
  assistant: string;
  title: string;
  documentId: string | null;
  updatedAt: Date;
  messages: StoredMessage[];
}

/** An in-memory store with the same ownership rule as the database one, for the handler tests. */
export function createTestStore() {
  const rows: Row[] = [];
  let n = 0;
  const store: ConversationStore = {
    async list(userId, assistant) {
      return rows
        .filter((r) => r.userId === userId && r.assistant === assistant)
        .map(({ id, title, updatedAt, documentId }) => ({ id, title, updatedAt, documentId }));
    },
    async get(userId, id) {
      const r = rows.find((x) => x.id === id && x.userId === userId);
      return r ? { id: r.id, assistant: r.assistant, title: r.title, documentId: r.documentId, messages: [...r.messages] } : null;
    },
    async create(userId, assistant: AiAssistantKey, first, documentId) {
      const row: Row = { id: `c${++n}`, userId, assistant, title: titleFrom(first), documentId: documentId ?? null, updatedAt: new Date(), messages: [{ role: "user", content: first }] };
      rows.push(row);
      return { id: row.id, title: row.title };
    },
    async append(userId, id, message) {
      const r = rows.find((x) => x.id === id && x.userId === userId);
      if (!r) return false;
      r.messages.push(message);
      r.updatedAt = new Date();
      return true;
    },
    async rename(userId, id, title) {
      const r = rows.find((x) => x.id === id && x.userId === userId);
      if (r) r.title = titleFrom(title);
      return !!r;
    },
    async dropLastProposal(userId, id) {
      const r = rows.find((x) => x.id === id && x.userId === userId);
      if (!r) return false;
      const last = [...r.messages].reverse().find((m) => m.proposal !== undefined);
      if (last) {
        delete last.proposal;
        delete last.warnings;
      }
      return true;
    },
    async remove(userId, id) {
      const i = rows.findIndex((x) => x.id === id && x.userId === userId);
      if (i >= 0) rows.splice(i, 1);
      return i >= 0;
    },
  };
  return { store, rows };
}
