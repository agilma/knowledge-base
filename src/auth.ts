import NextAuth, { DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { parseAuthEnv } from "@/lib/env";
import { isAdminEmail, isEmailAllowed, readAccessConfig } from "@/lib/auth/access";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
  }
}

// `next build` evaluates this module without the runtime secrets; only the
// running app needs them.
function getGoogleCredentials(): { clientId?: string; clientSecret?: string } {
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
    return {
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    };
  }
  const env = parseAuthEnv(process.env);
  return { clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET };
}

function getAuthSecret(): string {
  if (process.env.AUTH_SECRET) {
    return process.env.AUTH_SECRET;
  }
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
    return "build-phase-placeholder-secret-do-not-use-in-production";
  }
  throw new Error(
    "AUTH_SECRET environment variable is missing. Please set AUTH_SECRET in your environment variables."
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    Google(getGoogleCredentials()),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const email = user.email.toLowerCase();

      const access = readAccessConfig();

      // The env lists and the domain admit people in bulk; an admin's invitation
      // admits one address (see /admin/users).
      if (!isEmailAllowed(email, access)) {
        const invitation = await db.invitation.findUnique({ where: { email }, select: { id: true } });
        if (!invitation) return "/login?error=DomainAccessDenied";
      }

      // Check and update role to ADMIN if email is listed in AUTH_ADMIN_EMAILS
      if (isAdminEmail(email, access)) {
        try {
          const existingUser = await db.user.findUnique({
            where: { email },
            select: { id: true, role: true },
          });

          if (existingUser && existingUser.role !== Role.ADMIN) {
            await db.user.update({
              where: { id: existingUser.id },
              data: { role: Role.ADMIN },
            });
          }
        } catch (error) {
          console.error("Error bootstrapping admin role on signIn:", error);
        }
      }

      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = (user as { role?: Role }).role || Role.VIEWER;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email) return;
      const email = user.email.toLowerCase();

      try {
        if (isAdminEmail(email, readAccessConfig())) {
          await db.user.update({ where: { id: user.id }, data: { role: Role.ADMIN } });
        } else {
          const invitation = await db.invitation.findUnique({ where: { email }, select: { role: true } });
          if (invitation) await db.user.update({ where: { id: user.id }, data: { role: invitation.role } });
        }
      } catch (error) {
        console.error("Error setting role on createUser:", error);
      }
    },
  },
  secret: getAuthSecret(),
});
