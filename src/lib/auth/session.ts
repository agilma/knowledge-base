import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { cache } from "react";

// `auth()` hits the sessions + users tables on every call, and a single render
// resolves it several times (proxy, layout, page). `cache` collapses those into
// one lookup per request.
export const getSession = cache(async () => auth());

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireRole(allowedRoles: Role | Role[]) {
  const user = await requireUser();
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!roles.includes(user.role)) {
    // Sending a VIEWER to "/" looked like a bug; say that it is a permission.
    redirect("/akses-ditolak");
  }

  return user;
}
