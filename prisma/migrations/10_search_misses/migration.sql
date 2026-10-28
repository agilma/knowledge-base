-- Searches that found nothing, counted per phrase, so an editor can see which topics are missing.
--
-- Additive only: one new table and one index, no change to any existing table or row, so the
-- code deployed before this keeps working and is safe to roll back to (the table would sit
-- unused). No foreign keys, hence no locks on other tables. The phrase is the primary key and is
-- stored normalised (lower case, letters and digits, single spaces); no user is recorded.
-- The application deletes rows after 180 days and keeps at most a fixed number, using
-- search_misses_lastAt_idx.
--
-- Prisma wraps this file in a transaction; every statement can run inside one. Generated with
-- `prisma migrate diff` from the previous schema to schema.prisma, so a later diff reports no drift.

-- CreateTable
CREATE TABLE "search_misses" (
    "query" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "firstAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_misses_pkey" PRIMARY KEY ("query")
);

-- CreateIndex
CREATE INDEX "search_misses_lastAt_idx" ON "search_misses"("lastAt");

