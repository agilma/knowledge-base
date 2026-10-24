import { test, after } from "node:test";
import assert from "node:assert/strict";
import { DocumentStatus, DocumentType } from "@prisma/client";
import { db } from "../db";
import { createDocument, setDocumentStatus, updateDocument } from "./documents";
import { getRevisionList } from "./revisions";
import { REVISION_LIMIT } from "../revisions";

/**
 * Against a real database: the rules that matter (a snapshot of what existed
 * before the first save, no revision for a save that changed nothing, distinct
 * version numbers when two saves race, the cap) live in the transaction. Skipped
 * in CI, which has no database.
 *
 *   KB_DB_TESTS=1 DATABASE_URL=postgresql://... npm test
 */
const enabled = process.env.KB_DB_TESTS === "1";
const tag = `rev${Date.now()}`;
const created = { documents: [] as string[], users: [] as string[] };

async function user(name: string) {
  const u = await db.user.create({ data: { email: `${tag}-${name}@x.test`, name } });
  created.users.push(u.id);
  return u;
}

async function collection() {
  return db.collection.upsert({
    where: { slug: `${tag}-col` },
    create: { slug: `${tag}-col`, name: "Test" },
    update: {},
  });
}

function input(collectionId: string, n: number, content = "## A\n\nisi", title = `Judul ${n}`) {
  return {
    title,
    slug: `${tag}-${n}`,
    collectionId,
    type: DocumentType.PANDUAN,
    excerpt: "",
    content,
    status: DocumentStatus.DRAFT,
  };
}

after(async () => {
  if (!enabled) return;
  await db.document.deleteMany({ where: { id: { in: created.documents } } });
  await db.collection.deleteMany({ where: { slug: `${tag}-col` } });
  await db.user.deleteMany({ where: { id: { in: created.users } } });
  await db.$disconnect();
});

test("a new document starts at version 1 and records who made it", { skip: !enabled }, async () => {
  const [col, ana] = [await collection(), await user("ana")];
  const doc = await createDocument(input(col.id, 1), ana.id);
  created.documents.push(doc.id);

  const list = await getRevisionList(doc.id);
  assert.deepEqual(list.map((r) => [r.version, r.editorName, r.sizeChange]), [[1, "ana", null]]);
  assert.equal((await db.document.findUnique({ where: { id: doc.id } }))?.lastEditedById, ana.id);
});

test("the first save of a document with no history keeps what was there as version 1", { skip: !enabled }, async () => {
  const [col, ana, budi] = [await collection(), await user("ana2"), await user("budi")];
  // written the way documents were before revisions existed: no revision row
  const legacy = await db.document.create({
    data: { ...input(col.id, 2, "## Lama\n\nteks lama"), excerpt: null, authorId: ana.id },
  });
  created.documents.push(legacy.id);

  await updateDocument(legacy.id, input(col.id, 2, "## Baru\n\nteks baru"), budi.id);

  const revisions = await db.documentRevision.findMany({
    where: { documentId: legacy.id },
    orderBy: { version: "asc" },
  });
  assert.deepEqual(revisions.map((r) => [r.version, r.content, r.editedById]), [
    [1, "## Lama\n\nteks lama", ana.id],
    [2, "## Baru\n\nteks baru", budi.id],
  ]);
});

test("a save that changes nothing adds no revision but still notes who saved", { skip: !enabled }, async () => {
  const [col, ana, budi] = [await collection(), await user("ana3"), await user("budi3")];
  const doc = await createDocument(input(col.id, 3, "## A\n\n- satu\n- dua"), ana.id);
  created.documents.push(doc.id);

  // the visual editor rewrites bullets on load; that is not an edit
  await updateDocument(doc.id, input(col.id, 3, "## A\n\n* satu\n* dua\n"), budi.id);

  assert.equal((await getRevisionList(doc.id)).length, 1);
  assert.equal((await db.document.findUnique({ where: { id: doc.id } }))?.lastEditedById, budi.id);
});

test("changing only the status is not a revision, but notes who did it", { skip: !enabled }, async () => {
  const [col, ana, budi] = [await collection(), await user("ana4"), await user("budi4")];
  const doc = await createDocument(input(col.id, 4), ana.id);
  created.documents.push(doc.id);

  await setDocumentStatus(doc.id, DocumentStatus.PUBLISHED, budi.id);

  assert.equal((await getRevisionList(doc.id)).length, 1);
  const after = await db.document.findUnique({ where: { id: doc.id } });
  assert.equal(after?.status, DocumentStatus.PUBLISHED);
  assert.equal(after?.lastEditedById, budi.id);
});

test("saves at the same moment get different version numbers", { skip: !enabled }, async () => {
  const [col, ana] = [await collection(), await user("ana5")];
  const doc = await createDocument(input(col.id, 5), ana.id);
  created.documents.push(doc.id);

  for (let round = 0; round < 8; round++) {
    await Promise.all(
      [1, 2, 3].map((k) => updateDocument(doc.id, input(col.id, 5, `## Putaran ${round}-${k}`), ana.id))
    );
  }
  const versions = (await getRevisionList(doc.id)).map((r) => r.version);
  assert.equal(new Set(versions).size, versions.length, "a version number was used twice");
  assert.equal(versions[0], Math.max(...versions));
});

test("only the latest versions are kept", { skip: !enabled }, async () => {
  const [col, ana] = [await collection(), await user("ana6")];
  const doc = await createDocument(input(col.id, 6, "## v1"), ana.id);
  created.documents.push(doc.id);

  const total = REVISION_LIMIT + 6;
  for (let n = 2; n <= total; n++) {
    await updateDocument(doc.id, input(col.id, 6, `## v${n}`), ana.id);
  }
  const list = await getRevisionList(doc.id);
  assert.equal(list.length, REVISION_LIMIT);
  assert.equal(list[0].version, total, "the newest version must be kept");
  assert.equal(list[list.length - 1].version, total - REVISION_LIMIT + 1, "the oldest kept version");
});
