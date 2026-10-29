import { test, after } from "node:test";
import assert from "node:assert/strict";
import { DocumentStatus, Role } from "@prisma/client";
import { db } from "../db";
import { ADMIN, READER } from "./test-viewers";
import { COLLECTION_PAGE_SIZE, countDocumentsByCollection, getDocumentsByCollection, updateDocument } from "./documents";
import {
  getAncestors,
  getChildren,
  getParentCandidates,
  MAX_TREE_DEPTH,
  moveDocumentInParent,
  setDocumentParent,
} from "./document-tree";
import { restoreTrashedDocument, trashDocument } from "./trash";

/**
 * Against a real database: cycles, depth, order and visibility are decided in SQL and in a
 * transaction.
 *
 *   KB_DB_TESTS=1 DATABASE_URL=postgresql://... npm test
 */
const enabled = process.env.KB_DB_TESTS === "1";
const tag = `tt${Date.now().toString(36)}`;
let EDITOR = { id: "test-editor", role: Role.EDITOR };
let realAdmin = ADMIN;
const userIds: string[] = [];
const created = { collections: [] as string[] };

async function makeCollection(n: number) {
  const col = await db.collection.create({ data: { slug: `${tag}-c${n}`, name: `Koleksi ${n}` } });
  created.collections.push(col.id);
  return col;
}
async function makeDoc(col: { id: string }, name: string, extra: { status?: DocumentStatus; restricted?: boolean } = {}) {
  return db.document.create({
    data: { slug: `${tag}-${name}`, title: `Judul ${name}`, content: name, collectionId: col.id, status: extra.status ?? DocumentStatus.PUBLISHED, restricted: extra.restricted ?? false },
  });
}

/** Saving a text records who saved it, so those who save need to exist. */
test("setup", { skip: !enabled }, async () => {
  const editor = await db.user.create({ data: { email: `${tag}-e@test.local`, name: "Penyunting", role: Role.EDITOR } });
  const admin = await db.user.create({ data: { email: `${tag}-a@test.local`, name: "Admin", role: Role.ADMIN } });
  userIds.push(editor.id, admin.id);
  EDITOR = { id: editor.id, role: Role.EDITOR };
  realAdmin = { id: admin.id, role: Role.ADMIN };
});

after(async () => {
  if (!enabled) return;
  await db.trashedDocument.deleteMany({ where: { collectionId: { in: created.collections } } });
  await db.document.updateMany({ where: { collectionId: { in: created.collections } }, data: { parentId: null } });
  await db.document.deleteMany({ where: { collectionId: { in: created.collections } } });
  await db.collection.deleteMany({ where: { id: { in: created.collections } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.$disconnect();
});

test("a parent, its pages in order, and the breadcrumb", { skip: !enabled }, async () => {
  const col = await makeCollection(1);
  const guide = await makeDoc(col, "panduan");
  const a = await makeDoc(col, "a");
  const b = await makeDoc(col, "b");
  const c = await makeDoc(col, "c");
  for (const d of [a, b, c]) await setDocumentParent(d.id, guide.id, EDITOR);

  const opts = { viewer: READER };
  assert.deepEqual((await getChildren(guide.id, opts)).map((x) => x.slug), [a.slug, b.slug, c.slug], "added last, in the order they were put under");
  await moveDocumentInParent(c.id, "up", EDITOR);
  assert.deepEqual((await getChildren(guide.id, opts)).map((x) => x.slug), [a.slug, c.slug, b.slug]);
  await moveDocumentInParent(a.id, "up", EDITOR);
  assert.deepEqual((await getChildren(guide.id, opts)).map((x) => x.slug), [a.slug, c.slug, b.slug], "the first page cannot go further up");

  const before = await db.document.findUniqueOrThrow({ where: { id: b.id } });
  await setDocumentParent(b.id, a.id, EDITOR);
  assert.deepEqual((await getAncestors(b.id, opts)).map((x) => x.slug), [guide.slug, a.slug]);

  // setting a parent, or reordering, is not an edit of the text
  assert.equal((await db.document.findUniqueOrThrow({ where: { id: b.id } })).updatedAt.getTime(), before.updatedAt.getTime());
  assert.equal((await db.document.findUniqueOrThrow({ where: { id: c.id } })).updatedAt.getTime(), c.updatedAt.getTime());
  assert.equal(await db.documentRevision.count({ where: { documentId: b.id } }), 0);
});

test("a page cannot go under itself, its own pages, another collection, or too deep", { skip: !enabled }, async () => {
  const col = await makeCollection(2);
  const other = await makeCollection(3);
  const levels = [] as Awaited<ReturnType<typeof makeDoc>>[];
  for (let i = 0; i < MAX_TREE_DEPTH; i++) levels.push(await makeDoc(col, `n${i}`));
  for (let i = 1; i < levels.length; i++) await setDocumentParent(levels[i].id, levels[i - 1].id, EDITOR);

  await assert.rejects(setDocumentParent(levels[0].id, levels[0].id, EDITOR), /dirinya sendiri/);
  await assert.rejects(setDocumentParent(levels[0].id, levels[2].id, EDITOR), /halamannya sendiri/);
  const extra = await makeDoc(col, "extra");
  await assert.rejects(setDocumentParent(extra.id, levels[MAX_TREE_DEPTH - 1].id, EDITOR), /terlalu dalam/);
  const stranger = await makeDoc(other, "stranger");
  await assert.rejects(setDocumentParent(extra.id, stranger.id, EDITOR), /koleksi yang sama/);
  // moving a subtree under something deep is refused for its height, not only its own level
  await assert.rejects(setDocumentParent(levels[0].id, extra.id, EDITOR), /terlalu dalam/);
  await assert.rejects(setDocumentParent(extra.id, levels[0].id, READER), /hak/);

  const candidates = (await getParentCandidates(col.id, levels[1].id, ADMIN)).map((x) => x.id);
  assert.ok(!candidates.includes(levels[1].id) && !candidates.includes(levels[2].id) && candidates.includes(levels[0].id) && candidates.includes(extra.id));
});

test("the collection list shows top-level pages, and a hidden parent does not hide its readable children", { skip: !enabled }, async () => {
  const col = await makeCollection(4);
  const top = await makeDoc(col, "top");
  const kid = await makeDoc(col, "kid");
  await setDocumentParent(kid.id, top.id, EDITOR);
  const list = async (viewer: typeof READER, includeDrafts = false) =>
    (await getDocumentsByCollection(col.id, { viewer, includeDrafts, topLevelOnly: true, take: COLLECTION_PAGE_SIZE })).map((d) => d.slug);

  assert.deepEqual(await list(READER), [top.slug]);
  assert.equal(await countDocumentsByCollection(col.id, { viewer: READER, topLevelOnly: true }), 1);
  assert.equal(await countDocumentsByCollection(col.id, { viewer: READER }), 2, "without the flag nothing changes");

  // the parent becomes a draft: readers cannot see it, so the child comes up to the list
  await db.document.update({ where: { id: top.id }, data: { status: DocumentStatus.DRAFT } });
  assert.deepEqual(await list(READER), [kid.slug]);
  assert.deepEqual(await list(ADMIN, true), [top.slug]);
  assert.deepEqual((await getAncestors(kid.id, { viewer: READER })).map((x) => x.slug), [], "the breadcrumb stops at a page the reader cannot see");
  assert.deepEqual((await getAncestors(kid.id, { viewer: ADMIN, includeDrafts: true })).map((x) => x.slug), [top.slug]);
});

test("moving to another collection, deleting a parent, and restoring", { skip: !enabled }, async () => {
  const col = await makeCollection(5);
  const dest = await makeCollection(6);
  const parent = await makeDoc(col, "p");
  const kid = await makeDoc(col, "k");
  await setDocumentParent(kid.id, parent.id, EDITOR);

  // the page leaves for another collection: out from under its parent
  await updateDocument(kid.id, { title: "Judul k", slug: `${tag}-k`, collectionId: dest.id, type: "PANDUAN", content: "k", status: "PUBLISHED" }, realAdmin);
  assert.equal((await db.document.findUniqueOrThrow({ where: { id: kid.id } })).parentId, null);

  // the parent leaves: its pages stay, at the top
  await setDocumentParent(kid.id, null, EDITOR);
  const kid2 = await makeDoc(col, "k2");
  await setDocumentParent(kid2.id, parent.id, EDITOR);
  await updateDocument(parent.id, { title: "Judul p", slug: `${tag}-p`, collectionId: dest.id, type: "PANDUAN", content: "p", status: "PUBLISHED" }, realAdmin);
  assert.equal((await db.document.findUniqueOrThrow({ where: { id: kid2.id } })).parentId, null);

  // trash and restore: back under its parent while that exists, at the top once it does not
  const p2 = await makeDoc(col, "p2");
  const k3 = await makeDoc(col, "k3");
  await setDocumentParent(k3.id, p2.id, EDITOR);
  await trashDocument(k3.id, ADMIN);
  const row = await db.trashedDocument.findUniqueOrThrow({ where: { documentId: k3.id } });
  await restoreTrashedDocument(row.id, ADMIN);
  assert.equal((await db.document.findUniqueOrThrow({ where: { id: k3.id } })).parentId, p2.id);

  await trashDocument(k3.id, ADMIN);
  await trashDocument(p2.id, ADMIN);
  const row2 = await db.trashedDocument.findUniqueOrThrow({ where: { documentId: k3.id } });
  await restoreTrashedDocument(row2.id, ADMIN);
  assert.equal((await db.document.findUniqueOrThrow({ where: { id: k3.id } })).parentId, null);
});
