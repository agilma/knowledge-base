-- Restricted documents: a flag on "documents" and the list of users allowed in.
--
-- Additive only: one NOT NULL column with a constant default (PostgreSQL 11 and
-- later add it as a catalog change without rewriting the table, so every existing
-- document stays open, exactly as it behaves today), one new table, and the index
-- and foreign keys that go with it. Nothing in existing rows is read or changed,
-- and the code deployed before this (which knows neither the column nor the table)
-- keeps working, so it is safe to roll back to.
--
-- Locks: adding the column takes a brief ACCESS EXCLUSIVE lock on "documents". The
-- two foreign keys take SHARE ROW EXCLUSIVE locks on "documents" and "users" while
-- they check the new, empty table, which is instant; writes to those tables wait for
-- that moment, reads are not blocked.
--
-- Prisma wraps this file in a transaction; it contains no statement that cannot run
-- inside one. Generated with `prisma migrate diff` from the migrations directory to
-- schema.prisma, so a later diff reports no drift.

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "restricted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "document_members" (
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_members_pkey" PRIMARY KEY ("documentId","userId")
);

-- CreateIndex
CREATE INDEX "document_members_userId_idx" ON "document_members"("userId");

-- AddForeignKey
ALTER TABLE "document_members" ADD CONSTRAINT "document_members_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_members" ADD CONSTRAINT "document_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
