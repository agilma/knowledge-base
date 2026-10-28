import { test, after } from "node:test";
import assert from "node:assert/strict";
import { DocumentStatus, DocumentType } from "@prisma/client";
import { db } from "../db";
import { ADMIN, READER } from "./test-viewers";
import { searchDocuments, suggestDocumentTitles } from "./documents";
import { HIGHLIGHT_START, HIGHLIGHT_STOP, splitHighlights } from "../search-query";

/**
 * Runs against a real, migrated database (the index comes from migration
 * 3_fulltext_search). Skipped in CI, which has no database:
 *
 *   KB_DB_TESTS=1 DATABASE_URL=postgresql://... npm test
 *
 * Only touches rows it creates. Search words are random letters, so they cannot
 * match anything already in the database.
 */
const enabled = process.env.KB_DB_TESTS === "1";
const tag = `st${Date.now()}`;
const word = "zq" + Math.random().toString(36).replace(/[^a-z]/g, "").slice(0, 8);
const created = { documents: [] as string[], collections: [] as string[] };

async function makeCollection(n: number) {
  const collection = await db.collection.create({
    data: { slug: `${tag}-col-${n}`, name: `Test ${n}` },
  });
  created.collections.push(collection.id);
  return collection;
}

async function makeDocument(
  n: number,
  fields: {
    collectionId: string;
    status?: DocumentStatus;
    type?: DocumentType;
    title?: string;
    content?: string;
  }
) {
  const doc = await db.document.create({
    data: {
      slug: `${tag}-doc-${n}`,
      title: fields.title ?? `Judul ${n}`,
      content: fields.content ?? "isi",
      type: fields.type ?? DocumentType.PANDUAN,
      status: fields.status ?? DocumentStatus.PUBLISHED,
      collectionId: fields.collectionId,
    },
  });
  created.documents.push(doc.id);
  return doc;
}

after(async () => {
  if (!enabled) return;
  await db.document.deleteMany({ where: { id: { in: created.documents } } });
  await db.collection.deleteMany({ where: { id: { in: created.collections } } });
  await db.$disconnect();
});

test("viewers never see drafts or archives, and the total does not count them", { skip: !enabled }, async () => {
  const col = await makeCollection(1);
  const published = await makeDocument(1, { collectionId: col.id, content: `${word} terbit` });
  await makeDocument(2, { collectionId: col.id, status: DocumentStatus.DRAFT, content: `${word} draf` });
  await makeDocument(3, { collectionId: col.id, status: DocumentStatus.ARCHIVED, content: `${word} arsip` });

  const viewer = await searchDocuments(word, { viewer: READER });
  assert.deepEqual(viewer.results.map((d) => d.id), [published.id]);
  assert.equal(viewer.total, 1);

  const editor = await searchDocuments(word, { includeDrafts: true, viewer: ADMIN });
  assert.equal(editor.results.length, 3);
  assert.equal(editor.total, 3);
});

test("a title match ranks above a match only in the body", { skip: !enabled }, async () => {
  const col = await makeCollection(2);
  const body = await makeDocument(4, { collectionId: col.id, title: "Tidak relevan", content: `${word} ${word}` });
  const title = await makeDocument(5, { collectionId: col.id, title: `Soal ${word}`, content: "isi" });

  const { results } = await searchDocuments(word, { viewer: READER, collectionId: col.id });
  assert.deepEqual(results.map((d) => d.id), [title.id, body.id]);
});

test("collection and type filters narrow the results", { skip: !enabled }, async () => {
  const a = await makeCollection(3);
  const b = await makeCollection(4);
  const inA = await makeDocument(6, { collectionId: a.id, type: DocumentType.MASALAH, content: word });
  await makeDocument(7, { collectionId: b.id, type: DocumentType.REFERENSI, content: word });

  const byCollection = await searchDocuments(word, { viewer: READER, collectionId: a.id });
  assert.deepEqual(byCollection.results.map((d) => d.id), [inA.id]);

  const byType = await searchDocuments(word, { viewer: READER, type: DocumentType.REFERENSI, collectionId: b.id });
  assert.equal(byType.results.length, 1);
  assert.equal((await searchDocuments(word, { viewer: READER, type: DocumentType.PANDUAN, collectionId: a.id })).total, 0);
});

test("affixed forms match and are highlighted", { skip: !enabled }, async () => {
  const col = await makeCollection(5);
  await makeDocument(8, { collectionId: col.id, title: `Cara memotong ${word}`, content: "isi" });

  const { results } = await searchDocuments(`dipotong ${word}`, { viewer: READER, collectionId: col.id });
  assert.equal(results.length, 1);
  const marked = splitHighlights(results[0].titleHighlight).filter((s) => s.match).map((s) => s.text);
  assert.deepEqual(marked, ["memotong", word]);
});

test("strange input never throws", { skip: !enabled }, async () => {
  for (const q of ["", '"', "!!!&|:*()<->", "'; DROP TABLE documents; --", "\\", `${word} "`, "a".repeat(5000)]) {
    const { results } = await searchDocuments(q, { viewer: READER });
    assert.ok(Array.isArray(results), JSON.stringify(q));
  }
});

test("highlight marker characters inside a document cannot fake a match", { skip: !enabled }, async () => {
  const col = await makeCollection(6);
  await makeDocument(9, {
    collectionId: col.id,
    title: `Judul ${word}`,
    content: `sebelum ${HIGHLIGHT_START}palsu${HIGHLIGHT_STOP} sesudah ${word}`,
  });

  const { results } = await searchDocuments(word, { viewer: READER, collectionId: col.id });
  const marked = splitHighlights(results[0].snippet).filter((s) => s.match).map((s) => s.text);
  assert.ok(!marked.includes("palsu"), JSON.stringify(marked));
  assert.ok(marked.includes(word));
});

test("a synonym finds the document written with the other word", { skip: !enabled }, async () => {
  const col = await makeCollection(7);
  const doc = await makeDocument(10, { collectionId: col.id, title: `Tutup ${word}`, content: "kendala cashier saat closing" });

  const { results } = await searchDocuments(`${word} kasir`, { viewer: READER, collectionId: col.id });
  assert.deepEqual(results.map((d) => d.id), [doc.id]);
});

test("a misspelled title is suggested, and only to those who may read it", { skip: !enabled }, async () => {
  const col = await makeCollection(8);
  // its own word: titles of the other tests must not compete for the three places
  const own = "yv" + Math.random().toString(36).replace(/[^a-z]/g, "").slice(0, 8).padEnd(8, "k");
  const typo = own.slice(0, 6) + own.slice(7);
  const published = await makeDocument(11, { collectionId: col.id, title: `Panduan ${own} harian` });
  const draft = await makeDocument(12, { collectionId: col.id, status: DocumentStatus.DRAFT, title: `Rahasia ${own} draf` });

  assert.equal((await searchDocuments(typo, { viewer: READER, collectionId: col.id })).total, 0);

  const forReader = await suggestDocumentTitles(typo, { viewer: READER });
  assert.deepEqual(forReader.map((s) => s.slug), [published.slug]);

  const forEditor = await suggestDocumentTitles(typo, { viewer: ADMIN, includeDrafts: true });
  assert.deepEqual(forEditor.map((s) => s.slug).sort(), [published.slug, draft.slug].sort());

  assert.deepEqual(await suggestDocumentTitles("ab", { viewer: READER }), []);
  assert.deepEqual(await suggestDocumentTitles("!!!", { viewer: READER }), []);
});
