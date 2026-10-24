-- Revision history and "last edited by" for documents.
--
-- Additive only: one nullable column (a catalog change, no table rewrite), one
-- new table, and the foreign keys and indexes that go with them. Nothing in
-- existing rows is read or changed, and the code deployed before this (which
-- knows neither the column nor the table) keeps working, so it is safe to roll
-- back to.
--
-- Locks: the foreign key on "documents" takes a SHARE ROW EXCLUSIVE lock on
-- "documents" and "users" while it checks existing rows (every new
-- "lastEditedById" is NULL, so the check is trivial). Writes to those two tables
-- wait for the instant that takes; reads are not blocked. Existing documents get
-- no revision here: the first save after this snapshots the prior state in code.
--
-- Prisma wraps this file in a transaction; it contains no statement that cannot
-- run inside one. Generated with `prisma migrate diff` from the migrations
-- directory to schema.prisma, so a later diff reports no drift.

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "lastEditedById" TEXT;

-- CreateTable
CREATE TABLE "document_revisions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL,
    "editedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_revisions_editedById_idx" ON "document_revisions"("editedById");

-- CreateIndex
CREATE UNIQUE INDEX "document_revisions_documentId_version_key" ON "document_revisions"("documentId", "version");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_revisions" ADD CONSTRAINT "document_revisions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_revisions" ADD CONSTRAINT "document_revisions_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

