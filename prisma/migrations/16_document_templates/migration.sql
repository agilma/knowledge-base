-- Templat tersimpan: a document kept as a starting point for new ones. One new table, no change to
-- an existing one, so code from before this migration neither reads nor needs it and is safe to
-- roll back to. Deleting a user leaves their templates without a creator (SET NULL).
--
-- "type" is text, not the DocumentType enum: Prisma applies migration folders in alphabetical order
-- ("16_" before "2_"), and a column of that type would make migration 2, which rebuilds the enum,
-- fail on a database made from scratch. The application only writes valid names.

SET LOCAL lock_timeout = '5s';

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PANDUAN',
    "content" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_templates_name_key" ON "document_templates"("name");

-- CreateIndex
CREATE INDEX "document_templates_createdById_idx" ON "document_templates"("createdById");

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

