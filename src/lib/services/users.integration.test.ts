import { test, after } from "node:test";
import assert from "node:assert/strict";
import { Role } from "@prisma/client";
import { db } from "../db";
import { inviteUser, listUsers, revokeInvitation, setUserRole } from "./users";
import { ADMIN, READER } from "./test-viewers";

/**
 * Against a real database: the invitation row, the role change and the revoke
 * (which also ends sessions) are only meaningful together. Skipped in CI, which
 * has no database.
 *
 *   KB_DB_TESTS=1 DATABASE_URL=postgresql://... npm test
 */
const enabled = process.env.KB_DB_TESTS === "1";
const tag = `usr${Date.now()}`;
const email = (name: string) => `${tag}-${name}@x.test`;
const created = { users: [] as string[] };

async function user(name: string, role: Role = Role.VIEWER) {
  const u = await db.user.create({ data: { email: email(name), name, role } });
  created.users.push(u.id);
  return u;
}

after(async () => {
  if (!enabled) return;
  await db.session.deleteMany({ where: { userId: { in: created.users } } });
  await db.user.deleteMany({ where: { id: { in: created.users } } });
  await db.invitation.deleteMany({ where: { email: { startsWith: `${tag}-` } } });
  await db.$disconnect();
});

test("only an admin can invite, change roles or revoke", { skip: !enabled }, async () => {
  const target = await user("t1");
  await assert.rejects(inviteUser({ email: email("x"), role: "EDITOR" }, READER), /admin/);
  await assert.rejects(setUserRole(target.id, "EDITOR", READER), /admin/);
  await assert.rejects(revokeInvitation(email("x"), READER), /admin/);
  await assert.rejects(listUsers(READER), /admin/);
});

test("an invitation waits with its role, and inviting again changes the role", { skip: !enabled }, async () => {
  await inviteUser({ email: ` ${email("Lala").toUpperCase()} `, role: "EDITOR" }, ADMIN);
  let row = await db.invitation.findUnique({ where: { email: email("lala") } });
  assert.equal(row?.role, Role.EDITOR);

  await inviteUser({ email: email("lala"), role: "VIEWER" }, ADMIN);
  row = await db.invitation.findUnique({ where: { email: email("lala") } });
  assert.equal(row?.role, Role.VIEWER);
  assert.equal(await db.invitation.count({ where: { email: email("lala") } }), 1);

  const { pending } = await listUsers(ADMIN);
  assert.ok(pending.some((p) => p.email === email("lala")));
});

test("bad emails and roles are refused", { skip: !enabled }, async () => {
  await assert.rejects(inviteUser({ email: "bukan-email", role: "EDITOR" }, ADMIN), /tidak valid/);
  await assert.rejects(inviteUser({ email: email("r"), role: "BOGUS" }, ADMIN), /tidak valid/);
  await assert.rejects(inviteUser({ email: undefined, role: "EDITOR" }, ADMIN));
  assert.equal(await db.invitation.count({ where: { email: email("r") } }), 0);
});

test("an address that already has an account is not invited again", { skip: !enabled }, async () => {
  await user("exists");
  await assert.rejects(inviteUser({ email: email("exists"), role: "EDITOR" }, ADMIN), /sudah punya akun/);
});

test("a role change applies, and is refused for yourself, the unknown and bad roles", { skip: !enabled }, async () => {
  const target = await user("t2");
  await setUserRole(target.id, "EDITOR", ADMIN);
  assert.equal((await db.user.findUnique({ where: { id: target.id } }))?.role, Role.EDITOR);

  await assert.rejects(setUserRole(target.id, "ROOT", ADMIN), /tidak valid/);
  await assert.rejects(setUserRole("tidak-ada", "EDITOR", ADMIN), /tidak ditemukan/);
  await assert.rejects(setUserRole(ADMIN.id, "VIEWER", ADMIN), /sendiri/);
});

test("an admin named in AUTH_ADMIN_EMAILS cannot be changed or revoked here", { skip: !enabled }, async () => {
  const boss = await user("boss", Role.ADMIN);
  const previous = process.env.AUTH_ADMIN_EMAILS;
  process.env.AUTH_ADMIN_EMAILS = email("boss");
  try {
    await assert.rejects(setUserRole(boss.id, "VIEWER", ADMIN), /AUTH_ADMIN_EMAILS/);
    await assert.rejects(revokeInvitation(email("boss"), ADMIN), /AUTH_ADMIN_EMAILS/);
    assert.equal((await listUsers(ADMIN)).users.find((u) => u.id === boss.id)?.locked, true);
  } finally {
    if (previous === undefined) delete process.env.AUTH_ADMIN_EMAILS;
    else process.env.AUTH_ADMIN_EMAILS = previous;
  }
});

test("revoking removes the invitation and ends the person's sessions but keeps the account", { skip: !enabled }, async () => {
  await inviteUser({ email: email("gone"), role: "EDITOR" }, ADMIN);
  const gone = await user("gone", Role.EDITOR);
  await db.session.create({
    data: { sessionToken: `${tag}-tok`, userId: gone.id, expires: new Date(Date.now() + 86_400_000) },
  });

  await revokeInvitation(email("gone"), ADMIN);

  assert.equal(await db.invitation.count({ where: { email: email("gone") } }), 0);
  assert.equal(await db.session.count({ where: { userId: gone.id } }), 0);
  assert.ok(await db.user.findUnique({ where: { id: gone.id } }), "the account must stay");
  await assert.rejects(revokeInvitation(email("gone"), ADMIN), /tidak ditemukan/);
});

test("a pending invitation can be withdrawn", { skip: !enabled }, async () => {
  await inviteUser({ email: email("never"), role: "VIEWER" }, ADMIN);
  await revokeInvitation(email("never"), ADMIN);
  assert.equal(await db.invitation.count({ where: { email: email("never") } }), 0);
});
