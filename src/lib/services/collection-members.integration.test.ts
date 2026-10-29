import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { Role } from "@prisma/client";
import { db } from "../db";
import type { Viewer } from "../collection-access";
import {
  createCollection,
  getCollectionMemberIds,
  getCollections,
  listAssignableUsers,
  setCollectionMembers,
  updateCollection,
} from "./collections";

/**
 * Who an admin can let into a restricted collection. Against a real database;
 * skipped in CI.
 *
 *   KB_DB_TESTS=1 DATABASE_URL=postgresql://... npm test
 */
const enabled = process.env.KB_DB_TESTS === "1";
const tag = `mem${Date.now()}`;
const T = { skip: !enabled };

const created = { users: [] as string[], collections: [] as string[] };
let admin: Viewer, editor: Viewer, ana: string, budi: string, citra: string;
let collectionId: string;

async function user(name: string, role: Role) {
  const row = await db.user.create({ data: { email: `${tag}-${name}@example.test`, name: `${name} ${tag}`, role } });
  created.users.push(row.id);
  return row.id;
}

before(async () => {
  if (!enabled) return;
  admin = { id: await user("admin", Role.ADMIN), role: Role.ADMIN };
  editor = { id: await user("editor", Role.EDITOR), role: Role.EDITOR };
  ana = await user("ana", Role.VIEWER);
  budi = await user("budi", Role.VIEWER);
  citra = await user("citra", Role.EDITOR);
  const col = await createCollection({
    name: `Koleksi ${tag}`,
    slug: `${tag}-col`,
    status: "ACTIVE",
    restricted: true,
    requiresApproval: false,
  });
  collectionId = col.id;
  created.collections.push(col.id);
});

after(async () => {
  if (!enabled) return;
  await db.collection.deleteMany({ where: { id: { in: created.collections } } });
  await db.user.deleteMany({ where: { id: { in: created.users } } });
  await db.$disconnect();
});

const members = async () => (await getCollectionMemberIds(collectionId, admin)).sort();

test("members are added, removed and left alone when nothing changes", T, async () => {
  await setCollectionMembers(collectionId, [ana, budi], admin);
  assert.deepEqual(await members(), [ana, budi].sort());

  await setCollectionMembers(collectionId, [budi, citra], admin);
  assert.deepEqual(await members(), [budi, citra].sort());

  const before = (await db.collection.findUnique({ where: { id: collectionId } }))!.updatedAt;
  await new Promise((r) => setTimeout(r, 20));
  await setCollectionMembers(collectionId, [citra, budi, budi], admin);
  const same = (await db.collection.findUnique({ where: { id: collectionId } }))!.updatedAt;
  assert.equal(+same, +before, "an unchanged list is not a change");
});

test("a change of members marks the collection as changed, which is what empties offline caches", T, async () => {
  const before = (await db.collection.findUnique({ where: { id: collectionId } }))!.updatedAt;
  await new Promise((r) => setTimeout(r, 20));
  await setCollectionMembers(collectionId, [citra], admin);
  const after = (await db.collection.findUnique({ where: { id: collectionId } }))!.updatedAt;
  assert.ok(after > before);
});

test("ids that are not users are ignored, and the list is capped", T, async () => {
  await setCollectionMembers(collectionId, [ana, "tidak-ada", "", 7 as unknown as string], admin);
  assert.deepEqual(await members(), [ana]);

  const many = Array.from({ length: 201 }, (_, i) => `u${i}`);
  await assert.rejects(setCollectionMembers(collectionId, many, admin), /maksimal 200/);
  assert.deepEqual(await members(), [ana]);

  await assert.rejects(setCollectionMembers("tidak-ada", [ana], admin), /Koleksi tidak ditemukan/);
  await assert.rejects(setCollectionMembers(collectionId, "x" as unknown as string[], admin), /tidak valid/);
});

test("only an admin can read or change the member list or the list of people", T, async () => {
  await assert.rejects(setCollectionMembers(collectionId, [budi], editor), /Hanya admin/);
  await assert.rejects(getCollectionMemberIds(collectionId, editor), /Hanya admin/);
  await assert.rejects(listAssignableUsers(editor), /Hanya admin/);
  assert.deepEqual(await members(), [ana]);

  const people = await listAssignableUsers(admin);
  const ours = people.filter((p) => created.users.includes(p.id));
  assert.equal(ours.length, 5);
  assert.ok(ours.every((p) => p.email.includes(tag)));
});

test("two admins saving at the same moment end with exactly one of the lists, never a mix", T, async () => {
  const a = [ana];
  const b = [citra];
  for (let round = 0; round < 60; round++) {
    // both start from a list that neither of them wants, so each has something to remove
    await setCollectionMembers(collectionId, [budi], admin);
    await Promise.all([setCollectionMembers(collectionId, a, admin), setCollectionMembers(collectionId, b, admin)]);
    const now = await members();
    const isA = JSON.stringify(now) === JSON.stringify([...a].sort());
    const isB = JSON.stringify(now) === JSON.stringify([...b].sort());
    assert.ok(isA || isB, `round ${round}: ${JSON.stringify(now)}`);
  }
});

test("restricting a collection takes effect for readers at once, and the members stay when it is opened again", T, async () => {
  await setCollectionMembers(collectionId, [ana], admin);
  const reader = { id: budi, role: Role.VIEWER };
  const member = { id: ana, role: Role.VIEWER };
  const listed = async (v: Viewer) => (await getCollections(v)).some((c) => c.id === collectionId);
  assert.equal(await listed(reader), false);
  assert.equal(await listed(member), true);
  assert.equal(await listed(admin), true);

  await updateCollection(collectionId, { name: `Koleksi ${tag}`, slug: `${tag}-col`, status: "ACTIVE", restricted: false, requiresApproval: false });
  assert.equal(await listed(reader), true);
  assert.deepEqual(await members(), [ana], "members are kept while the collection is open");

  await updateCollection(collectionId, { name: `Koleksi ${tag}`, slug: `${tag}-col`, status: "ACTIVE", restricted: true, requiresApproval: false });
  assert.equal(await listed(reader), false);
  assert.equal(await listed(member), true);
});
