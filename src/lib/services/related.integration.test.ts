import { test, after } from "node:test";
import assert from "node:assert/strict";
import { DocumentStatus, DocumentType } from "@prisma/client";
import { db } from "../db";
import {
  getRelatedDocumentIds,
  getRelatedDocuments,
  setRelatedDocuments,
} from "./documents";
import { MAX_RELATED } from "../related";

/**
 * Against a real database: the point is that a relation reads the same from
 * both ends and that readers never see drafts through it. Skipped in CI.
 *
 *   KB_DB_TESTS=1 DATABASE_URL=postgresql://... npm test
 */
const enabled = process.env.KB_DB_TESTS === "1";
const tag = `rel${Date.now()}`;
const created: string[] = [];

async function make(n: number, status: DocumentStatus = DocumentStatus.PUBLISHED) {
  const collection = await db.collection.upsert({
    where: { slug: `${tag}-col` },
    create: { slug: `${tag}-col`, name: "Test" },
    update: {},
  });
  const doc = await db.document.create({
    data: {
      slug: `${tag}-${n}`,
      title: `Doc ${String(n).padStart(3, "0")}`,
      content: "x",
      type: DocumentType.PANDUAN,
      status,
      collectionId: collection.id,
    },
  });
  created.push(doc.id);
  return doc;
}

after(async () => {
  if (!enabled) return;
  await db.documentRelation.deleteMany({
    where: { OR: [{ fromId: { in: created } }, { toId: { in: created } }] },
  });
  await db.document.deleteMany({ where: { id: { in: created } } });
  await db.collection.deleteMany({ where: { slug: `${tag}-col` } });
  await db.$disconnect();
});

test("a relation written from one side reads from both", { skip: !enabled }, async () => {
  const [a, b] = [await make(1), await make(2)];
  await setRelatedDocuments(a.id, [b.id]);

  assert.deepEqual(await getRelatedDocumentIds(a.id), [b.id]);
  assert.deepEqual(await getRelatedDocumentIds(b.id), [a.id]);
  assert.deepEqual((await getRelatedDocuments(b.id)).map((d) => d.id), [a.id]);
});

test("removing from the other side removes the pair, not just a direction", { skip: !enabled }, async () => {
  const [a, b] = [await make(3), await make(4)];
  await setRelatedDocuments(a.id, [b.id]);
  await setRelatedDocuments(b.id, []);

  assert.deepEqual(await getRelatedDocumentIds(a.id), []);
  assert.equal(await db.documentRelation.count({ where: { OR: [{ fromId: a.id, toId: b.id }, { fromId: b.id, toId: a.id }] } }), 0);
});

test("adding a pair that exists the other way does not duplicate it", { skip: !enabled }, async () => {
  const [a, b] = [await make(5), await make(6)];
  await setRelatedDocuments(a.id, [b.id]);
  await setRelatedDocuments(b.id, [a.id]);

  const rows = await db.documentRelation.count({
    where: { OR: [{ fromId: a.id, toId: b.id }, { fromId: b.id, toId: a.id }] },
  });
  assert.equal(rows, 1);
});

test("two documents saved at the same moment, each pointing at the other, store one pair", { skip: !enabled }, async () => {
  // A per-document lock lets these interleave; repeat so a race cannot hide.
  for (let round = 0; round < 15; round++) {
    const [a, b] = [await make(200 + round * 2), await make(201 + round * 2)];
    await Promise.all([setRelatedDocuments(a.id, [b.id]), setRelatedDocuments(b.id, [a.id])]);
    const rows = await db.documentRelation.count({
      where: { OR: [{ fromId: a.id, toId: b.id }, { fromId: b.id, toId: a.id }] },
    });
    assert.equal(rows, 1, `round ${round}: the pair was stored ${rows} times`);
  }
});

test("saving the same list twice at once leaves one row per pair", { skip: !enabled }, async () => {
  const [a, b, c] = [await make(7), await make(8), await make(9)];
  await Promise.all([setRelatedDocuments(a.id, [b.id, c.id]), setRelatedDocuments(a.id, [b.id, c.id])]);
  const rows = await db.documentRelation.findMany({ where: { fromId: a.id } });
  assert.equal(rows.length, 2);
});

test("a document never relates to itself, and unknown ids are ignored", { skip: !enabled }, async () => {
  const [a, b] = [await make(10), await make(11)];
  await setRelatedDocuments(a.id, [a.id, "does-not-exist", b.id]);
  assert.deepEqual(await getRelatedDocumentIds(a.id), [b.id]);
});

test("a reader does not see a draft through a relation; an editor does", { skip: !enabled }, async () => {
  const published = await make(12);
  const draft = await make(13, DocumentStatus.DRAFT);
  await setRelatedDocuments(published.id, [draft.id]);

  assert.deepEqual(await getRelatedDocuments(published.id), []);
  assert.deepEqual((await getRelatedDocuments(published.id, { includeDrafts: true })).map((d) => d.id), [draft.id]);
  // From the draft's side, the published document is visible to everyone.
  assert.deepEqual((await getRelatedDocuments(draft.id)).map((d) => d.id), [published.id]);
});

test("the list is capped", { skip: !enabled }, async () => {
  const hub = await make(14);
  const others = [];
  for (let i = 0; i < MAX_RELATED + 3; i++) others.push((await make(100 + i)).id);
  await setRelatedDocuments(hub.id, others);
  assert.equal((await getRelatedDocumentIds(hub.id)).length, MAX_RELATED);
});
