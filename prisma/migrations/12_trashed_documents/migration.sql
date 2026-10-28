-- Tempat sampah: "Hapus" no longer destroys a document. Its row, its versions, its members and its
-- links are written here as one JSON snapshot and then removed from "documents", so every query that
-- reads documents (search, lists, counts, exports, access rules) keeps working untouched and a
-- trashed document can never leak through one of them. Restoring writes the snapshot back.
-- Kept 30 days, then purged by the application.
--
-- Additive: one new table, no foreign keys (the document it came from no longer exists, and the
-- people and collection named in it may be gone by the time it is restored; restore checks).
-- Code from before this migration never touches the table, so it is safe to roll back to.

CREATE TABLE "trashed_documents" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "collectionName" TEXT NOT NULL,
    "deletedById" TEXT,
    "deletedByName" TEXT,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "trashed_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trashed_documents_documentId_key" ON "trashed_documents"("documentId");

CREATE INDEX "trashed_documents_deletedAt_idx" ON "trashed_documents"("deletedAt");
