-- "Mungkin maksud Anda": when a search finds nothing, suggest documents whose title looks like
-- what was typed (a misspelling such as "kasr" for "kasir"). pg_trgm compares three-letter
-- pieces of words, which is what makes a typo still similar. Only titles are compared, so the
-- index stays small.
--
-- Additive. CREATE EXTENSION needs the right to create extensions (the owner role on Neon
-- has it; pg_trgm is a standard contrib extension). CREATE INDEX without CONCURRENTLY
-- blocks writes to "documents" while it builds, which takes well under a second for titles
-- of tens of thousands of rows. Code from before this migration neither knows nor needs the
-- index, so it is safe to roll back to.

-- Give up after 5 seconds instead of queueing every request behind a long transaction.
SET LOCAL lock_timeout = '5s';

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "documents_title_trgm_idx" ON "documents" USING GIN ("title" gin_trgm_ops);
