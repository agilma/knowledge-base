import { Role } from "@prisma/client";
import type { Viewer } from "../collection-access";

/** Fixed identities for the database tests; the ids need not exist in `users`. */
export const ADMIN: Viewer = { id: "test-admin", role: Role.ADMIN };
/** A signed-in reader who belongs to no restricted collection. */
export const READER: Viewer = { id: "test-reader", role: Role.VIEWER };
