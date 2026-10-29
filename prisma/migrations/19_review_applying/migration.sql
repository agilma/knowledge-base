-- Persetujuan: a request being applied. Approving claims the request (PENDING to APPLYING) before the
-- change is written, so that no second request can be made for the document in between, and it becomes
-- APPROVED once written (or goes back to PENDING if writing fails). A new value of the enum made by
-- migration 18; in its own migration because a value added in a transaction cannot be used in it.
-- Additive; code from before this migration never writes the value.

-- AlterEnum
ALTER TYPE "ReviewStatus" ADD VALUE 'APPLYING';

