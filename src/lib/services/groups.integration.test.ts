import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { DocumentStatus, Role } from "@prisma/client";
import { db } from "../db";
import type { Viewer } from "../collection-access";
import { getCollectionBySlug, getCollections, getMemberCollectionIds } from "./collections";
import { getDocumentBySlug, getMemberDocumentIds, searchDocuments } from "./documents";
import {
  createGroup,
  deleteGroup,
  getCollectionGroupIds,
  getDocumentGroupIds,
  MAX_GROUPS_PER_ITEM,
  renameGroup,
  setCollectionGroups,
  setDocumentGroups,
  setGroupMembers,
} from "./groups";
import { restoreTrashedDocument, trashDocument } from "./trash";

/**
 * A group opens a restricted collection or document to all its members, and a change of
 * membership applies at once. Against a real database; skipped in CI.
 *
 *   KB_DB_TESTS=1 DATABASE_URL=postgresql://... npm test
 */
const enabled = process.env.KB_DB_TESTS === "1";
const tag = `gr${Date.now().toString(36)}`;
const T = { skip: !enabled };
const word = "gq" + Math.random().toString(36).replace(/[^a-z]/g, "").slice(0, 8).padEnd(8, "q");

const created = { users: [] as string[], collections: [] as string[], groups: [] as string[] };
let admin: Viewer, editor: Viewer, ana: Viewer, budi: Viewer;
let collectionSlug: string, collectionId: string, docSlug: string, docId: string;

async function user(name: string, role: Role): Promise<Viewer> {
  const row = await db.user.create({ data: { email: `${tag}-${name}@example.test`, name: `${name} ${tag}`, role } });
  created.users.push(row.id);
  return { id: row.id, role };
}

before(async () => {
  if (!enabled) return;
  admin = await user("admin", Role.ADMIN);
  editor = await user("editor", Role.EDITOR);
  ana = await user("ana", Role.VIEWER);
  budi = await user("budi", Role.VIEWER);
  const col = await db.collection.create({ data: { slug: `${tag}-col`, name: `Tertutup ${tag}`, restricted: true } });
  collectionId = col.id;
  collectionSlug = col.slug;
  created.collections.push(col.id);
  const doc = await db.document.create({
    data: { slug: `${tag}-doc`, title: `Rahasia ${word}`, content: `isi ${word}`, status: DocumentStatus.PUBLISHED, collectionId: col.id },
  });
  docId = doc.id;
  docSlug = doc.slug;
});

after(async () => {
  if (!enabled) return;
  await db.trashedDocument.deleteMany({ where: { collectionId: { in: created.collections } } });
  await db.document.deleteMany({ where: { collectionId: { in: created.collections } } });
  await db.collection.deleteMany({ where: { id: { in: created.collections } } });
  await db.group.deleteMany({ where: { id: { in: created.groups } } });
  await db.user.deleteMany({ where: { id: { in: created.users } } });
  await db.$disconnect();
});

async function makeGroup(name: string) {
  const { id } = await createGroup(`${name} ${tag}`, admin);
  created.groups.push(id);
  return id;
}

const canOpenCollection = async (v: Viewer) => (await getCollectionBySlug(collectionSlug, v)) !== null;
const canOpenDocument = async (v: Viewer) => (await getDocumentBySlug(docSlug, { viewer: v })) !== null;
const canSearch = async (v: Viewer) => (await searchDocuments(word, { viewer: v })).total === 1;

test("a group opens a restricted collection to its members, and membership changes apply at once", T, async () => {
  const tim = await makeGroup("Tim");
  assert.equal(await canOpenCollection(ana), false);

  await setCollectionGroups(collectionId, [tim], admin);
  assert.deepEqual(await getCollectionGroupIds(collectionId, admin), [tim]);
  assert.equal(await canOpenCollection(ana), false, "listed group, but she is not in it");

  const before = (await db.collection.findUniqueOrThrow({ where: { id: collectionId } })).updatedAt.getTime();
  await setGroupMembers(tim, [ana.id], admin);
  assert.equal(await canOpenCollection(ana), true);
  assert.equal(await canOpenCollection(budi), false);
  assert.ok((await getCollections(ana)).some((c) => c.slug === collectionSlug), "listed for her");
  assert.ok(!(await getCollections(budi)).some((c) => c.slug === collectionSlug));
  assert.ok((await getMemberCollectionIds(ana.id)).includes(collectionId), "the offline cache key sees group membership");
  assert.ok((await db.collection.findUniqueOrThrow({ where: { id: collectionId } })).updatedAt.getTime() > before, "marked as changed");
  assert.equal(await canSearch(ana), true, "search (raw SQL) agrees");
  assert.equal(await canSearch(budi), false);

  await setGroupMembers(tim, [budi.id], admin);
  assert.equal(await canOpenCollection(ana), false, "removed: access gone at once");
  assert.equal(await canOpenCollection(budi), true);

  await deleteGroup(tim, admin);
  assert.equal(await canOpenCollection(budi), false, "deleting the group takes what it opened");
  assert.equal((await getCollectionGroupIds(collectionId, admin)).length, 0);
});

test("a group on a restricted document needs the collection's door too", T, async () => {
  const tim = await makeGroup("Dok");
  await db.document.update({ where: { id: docId }, data: { restricted: true } });
  await setDocumentGroups(docId, [tim], admin);
  await setGroupMembers(tim, [ana.id], admin);
  assert.equal(await canOpenDocument(ana), false, "the collection is restricted and she is not on it");

  const open = await makeGroup("Koleksi");
  await setCollectionGroups(collectionId, [open], admin);
  await setGroupMembers(open, [ana.id, budi.id], admin);
  assert.equal(await canOpenDocument(ana), true, "both lists let her in");
  assert.equal(await canOpenDocument(budi), false, "the collection lets him in, the document does not");
  assert.equal(await canSearch(ana), true);
  assert.equal(await canSearch(budi), false);
  assert.ok((await getMemberDocumentIds(ana.id)).includes(docId));
  assert.ok(!(await getMemberDocumentIds(budi.id)).includes(docId));

  // trash and restore keep the groups the document listed
  await trashDocument(docId, admin);
  const row = await db.trashedDocument.findUniqueOrThrow({ where: { documentId: docId } });
  await restoreTrashedDocument(row.id, admin);
  assert.deepEqual(await getDocumentGroupIds(docId, admin), [tim]);
  assert.equal(await canOpenDocument(ana), true);

  await setCollectionGroups(collectionId, [], admin);
  await db.document.update({ where: { id: docId }, data: { restricted: false } });
  await setDocumentGroups(docId, [], admin);
});

test("names are clean and unique, and only an admin manages groups", T, async () => {
  const a = await makeGroup("Nama");
  await assert.rejects(createGroup(`  nama   ${tag.toUpperCase()} `, admin), /sudah dipakai/);
  await assert.rejects(createGroup("x", admin), /minimal/);
  await assert.rejects(createGroup("y".repeat(61), admin), /maksimal/);
  await assert.rejects(createGroup(42, admin), /wajib/);
  const b = await makeGroup("Lain");
  await assert.rejects(renameGroup(b, `NAMA ${tag}`, admin), /sudah dipakai/);
  await renameGroup(a, `Nama baru ${tag}`, admin);

  for (const call of [
    () => createGroup("Penyunting", editor),
    () => setGroupMembers(a, [], editor),
    () => deleteGroup(a, editor),
    () => setCollectionGroups(collectionId, [a], editor),
    () => setDocumentGroups(docId, [a], editor),
  ]) {
    await assert.rejects(call(), /Hanya admin/);
  }
  await assert.rejects(setGroupMembers("tidak-ada", [], admin), /tidak ditemukan/);
});

test("unknown ids are ignored and a collection lists a limited number of groups", T, async () => {
  const g = await makeGroup("Satu");
  await setCollectionGroups(collectionId, [g, "tidak-ada", g], admin);
  assert.deepEqual(await getCollectionGroupIds(collectionId, admin), [g]);
  await setGroupMembers(g, [ana.id, "tidak-ada"], admin);
  assert.equal(await db.groupMember.count({ where: { groupId: g } }), 1);

  const many = Array.from({ length: MAX_GROUPS_PER_ITEM + 1 }, (_, i) => `id${i}`);
  await assert.rejects(setCollectionGroups(collectionId, many, admin), /maksimal/);
  await setCollectionGroups(collectionId, [], admin);
});
