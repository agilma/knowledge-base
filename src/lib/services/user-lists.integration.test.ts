import { test, after } from "node:test";
import assert from "node:assert/strict";
import { DocumentStatus, DocumentType, Role } from "@prisma/client";
import { db } from "../db";
import { setFavorite, getFavoriteDocuments } from "./favorites";
import { recordView, getRecentDocuments } from "./recent-views";
import { RECENT_LIMIT } from "../user-documents";

/**
 * Runs against a real database, because the bugs worth catching here live in
 * the transaction and the visibility checks, not in the pure helpers. CI has no
 * database, so it is skipped unless asked for:
 *
 *   KB_DB_TESTS=1 DATABASE_URL=postgresql://... npm test
 *
 * It only touches rows it creates, all tagged with a unique prefix.
 */
const enabled = process.env.KB_DB_TESTS === "1";
const tag = `it${Date.now()}`;
const userId = `${tag}-user`;
const created = { documents: [] as string[] };

async function makeDocument(status: DocumentStatus, n: number) {
  const collection = await db.collection.upsert({
    where: { slug: `${tag}-col` },
    create: { slug: `${tag}-col`, name: "Test" },
    update: {},
  });
  const doc = await db.document.create({
    data: {
      slug: `${tag}-doc-${n}`,
      title: `Doc ${n}`,
      content: "x",
      type: DocumentType.PANDUAN,
      status,
      collectionId: collection.id,
    },
  });
  created.documents.push(doc.id);
  return doc;
}

after(async () => {
  if (!enabled) return;
  await db.recentView.deleteMany({ where: { userId } });
  await db.favorite.deleteMany({ where: { userId } });
  await db.document.deleteMany({ where: { id: { in: created.documents } } });
  await db.collection.deleteMany({ where: { slug: `${tag}-col` } });
  await db.$disconnect();
});

test("two simultaneous views of one document leave a single row", { skip: !enabled }, async () => {
  const doc = await makeDocument(DocumentStatus.PUBLISHED, 1);
  for (let i = 0; i < 10; i++) {
    await Promise.all([
      recordView(userId, doc.id, Role.VIEWER),
      recordView(userId, doc.id, Role.VIEWER),
      recordView(userId, doc.id, Role.VIEWER),
    ]);
    const rows = await db.recentView.count({ where: { userId, entityId: doc.id } });
    assert.equal(rows, 1, `round ${i}: expected one row, got ${rows}`);
  }
  const listed = await getRecentDocuments(userId, Role.VIEWER);
  assert.equal(listed.filter((d) => d.id === doc.id).length, 1);
});

test("a viewer cannot favourite or record a draft", { skip: !enabled }, async () => {
  const draft = await makeDocument(DocumentStatus.DRAFT, 2);
  assert.equal(await setFavorite(userId, draft.id, true, Role.VIEWER), false);
  assert.equal(await recordView(userId, draft.id, Role.VIEWER), false);
  assert.equal(await db.favorite.count({ where: { userId, entityId: draft.id } }), 0);
  assert.equal(await db.recentView.count({ where: { userId, entityId: draft.id } }), 0);

  assert.equal(await setFavorite(userId, draft.id, true, Role.EDITOR), true);
  assert.equal((await getFavoriteDocuments(userId, Role.EDITOR)).some((d) => d.id === draft.id), true);
  assert.equal((await getFavoriteDocuments(userId, Role.VIEWER)).some((d) => d.id === draft.id), false);
});

test("the history is trimmed to the limit, newest first", { skip: !enabled }, async () => {
  const ids: string[] = [];
  for (let n = 0; n < RECENT_LIMIT + 5; n++) {
    ids.push((await makeDocument(DocumentStatus.PUBLISHED, 100 + n)).id);
  }
  for (const id of ids) await recordView(userId, id, Role.VIEWER);

  const total = await db.recentView.count({ where: { userId } });
  assert.equal(total, RECENT_LIMIT);
  const listed = await getRecentDocuments(userId, Role.VIEWER);
  assert.equal(listed[0].id, ids[ids.length - 1]);
});
