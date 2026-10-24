-- Restricted collections: a flag on "collections" and the list of users allowed in.
--
-- Additive only: one NOT NULL column with a constant default (PostgreSQL 11 and
-- later add it as a catalog change without rewriting the table, so every existing
-- collection becomes unrestricted, exactly as it behaves today), one new table, and
-- the index and foreign keys that go with it. Nothing in existing rows is read or
-- changed, and the code deployed before this (which knows neither the column nor
-- the table) keeps working, so it is safe to roll back to.
--
-- Locks: adding the column takes a brief ACCESS EXCLUSIVE lock on "collections" (a
-- small table). The two foreign keys take SHARE ROW EXCLUSIVE locks on
-- "collections" and "users" while they check the new, empty table, which is
-- instant; writes to those tables wait for that moment, reads are not blocked.
--
-- Prisma wraps this file in a transaction; it contains no statement that cannot
-- run inside one. Generated with `prisma migrate diff` from the migrations
-- directory to schema.prisma, so a later diff reports no drift.


-- AlterTable
ALTER TABLE "collections" ADD COLUMN     "restricted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "collection_members" (
    "collectionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_members_pkey" PRIMARY KEY ("collectionId","userId")
);

-- CreateIndex
CREATE INDEX "collection_members_userId_idx" ON "collection_members"("userId");

-- AddForeignKey
ALTER TABLE "collection_members" ADD CONSTRAINT "collection_members_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_members" ADD CONSTRAINT "collection_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
