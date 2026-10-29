-- Dokumen bersarang: a document can sit under another one of the same collection (the chapters
-- of a guide, SOP 01 to 06 under one parent). "parentId" is null for a top-level document, so
-- every existing document stays where it is. "position" orders the pages under one parent.
--
-- Additive. ADD COLUMN with a constant default does not rewrite the table (PostgreSQL 11+) and
-- the foreign key is checked against nothing but NULLs, but both take a brief lock on
-- "documents", hence the timeout. Deleting a parent leaves its children as top-level pages
-- (ON DELETE SET NULL); the application keeps them in the same collection and free of cycles
-- (src/lib/services/document-tree.ts). Code from before this migration never reads the columns,
-- so it is safe to roll back to.

-- Give up after 5 seconds instead of queueing every request behind a long transaction.
SET LOCAL lock_timeout = '5s';

ALTER TABLE "documents" ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "documents_parentId_idx" ON "documents"("parentId");

ALTER TABLE "documents" ADD CONSTRAINT "documents_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
