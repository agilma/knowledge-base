import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { DocumentStatus, DocumentType, Role } from "@prisma/client";
import { db } from "../db";
import type { Viewer } from "../collection-access";
import {
  createDocument,
  deleteDocument,
  getDocumentBySlug,
  getDocumentsByCollection,
  getRecentlyUpdatedDocuments,
  getRelatedDocumentIds,
  getRelatedDocuments,
  searchRelationCandidates,
  searchDocuments,
  setDocumentStatus,
  setRelatedDocuments,
  updateDocument,
} from "./documents";
import {
  getCollectionById,
  getCollectionBySlug,
  getCollections,
  getCollectionsWithDocumentCount,
  getMemberCollectionIds,
  getRestrictedCollections,
} from "./collections";
import { getFavoriteDocuments, setFavorite } from "./favorites";
import { getRecentDocuments, recordView } from "./recent-views";
import { getRevision, getRevisionList } from "./revisions";

/**
 * Restricted collections, against a real database. Every way of reading or
 * writing a document is tried as someone outside the collection (who must see
 * nothing, not even a count) and as someone inside it. Skipped in CI.
 *
 *   KB_DB_TESTS=1 DATABASE_URL=postgresql://... npm test
 */
const enabled = process.env.KB_DB_TESTS === "1";
const tag = `acc${Date.now()}`;
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
let openDoc: { id: string; slug: string };
let secret: { id: string; slug: string };
let secretDraft: { id: string; slug: string };

async function doc(slug: string, collectionId: string, status: DocumentStatus, content: string) {
  const row = await db.document.create({
    data: { slug: `${tag}-${slug}`, title: `Doc ${slug} ${tag}`, content, type: DocumentType.PANDUAN, status, collectionId },
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

  openDoc = await doc("open", open.id, DocumentStatus.PUBLISHED, `${word} terbuka`);
  secret = await doc("secret", closed.id, DocumentStatus.PUBLISHED, `${word} tertutup`);
  secretDraft = await doc("secret-draft", closed.id, DocumentStatus.DRAFT, `${word} draf`);
  await db.documentRelation.create({ data: { fromId: openDoc.id, toId: secret.id } });
  await db.favorite.create({ data: { userId: viewerOut.id, entityType: "DOCUMENT", entityId: secret.id } });
  await db.recentView.create({ data: { userId: viewerOut.id, entityType: "DOCUMENT", entityId: secret.id } });
});

after(async () => {
  if (!enabled) return;
  await db.favorite.deleteMany({ where: { userId: { in: ids.users } } });
  await db.recentView.deleteMany({ where: { userId: { in: ids.users } } });
  const docs = await db.document.findMany({
    where: { collectionId: { in: ids.collections } },
    select: { id: true },
  });
  const all = [...new Set([...ids.documents, ...docs.map((d) => d.id)])];
  await db.documentRelation.deleteMany({ where: { OR: [{ fromId: { in: all } }, { toId: { in: all } }] } });
  await db.document.deleteMany({ where: { id: { in: all } } });
  await db.collection.deleteMany({ where: { id: { in: ids.collections } } });
  await db.user.deleteMany({ where: { id: { in: ids.users } } });
  await db.$disconnect();
});

const T = { skip: !enabled };

test("a document in a restricted collection is found only by members and admins", T, async () => {
  const opts = (viewer: Viewer) => ({ viewer, includeDrafts: true });
  assert.equal(await getDocumentBySlug(secret.slug, opts(viewerOut)), null);
  assert.equal(await getDocumentBySlug(secret.slug, opts(editorOut)), null);
  assert.equal(await getDocumentBySlug(secretDraft.slug, opts(editorOut)), null);
  assert.equal((await getDocumentBySlug(secret.slug, { viewer: viewerIn }))?.id, secret.id);
  assert.equal((await getDocumentBySlug(secretDraft.slug, opts(editorIn)))?.id, secretDraft.id);
  assert.equal((await getDocumentBySlug(secret.slug, opts(admin)))?.id, secret.id);
  // a document in an open collection is unaffected
  assert.equal((await getDocumentBySlug(openDoc.slug, { viewer: viewerOut }))?.id, openDoc.id);
});

test("listing a collection, and the newest documents", T, async () => {
  assert.deepEqual(await getDocumentsByCollection(closed.id, { viewer: viewerOut }), []);
  assert.deepEqual(await getDocumentsByCollection(closed.id, { viewer: editorOut, includeDrafts: true }), []);
  assert.deepEqual((await getDocumentsByCollection(closed.id, { viewer: viewerIn })).map((d) => d.id), [secret.id]);
  assert.equal((await getDocumentsByCollection(closed.id, { viewer: admin, includeDrafts: true })).length, 2);

  const seen = (rows: { id: string }[]) => rows.map((r) => r.id);
  const outside = seen(await getRecentlyUpdatedDocuments(100000, { viewer: viewerOut, includeDrafts: false }));
  assert.ok(!outside.includes(secret.id) && outside.includes(openDoc.id));
  const inside = seen(await getRecentlyUpdatedDocuments(100000, { viewer: viewerIn, includeDrafts: false }));
  assert.ok(inside.includes(secret.id));
});

test("a related document in a restricted collection does not show through an open one", T, async () => {
  assert.deepEqual(await getRelatedDocuments(openDoc.id, { viewer: viewerOut }), []);
  assert.deepEqual(await getRelatedDocuments(openDoc.id, { viewer: editorOut, includeDrafts: true }), []);
  assert.deepEqual((await getRelatedDocuments(openDoc.id, { viewer: viewerIn })).map((d) => d.id), [secret.id]);
  // from the other end it returns only what is readable (the page itself is not found)
  const fromSecret = await getRelatedDocuments(secret.id, { viewer: viewerOut });
  assert.deepEqual(fromSecret.map((d) => d.id), [openDoc.id]);
});

test("the picker candidates leave out what the editor cannot read", T, async () => {
  const titles = async (viewer: Viewer) => (await searchRelationCandidates(tag, viewer, undefined, 100)).map((c) => c.id);
  assert.ok(!(await titles(editorOut)).includes(secret.id));
  assert.ok(!(await titles(editorOut)).includes(secretDraft.id));
  assert.ok((await titles(editorIn)).includes(secret.id));
  assert.ok((await titles(admin)).includes(secretDraft.id));
});

test("search never reveals a restricted document, nor counts it", T, async () => {
  const outside = await searchDocuments(word, { viewer: viewerOut });
  assert.deepEqual(outside.results.map((r) => r.id), [openDoc.id]);
  assert.equal(outside.total, 1);

  const editorOutside = await searchDocuments(word, { viewer: editorOut, includeDrafts: true });
  assert.deepEqual(editorOutside.results.map((r) => r.id), [openDoc.id]);
  assert.equal(editorOutside.total, 1);

  // asking for the restricted collection by id finds nothing, and says so as zero
  const direct = await searchDocuments(word, { viewer: viewerOut, collectionId: closed.id });
  assert.deepEqual(direct, { results: [], total: 0 });

  const inside = await searchDocuments(word, { viewer: viewerIn });
  assert.equal(inside.total, 2);
  const everything = await searchDocuments(word, { viewer: admin, includeDrafts: true });
  assert.equal(everything.total, 3);
});

test("collections are listed, counted and opened only for those who may read them", T, async () => {
  const slugs = async (viewer: Viewer) => (await getCollections(viewer)).map((c) => c.slug);
  assert.ok(!(await slugs(viewerOut)).includes(closed.slug));
  assert.ok((await slugs(viewerOut)).includes(open.slug));
  assert.ok((await slugs(viewerIn)).includes(closed.slug));
  assert.ok((await slugs(admin)).includes(closed.slug));

  assert.equal(await getCollectionBySlug(closed.slug, viewerOut), null);
  assert.equal(await getCollectionBySlug(closed.slug, editorOut), null);
  assert.equal((await getCollectionBySlug(closed.slug, editorIn))?.id, closed.id);

  const counted = async (viewer: Viewer) =>
    (await getCollectionsWithDocumentCount({ viewer })).map((c) => c.slug);
  assert.ok(!(await counted(viewerOut)).includes(closed.slug));
  assert.ok((await counted(viewerIn)).includes(closed.slug));
});

test("favourites and recently opened skip documents the reader can no longer read", T, async () => {
  // rows written while the collection was open, or by hand: the filter is on read
  assert.deepEqual(await getFavoriteDocuments(viewerOut.id, Role.VIEWER), []);
  assert.deepEqual(await getRecentDocuments(viewerOut.id, Role.VIEWER), []);

  assert.equal(await setFavorite(viewerOut.id, secret.id, true, Role.VIEWER), false);
  assert.equal(await recordView(viewerOut.id, secret.id, Role.VIEWER), false);

  assert.equal(await setFavorite(viewerIn.id, secret.id, true, Role.VIEWER), true);
  assert.deepEqual((await getFavoriteDocuments(viewerIn.id, Role.VIEWER)).map((d) => d.id), [secret.id]);
  assert.equal(await recordView(viewerIn.id, secret.id, Role.VIEWER), true);
  assert.deepEqual((await getRecentDocuments(viewerIn.id, Role.VIEWER)).map((d) => d.id), [secret.id]);
});

test("removing a member takes the access away at once", T, async () => {
  const extra = await user("viewer-temp", Role.VIEWER);
  await db.collectionMember.create({ data: { collectionId: closed.id, userId: extra.id } });
  assert.equal((await getDocumentBySlug(secret.slug, { viewer: extra }))?.id, secret.id);
  assert.deepEqual(await getMemberCollectionIds(extra.id), [closed.id]);

  await db.collectionMember.delete({
    where: { collectionId_userId: { collectionId: closed.id, userId: extra.id } },
  });
  assert.equal(await getDocumentBySlug(secret.slug, { viewer: extra }), null);
  assert.deepEqual(await getMemberCollectionIds(extra.id), []);
});

test("an editor outside the collection cannot write in it, or move documents in or out", T, async () => {
  await assert.rejects(createDocument(input(closed.id, "w1"), editorOut), /Koleksi tidak ditemukan/);
  await assert.rejects(
    updateDocument(secret.id, { ...input(closed.id, "secret"), slug: secret.slug, title: "diubah" }, editorOut),
    /Dokumen tidak ditemukan/
  );
  await assert.rejects(setDocumentStatus(secret.id, DocumentStatus.ARCHIVED, editorOut), /Dokumen tidak ditemukan/);
  await assert.rejects(deleteDocument(secret.id, editorOut), /Dokumen tidak ditemukan/);
  // moving an open document into the restricted collection
  const mine = await createDocument(input(open.id, "w2"), editorOut);
  ids.documents.push(mine.id);
  await assert.rejects(
    updateDocument(mine.id, { ...input(closed.id, "w2"), slug: mine.slug }, editorOut),
    /Koleksi tidak ditemukan/
  );
  assert.equal((await db.document.findUnique({ where: { id: secret.id } }))?.status, DocumentStatus.PUBLISHED);
  assert.equal((await db.document.findUnique({ where: { id: mine.id } }))?.collectionId, open.id);

  // a member can
  const inside = await createDocument(input(closed.id, "w3"), editorIn);
  ids.documents.push(inside.id);
  assert.equal(inside.collectionId, closed.id);
  await setDocumentStatus(inside.id, DocumentStatus.PUBLISHED, editorIn);
  await deleteDocument(inside.id, admin);
});

test("an editor's related list cannot add or drop what they cannot see", T, async () => {
  const other = await doc("secret-2", closed.id, DocumentStatus.PUBLISHED, "lain");

  // openDoc is related to `secret`, which editorOut cannot read: saving an empty
  // list must keep that relation, and asking for `other` must not create one
  await setRelatedDocuments(openDoc.id, [other.id], editorOut);
  const rows = await db.documentRelation.findMany({
    where: { OR: [{ fromId: openDoc.id }, { toId: openDoc.id }] },
    select: { fromId: true, toId: true },
  });
  const linked = rows.map((r) => (r.fromId === openDoc.id ? r.toId : r.fromId));
  assert.deepEqual(linked, [secret.id]);

  // a member sees both and may change them
  await setRelatedDocuments(openDoc.id, [other.id], editorIn);
  const after = await db.documentRelation.findMany({
    where: { OR: [{ fromId: openDoc.id }, { toId: openDoc.id }] },
    select: { fromId: true, toId: true },
  });
  assert.deepEqual(after.map((r) => (r.fromId === openDoc.id ? r.toId : r.fromId)), [other.id]);

  // and an editor cannot relate a document they cannot read at all
  await assert.rejects(setRelatedDocuments(secret.id, [openDoc.id], editorOut), /Dokumen tidak ditemukan/);
});

test("the ids of related documents that go into the edit form are only the readable ones", T, async () => {
  // whatever the document is related to now (earlier tests change it), all of it is in the
  // restricted collection, so someone outside it gets none and a member gets all
  const rows = await db.documentRelation.findMany({
    where: { OR: [{ fromId: openDoc.id }, { toId: openDoc.id }] },
    select: { fromId: true, toId: true },
  });
  const linked = rows.map((r) => (r.fromId === openDoc.id ? r.toId : r.fromId)).sort();
  assert.ok(linked.length > 0);
  assert.deepEqual(await getRelatedDocumentIds(openDoc.id, editorOut), []);
  assert.deepEqual((await getRelatedDocumentIds(openDoc.id, editorIn)).sort(), linked);
  assert.deepEqual((await getRelatedDocumentIds(openDoc.id, admin)).sort(), linked);
});

test("the history of a document is empty for someone who cannot read its collection", T, async () => {
  const made = await createDocument(input(closed.id, "hist"), editorIn);
  ids.documents.push(made.id);

  assert.deepEqual(await getRevisionList(made.id, editorOut), []);
  assert.equal(await getRevision(made.id, 1, editorOut), null);
  assert.equal((await getRevisionList(made.id, editorIn)).length, 1);
  assert.ok(await getRevision(made.id, 1, editorIn));
  assert.equal((await getRevisionList(made.id, admin)).length, 1);
});

test("a collection is found by id only by those who may read it", T, async () => {
  assert.equal(await getCollectionById(closed.id, viewerOut), null);
  assert.equal((await getCollectionById(closed.id, viewerIn))?.id, closed.id);
  assert.equal((await getCollectionById(closed.id, admin))?.id, closed.id);
});

test("moving a document in or out of a collection marks both collections as changed", T, async () => {
  const made = await createDocument(input(closed.id, "move"), editorIn);
  ids.documents.push(made.id);
  const before = await db.collection.findMany({ where: { id: { in: [open.id, closed.id] } } });
  await new Promise((resolve) => setTimeout(resolve, 20));

  await updateDocument(made.id, { ...input(open.id, "move"), slug: made.slug }, editorIn);

  const after = await db.collection.findMany({ where: { id: { in: [open.id, closed.id] } } });
  for (const col of after) {
    const was = before.find((b) => b.id === col.id)!;
    assert.ok(col.updatedAt > was.updatedAt, `${col.slug} not touched`);
  }
});

test("asking for a collection one cannot read gets the same answer whatever the slug", T, async () => {
  // an existing slug and a free one are answered alike when the collection is off limits
  await assert.rejects(createDocument(input(closed.id, "secret"), editorOut), /Koleksi tidak ditemukan/);
  await assert.rejects(createDocument({ ...input(closed.id, "secret"), slug: secret.slug }, editorOut), /Koleksi tidak ditemukan/);
  await assert.rejects(createDocument(input(closed.id, `bebas-${tag}`), editorOut), /Koleksi tidak ditemukan/);
});

test("the restricted collections that feed the cache key are the restricted ones only", T, async () => {
  const listed = (await getRestrictedCollections()).map((c) => c.id);
  assert.ok(listed.includes(closed.id));
  assert.ok(!listed.includes(open.id));
});
