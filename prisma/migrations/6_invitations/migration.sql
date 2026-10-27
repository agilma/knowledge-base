-- Invitations: emails an admin lets in, with the role they get on first sign-in.
--
-- Additive only: one new table with a unique index on its own columns. It has no
-- foreign key to "users" (the inviter is kept as plain text), so nothing existing is
-- locked, read or changed, and the code deployed before this, which does not know the
-- table, keeps working, so it is safe to roll back to. Prisma wraps the file in a
-- transaction; nothing here needs to run outside one.

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitations_email_key" ON "invitations"("email");
