-- Masukan pembaca: a reader's note on a document ("Ada yang kurang jelas?"), the replies to it, and
-- whether an editor has dealt with it. One new table, no change to an existing one, so code from
-- before this migration neither reads nor needs it and is safe to roll back to. The keys cascade:
-- deleting a document or a thread takes its comments, deleting an author leaves the comment
-- without a name (SET NULL).

SET LOCAL lock_timeout = '5s';

-- CreateTable
CREATE TABLE "document_comments" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "authorId" TEXT,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_comments_documentId_createdAt_idx" ON "document_comments"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "document_comments_parentId_idx" ON "document_comments"("parentId");

-- CreateIndex
CREATE INDEX "document_comments_authorId_createdAt_idx" ON "document_comments"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "document_comments_resolved_createdAt_idx" ON "document_comments"("resolved", "createdAt");

-- AddForeignKey
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "document_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

