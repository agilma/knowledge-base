-- Search reads a stored vector instead of recomputing it for every row.
--
-- Measured on 20,000 documents of about 6 KB: a search for a word that is in almost
-- every document (a common word in a POS knowledge base) took 11.6 s, because the
-- planner cannot use the expression index when most rows match and recomputed the
-- vector for each of them. Reading a stored column takes it to 0.2 s.
--
-- The column is GENERATED ... STORED, so the database keeps it in step with the text
-- and the application never writes it. Its expression is the same one the older
-- expression index uses (src/lib/search-query.ts, SEARCH_VECTOR_SQL; a test keeps the
-- two equal).
--
-- Additive, with two costs worth knowing:
--  * ADD COLUMN ... GENERATED STORED rewrites the whole table while holding an ACCESS
--    EXCLUSIVE lock (reads and writes of "documents" wait). It takes roughly 50 s for
--    20,000 documents and next to nothing for a few hundred, which is why it is done
--    while the table is small.
--  * The table roughly doubles in size (58 MB to 117 MB at 20,000 documents). The older
--    index "documents_search_idx" is kept on purpose so code from before this migration
--    still has its index if this is rolled back; drop it in a later migration once
--    nothing older is deployed.
--
-- The code deployed before this migration neither knows the column nor needs it, so it is
-- safe to roll back to. Prisma wraps the file in a transaction; every statement can run
-- inside one (the indexes are built without CONCURRENTLY for that reason, which is fine
-- at this size).

-- AlterTable
ALTER TABLE "documents" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    (setweight(to_tsvector('indonesian', coalesce(title, '')), 'A') || setweight(to_tsvector('indonesian', coalesce(excerpt, '')), 'B') || setweight(to_tsvector('indonesian', left(content, 200000)), 'C'))
  ) STORED;

-- CreateIndex
CREATE INDEX "documents_search_vector_idx" ON "documents" USING GIN ("search_vector");

-- CreateIndex
CREATE INDEX "documents_updatedAt_idx" ON "documents"("updatedAt" DESC);
