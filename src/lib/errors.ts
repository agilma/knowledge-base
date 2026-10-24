import { Prisma } from "@prisma/client";

/**
 * The message a server action may show the person who called it.
 *
 * Errors the services throw on purpose carry a sentence written for the user
 * and pass through. Anything the database driver raised is a description of a
 * query (model, arguments, constraint names), which says more than the caller
 * should learn, so it is replaced by `fallback`.
 */
export function userMessage(err: unknown, fallback: string): string {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientValidationError ||
    err instanceof Prisma.PrismaClientUnknownRequestError ||
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError
  ) {
    return fallback;
  }
  return err instanceof Error && err.message ? err.message : fallback;
}
