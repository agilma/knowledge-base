-- Alur persetujuan dan kunci dokumen: a collection can require an admin's approval before a document is
-- published or a published one is changed; a document can be locked so only an admin may change it.
--  * "collections"."requiresApproval" and "documents"."locked": two boolean columns with a constant default
--    (no table rewrite on PostgreSQL 11+), false for everything that exists, so nothing changes until an
--    admin turns it on.
--  * "document_reviews": the requests, with the proposed text of a change; new enum types of their own
--    (nothing here depends on an enum made by an earlier migration: Prisma runs the folders in
--    alphabetical order, "18_" before "2_").
-- Additive. Code from before this migration neither reads nor needs any of it, so it is safe to roll back to.

SET LOCAL lock_timeout = '5s';

-- CreateEnum
CREATE TYPE "ReviewKind" AS ENUM ('PUBLISH', 'CHANGE');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- AlterTable
ALTER TABLE "collections" ADD COLUMN     "requiresApproval" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "locked" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "document_reviews" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "kind" "ReviewKind" NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "proposal" JSONB,
    "note" TEXT,
    "requestedById" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_reviews_documentId_createdAt_idx" ON "document_reviews"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "document_reviews_status_createdAt_idx" ON "document_reviews"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "document_reviews" ADD CONSTRAINT "document_reviews_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_reviews" ADD CONSTRAINT "document_reviews_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_reviews" ADD CONSTRAINT "document_reviews_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

