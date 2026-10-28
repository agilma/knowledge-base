import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { DocumentStatus, DocumentType, Role } from "@prisma/client";
import { db } from "../db";
import type { Viewer } from "../collection-access";
import {
  createDocument,
  deleteDocument,
  getDocumentBySlug,
  getDocumentMemberIds,
  getDocumentsByCollection,
  getMemberDocumentIds,
  getRecentlyUpdatedDocuments,
  getRelatedDocumentIds,
  searchRelationCandidates,
  getRestrictedDocumentIds,
  searchDocuments,
  setDocumentAccess,
  setDocumentStatus,
  setRelatedDocuments,
  updateDocument,
} from "./documents";
import { getCollectionsWithDocumentCount } from "./collections";
import { getFavoriteDocuments } from "./favorites";
import { getRecentDocuments } from "./recent-views";
import { getRevision, getRevisionList } from "./revisions";

/**
 * Restricted documents, against a real database: every way of reading or writing a
 * document is tried as somebody who is not on its list (who must see nothing, not even
 * a count) and as somebody who is. Skipped in CI.
 *
 *   KB_DB_TESTS=1 DATABASE_URL=postgresql://... npm test
 */
const enabled = process.env.KB_DB_TESTS === "1";
const tag = `dac${Date.now()}`;
const word = `rahasia${tag}`;
const ids = { users: [] as string[], collections: [] as string[], documents: [] as string[] };

async function user(name: string, role: Role): Promise<Viewer> {
  const row = await db.user.create({ data: { email: `${tag}-${name}@example.test`, name, role } });
  ids.users.push(row.id);
  return { id: row.id, role };
}

let admin: Viewer, editorIn: Viewer, editorOut: Viewer, viewerIn: Viewer, viewerOut: Viewer;
let open: { id: string; slug: string };
let closed: { id: string; slug: string };
type Doc = { id: string; slug: string };
let lock: Doc; // restricted, in the open collection; editorIn and viewerIn listed
let plain: Doc; // open document in the open collection
let lockInClosed: Doc; // restricted in the closed collection; editorIn listed, viewerOut listed too
let plainInClosed: Doc;

async function doc(slug: string, collectionId: string, restricted: boolean, members: string[], status = DocumentStatus.PUBLISHED) {
  const row = await db.document.create({
    data: {
      slug: `${tag}-${slug}`,
      title: `Doc ${slug} ${tag}`,
      content: `${word} ${slug}`,
      type: DocumentType.PANDUAN,
      status,
      collectionId,
      restricted,
      members: { create: members.map((userId) => ({ userId })) },
    },
  });
  ids.documents.push(row.id);
  return row;
}

const input = (collectionId: string, slug: string) => ({
  title: `Baru ${slug}`,
  slug: `${tag}-${slug}`,
  collectionId,
  type: DocumentType.PANDUAN,
  content: "isi",
  status: DocumentStatus.DRAFT,
});

before(async () => {
  if (!enabled) return;
  admin = await user("admin", Role.ADMIN);
  editorIn = await user("editor-in", Role.EDITOR);
  editorOut = await user("editor-out", Role.EDITOR);
  viewerIn = await user("viewer-in", Role.VIEWER);
  viewerOut = await user("viewer-out", Role.VIEWER);

  open = await db.collection.create({ data: { slug: `${tag}-open`, name: `Terbuka ${tag}` } });
  closed = await db.collection.create({
    data: {
      slug: `${tag}-closed`,
      name: `Tertutup ${tag}`,
      restricted: true,
      members: { create: [{ userId: editorIn.id }, { userId: viewerIn.id }] },
    },
  });
  ids.collections.push(open.id, closed.id);

  lock = await doc("lock", open.id, true, [editorIn.id, viewerIn.id]);
  plain = await doc("plain", open.id, false, []);
  lockInClosed = await doc("lock-closed", closed.id, true, [editorIn.id, viewerOut.id]);
  plainInClosed = await doc("plain-closed", closed.id, false, []);
  await db.documentRelation.create({ data: { fromId: plain.id, toId: lock.id } });
  await db.favorite.create({ data: { userId: viewerOut.id, entityType: "DOCUMENT", entityId: lock.id } });
  await db.recentView.create({ data: { userId: viewerOut.id, entityType: "DOCUMENT", entityId: lock.id } });
});

after(async () => {
  if (!enabled) return;
  await db.favorite.deleteMany({ where: { userId: { in: ids.users } } });
  await db.recentView.deleteMany({ where: { userId: { in: ids.users } } });
  const docs = await db.document.findMany({ where: { collectionId: { in: ids.collections } }, select: { id: true } });
  const all = [...new Set([...ids.documents, ...docs.map((d) => d.id)])];
  await db.documentRelation.deleteMany({ where: { OR: [{ fromId: { in: all } }, { toId: { in: all } }] } });
  await db.document.deleteMany({ where: { id: { in: all } } });
  await db.collection.deleteMany({ where: { id: { in: ids.collections } } });
  await db.user.deleteMany({ where: { id: { in: ids.users } } });
  await db.$disconnect();
});

const T = { skip: !enabled };
const read = (d: Doc, viewer: Viewer) => getDocumentBySlug(d.slug, { includeDrafts: true, viewer });

test("a restricted document is read only by those listed and by admins", T, async () => {
  assert.ok(await read(lock, admin));
  assert.ok(await read(lock, editorIn));
  assert.ok(await read(lock, viewerIn));
  assert.equal(await read(lock, editorOut), null);
  assert.equal(await read(lock, viewerOut), null);
  // the document next to it is untouched
  for (const v of [admin, editorIn, editorOut, viewerIn, viewerOut]) assert.ok(await read(plain, v));
});

test("the collection and the document must both allow the reader", T, async () => {
  assert.ok(await read(lockInClosed, admin));
  assert.ok(await read(lockInClosed, editorIn), "on both lists");
  assert.equal(await read(lockInClosed, viewerIn), null, "in the collection, not on the document");
  assert.equal(await read(lockInClosed, viewerOut), null, "on the document, not in the collection");
  assert.equal(await read(plainInClosed, viewerOut), null);
  assert.ok(await read(plainInClosed, viewerIn));
});

test("lists leave out what the reader may not read", T, async () => {
  const slugs = async (v: Viewer) =>
    (await getDocumentsByCollection(open.id, { includeDrafts: true, viewer: v })).map((d) => d.slug);
  assert.ok((await slugs(viewerOut)).includes(plain.slug));
  assert.ok(!(await slugs(viewerOut)).includes(lock.slug));
  assert.ok((await slugs(viewerIn)).includes(lock.slug));
  assert.ok((await slugs(admin)).includes(lock.slug));

  const recent = async (v: Viewer) =>
    (await getRecentlyUpdatedDocuments(200, { includeDrafts: true, viewer: v })).map((d) => d.slug);
  assert.ok(!(await recent(editorOut)).includes(lock.slug));
  assert.ok((await recent(editorIn)).includes(lock.slug));
});

test("search finds a restricted document only for those who may read it, and counts it likewise", T, async () => {
  const hit = async (v: Viewer) => searchDocuments(word, { includeDrafts: true, viewer: v });
  const outsider = await hit(viewerOut);
  const slugsOut = outsider.results.map((r) => r.slug);
  assert.ok(!slugsOut.includes(lock.slug));
  assert.equal(outsider.total, outsider.results.length, "the total must not count what is hidden");
  const member = await hit(viewerIn);
  assert.ok(member.results.map((r) => r.slug).includes(lock.slug));
  assert.ok(member.total > outsider.total);
  assert.ok((await hit(admin)).results.map((r) => r.slug).includes(lock.slug));
});

test("the number of documents in a collection leaves out the restricted ones", T, async () => {
  const count = async (v: Viewer) => {
    const all = await getCollectionsWithDocumentCount({ includeDrafts: true, viewer: v });
    return all.find((c) => c.id === open.id)?.documentCount;
  };
  assert.equal(await count(viewerOut), 1, "only the open document");
  assert.equal(await count(viewerIn), 2);
  assert.equal(await count(admin), 2);
});

test("history and revisions of a restricted document are hidden too", T, async () => {
  await db.documentRevision.create({
    data: { documentId: lock.id, version: 1, title: "t", content: `${word} lama`, type: DocumentType.PANDUAN, status: DocumentStatus.PUBLISHED },
  });
  assert.deepEqual(await getRevisionList(lock.id, viewerOut), []);
  assert.equal(await getRevision(lock.id, 1, viewerOut), null);
  assert.equal((await getRevisionList(lock.id, viewerIn)).length, 1);
  assert.ok(await getRevision(lock.id, 1, viewerIn));
  assert.equal((await getRevisionList(lock.id, admin)).length, 1);
});

test("related documents: hidden ones stay hidden, offered to nobody, and kept when someone else edits the list", T, async () => {
  assert.deepEqual(await getRelatedDocumentIds(plain.id, viewerOut), []);
  assert.deepEqual(await getRelatedDocumentIds(plain.id, viewerIn), [lock.id]);
  const candidates = async (v: Viewer) => (await searchRelationCandidates(tag, v, undefined, 100)).map((c) => c.id);
  assert.ok(!(await candidates(viewerOut)).includes(lock.id));
  assert.ok((await candidates(viewerIn)).includes(lock.id));

  await setRelatedDocuments(plain.id, [], editorOut);
  assert.equal(
    await db.documentRelation.count({ where: { fromId: plain.id, toId: lock.id } }),
    1,
    "a relation the editor could not see must survive their save"
  );
});

test("favorites and recent views leave out what the reader may no longer read", T, async () => {
  assert.equal((await getFavoriteDocuments(viewerOut.id, viewerOut.role)).some((d) => d.id === lock.id), false);
  assert.equal((await getRecentDocuments(viewerOut.id, viewerOut.role)).some((d) => d.id === lock.id), false);
});

test("somebody not on the list cannot change, publish or delete the document, and is told it does not exist", T, async () => {
  const missing = /tidak ditemukan/;
  await assert.rejects(updateDocument(lock.id, input(open.id, "lock"), editorOut), missing);
  await assert.rejects(setDocumentStatus(lock.id, DocumentStatus.ARCHIVED, editorOut), missing);
  await assert.rejects(deleteDocument(lock.id, editorOut), missing);
  // the same answer as for an id that does not exist
  const nowhere = await updateDocument("tidak-ada", input(open.id, "x"), editorOut).catch((e: Error) => e.message);
  const hidden = await updateDocument(lock.id, input(open.id, "x"), editorOut).catch((e: Error) => e.message);
  assert.equal(hidden, nowhere);
  assert.ok(await db.document.findUnique({ where: { id: lock.id } }));
});

test("an editor on the list may write in it, but not move it past their own access", T, async () => {
  await updateDocument(lock.id, { ...input(open.id, "lock"), content: "diedit anggota" }, editorIn);
  assert.equal((await db.document.findUnique({ where: { id: lock.id } }))?.content, "diedit anggota");
  // editing does not open the document
  assert.equal((await db.document.findUnique({ where: { id: lock.id } }))?.restricted, true);
  await db.document.update({ where: { id: lock.id }, data: { content: `${word} lock` } });
});

test("only an admin restricts a document or changes who is on its list", T, async () => {
  for (const actor of [editorIn, editorOut, viewerIn]) {
    await assert.rejects(setDocumentAccess(plain.id, { restricted: true, memberIds: [] }, actor), /admin/);
    await assert.rejects(getDocumentMemberIds(lock.id, actor), /admin/);
  }
  await assert.rejects(
    createDocument(input(open.id, "baru-terbatas"), editorOut, { restricted: true, memberIds: [] }),
    /admin/
  );
  assert.equal(await db.document.count({ where: { slug: `${tag}-baru-terbatas` } }), 0);
  assert.equal((await db.document.findUnique({ where: { id: plain.id } }))?.restricted, false);
});

test("an admin creates a restricted document with its list in one step", T, async () => {
  const created = await createDocument(input(open.id, "dibuat-admin"), admin, {
    restricted: true,
    memberIds: [viewerIn.id, viewerIn.id, "tidak-ada"],
  });
  ids.documents.push(created.id);
  assert.equal(created.restricted, true);
  assert.deepEqual(await getDocumentMemberIds(created.id, admin), [viewerIn.id], "no repeats, unknown ids dropped");
  assert.equal(await read(created, viewerOut), null);
  assert.ok(await read(created, viewerIn));
});

test("setting access: list limits, unknown ids, and the document's own time is left alone", T, async () => {
  const doc2 = await doc("acc-set", open.id, false, []);
  const before = await db.document.findUnique({ where: { id: doc2.id } });

  await setDocumentAccess(doc2.id, { restricted: true, memberIds: [viewerIn.id, "tidak-ada"] }, admin);
  const after1 = await db.document.findUnique({ where: { id: doc2.id } });
  assert.equal(after1?.restricted, true);
  assert.equal(+after1!.updatedAt, +before!.updatedAt, "restricting is not an edit of the text");
  assert.deepEqual(await getDocumentMemberIds(doc2.id, admin), [viewerIn.id]);
  assert.equal(await read(doc2, viewerOut), null);

  const tooMany = Array.from({ length: 201 }, (_, i) => `u${i}`);
  await assert.rejects(setDocumentAccess(doc2.id, { restricted: true, memberIds: tooMany }, admin), /maksimal 200/);
  assert.deepEqual(await getDocumentMemberIds(doc2.id, admin), [viewerIn.id], "a refused list changes nothing");
  await assert.rejects(setDocumentAccess("tidak-ada", { restricted: true, memberIds: [] }, admin), /tidak ditemukan/);
  await assert.rejects(setDocumentAccess(doc2.id, { restricted: "ya" as unknown as boolean, memberIds: [] }, admin), /tidak valid/);

  // opening it again keeps the list, and everyone reads it
  await setDocumentAccess(doc2.id, { restricted: false, memberIds: [viewerIn.id] }, admin);
  assert.ok(await read(doc2, viewerOut));
  assert.deepEqual(await getDocumentMemberIds(doc2.id, admin), [viewerIn.id]);
  assert.equal(await db.documentRevision.count({ where: { documentId: doc2.id } }), 0, "no revision for an access change");
});

test("two admins saving the list at once leave one of the two lists, not a mixture", T, async () => {
  const doc3 = await doc("acc-race", open.id, true, []);
  const a = [editorIn.id, viewerIn.id];
  const b = [editorOut.id, viewerOut.id];
  for (let round = 0; round < 40; round++) {
    // start from a list neither wants, so a missing lock would show up as a mixture
    await db.documentMember.deleteMany({ where: { documentId: doc3.id } });
    await db.documentMember.create({ data: { documentId: doc3.id, userId: admin.id } });
    await Promise.all([
      setDocumentAccess(doc3.id, { restricted: true, memberIds: a }, admin),
      setDocumentAccess(doc3.id, { restricted: true, memberIds: b }, admin),
    ]);
    const final = (await getDocumentMemberIds(doc3.id, admin)).sort();
    assert.ok(
      JSON.stringify(final) === JSON.stringify([...a].sort()) || JSON.stringify(final) === JSON.stringify([...b].sort()),
      `round ${round}: ended with ${final.length} people, a mixture`
    );
  }
});

test("the offline cache key reads restricted documents by id and membership", T, async () => {
  const restricted = await getRestrictedDocumentIds();
  assert.ok(restricted.includes(lock.id) && restricted.includes(lockInClosed.id));
  assert.ok(!restricted.includes(plain.id));
  const mine = await getMemberDocumentIds(viewerIn.id);
  assert.ok(mine.includes(lock.id));
  assert.ok(!mine.includes(lockInClosed.id));
});

test("deleting a restricted document removes its list", T, async () => {
  const doc4 = await doc("acc-del", open.id, true, [viewerIn.id]);
  await deleteDocument(doc4.id, admin);
  assert.equal(await db.documentMember.count({ where: { documentId: doc4.id } }), 0);
});
