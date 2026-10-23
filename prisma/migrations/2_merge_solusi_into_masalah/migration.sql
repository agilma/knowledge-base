-- Merge SOLUSI into MASALAH.
--
-- The two described the same artifact: a support document is a symptom and the
-- handling for it together, so forcing a choice between them produced either
-- arbitrary filing (the seeded document is titled "Panduan ..." and filed as
-- "Masalah") or one piece of knowledge split across two half-documents.
--
-- The rows have to move off SOLUSI before the type can be rebuilt without it;
-- Postgres cannot drop a value from an enum in place.

UPDATE "documents" SET "type" = 'MASALAH' WHERE "type" = 'SOLUSI';

CREATE TYPE "DocumentType_new" AS ENUM ('PANDUAN', 'MASALAH', 'REFERENSI');

ALTER TABLE "documents" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "documents"
  ALTER COLUMN "type" TYPE "DocumentType_new"
  USING ("type"::text::"DocumentType_new");

ALTER TYPE "DocumentType" RENAME TO "DocumentType_old";
ALTER TYPE "DocumentType_new" RENAME TO "DocumentType";
DROP TYPE "DocumentType_old";

ALTER TABLE "documents" ALTER COLUMN "type" SET DEFAULT 'PANDUAN';
