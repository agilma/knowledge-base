-- AI chat history: two new tables and nothing else.
--
-- Additive only: no existing table is altered and no existing row is read or changed
-- (the foreign keys point at "users" and "documents" but add no column to them), so
-- the code deployed before this keeps working and is safe to roll back to; the new
-- tables would simply sit unused.
--
-- Locks: the three foreign keys take SHARE ROW EXCLUSIVE locks on "users" and
-- "documents" while they check the new, empty tables, which is instant; writes to
-- those tables wait for that moment, reads are not blocked.
--
-- Deleting a user deletes their chats (CASCADE); deleting a document keeps the chat
-- and clears only the pointer to it (SET NULL). Retention (90 days) is enforced by
-- the application, which deletes by "updatedAt" using ai_conversations_updatedAt_idx.
--
-- Prisma wraps this file in a transaction; it contains no statement that cannot run
-- inside one. Generated with `prisma migrate diff` from the previous schema to
-- schema.prisma, so a later diff reports no drift.

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assistant" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "proposal" JSONB,
    "warnings" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_conversations_userId_assistant_updatedAt_idx" ON "ai_conversations"("userId", "assistant", "updatedAt");

-- CreateIndex
CREATE INDEX "ai_conversations_updatedAt_idx" ON "ai_conversations"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ai_messages_conversationId_seq_key" ON "ai_messages"("conversationId", "seq");

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

