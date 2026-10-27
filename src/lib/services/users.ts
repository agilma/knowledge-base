import { Role } from "@prisma/client";
import { db } from "../db";
import type { Viewer } from "../collection-access";
import { isAdminEmail, readAccessConfig } from "../auth/access";
import { inviteSchema } from "../auth/invite";

function assertAdmin(actor: Viewer) {
  if (actor.role !== Role.ADMIN) throw new Error("Hanya admin yang boleh mengelola pengguna");
}

const ALREADY_REGISTERED = "Email ini sudah punya akun. Ubah perannya di daftar pengguna.";

/**
 * Everyone with an account, plus invitations nobody has used yet. `invited` marks
 * an account whose way in is an invitation (so it can be withdrawn), `locked` an
 * admin named in AUTH_ADMIN_EMAILS, whose role is restored at every sign-in and
 * so cannot be changed here.
 */
export async function listUsers(actor: Viewer) {
  assertAdmin(actor);
  const access = readAccessConfig();
  const [users, invitations] = await Promise.all([
    db.user.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 500,
      select: { id: true, email: true, name: true, role: true },
    }),
    db.invitation.findMany({ orderBy: [{ createdAt: "desc" }], take: 500 }),
  ]);
  const invitedEmails = new Set(invitations.map((i) => i.email));
  const registered = new Set(users.map((u) => u.email.toLowerCase()));
  return {
    users: users.map((u) => ({
      ...u,
      invited: invitedEmails.has(u.email.toLowerCase()),
      locked: isAdminEmail(u.email, access),
    })),
    pending: invitations
      .filter((i) => !registered.has(i.email))
      .map((i) => ({ id: i.id, email: i.email, role: i.role, createdAt: i.createdAt })),
  };
}

/**
 * Lets an email in with a role. Nobody is emailed: the person signs in with that
 * Google account and gets the role at first sign-in. Inviting an address that is
 * already waiting changes its role.
 */
export async function inviteUser(input: { email: unknown; role: unknown }, actor: Viewer) {
  assertAdmin(actor);
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Permintaan tidak valid");
  const { email, role } = parsed.data;

  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new Error(ALREADY_REGISTERED);
  }
  return db.invitation.upsert({
    where: { email },
    create: { email, role, invitedById: actor.id },
    update: { role, invitedById: actor.id },
    select: { id: true, email: true, role: true },
  });
}

export async function setUserRole(userId: unknown, role: unknown, actor: Viewer) {
  assertAdmin(actor);
  if (typeof userId !== "string" || !userId) throw new Error("Permintaan tidak valid");
  if (typeof role !== "string" || !(role in Role)) throw new Error("Peran tidak valid");
  if (userId === actor.id) throw new Error("Anda tidak bisa mengubah peran Anda sendiri");

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true } });
  if (!user) throw new Error("Pengguna tidak ditemukan");
  if (isAdminEmail(user.email, readAccessConfig())) {
    throw new Error("Admin ini ditetapkan lewat AUTH_ADMIN_EMAILS; ubah di pengaturan environment");
  }
  if (user.role === role) return user;
  return db.user.update({ where: { id: userId }, data: { role: role as Role }, select: { id: true, email: true, role: true } });
}

/**
 * Withdraws an invitation. If the person already signed in, their sessions end
 * too, so the next sign-in is refused (unless the domain or AUTH_ALLOWED_EMAILS
 * still admits them). Their account and what they wrote stay.
 */
export async function revokeInvitation(email: unknown, actor: Viewer) {
  assertAdmin(actor);
  if (typeof email !== "string" || !email) throw new Error("Permintaan tidak valid");
  const normalized = email.trim().toLowerCase();
  if (isAdminEmail(normalized, readAccessConfig())) {
    throw new Error("Admin ini ditetapkan lewat AUTH_ADMIN_EMAILS; ubah di pengaturan environment");
  }
  const user = await db.user.findUnique({ where: { email: normalized }, select: { id: true } });
  if (user && user.id === actor.id) throw new Error("Anda tidak bisa mencabut akses Anda sendiri");

  await db.$transaction(async (tx) => {
    const removed = await tx.invitation.deleteMany({ where: { email: normalized } });
    if (removed.count === 0) throw new Error("Undangan tidak ditemukan");
    if (user) await tx.session.deleteMany({ where: { userId: user.id } });
  });
}
