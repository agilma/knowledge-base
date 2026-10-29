-- Templat tersimpan: remember which document a template was copied from, so an admin can tell when that
-- document has since been restricted (the copy then shows what the document no longer lets everyone
-- read). One nullable column on the table made by migration 16; existing rows stay without a source.
-- Added in its own migration because 16 may already be applied where this branch was built.
-- Deleting the source document leaves the template without one (SET NULL).

SET LOCAL lock_timeout = '5s';

-- AlterTable
ALTER TABLE "document_templates" ADD COLUMN     "sourceDocumentId" TEXT;

-- CreateIndex
CREATE INDEX "document_templates_sourceDocumentId_idx" ON "document_templates"("sourceDocumentId");

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

