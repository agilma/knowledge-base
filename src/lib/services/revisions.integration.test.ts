import { test, after } from "node:test";
import assert from "node:assert/strict";
import { DocumentStatus, DocumentType, Role } from "@prisma/client";
import { db } from "../db";
import { createDocument, setDocumentStatus, updateDocument } from "./documents";
import { getRevisionList, restoreRevision } from "./revisions";
import { ADMIN } from "./test-viewers";
import { REVISION_LIMIT } from "../revisions";

/** The editor a test acts as. */
const actor = (user: { id: string }) => ({ id: user.id, role: Role.EDITOR });

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
  const doc = await createDocument(input(col.id, 1), actor(ana));
  created.documents.push(doc.id);

  const list = await getRevisionList(doc.id, ADMIN);
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

  await updateDocument(legacy.id, input(col.id, 2, "## Baru\n\nteks baru"), actor(budi));

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
  const doc = await createDocument(input(col.id, 3, "## A\n\n- satu\n- dua"), actor(ana));
  created.documents.push(doc.id);

  // the visual editor rewrites bullets on load; that is not an edit
  await updateDocument(doc.id, input(col.id, 3, "## A\n\n* satu\n* dua\n"), actor(budi));

  assert.equal((await getRevisionList(doc.id, ADMIN)).length, 1);
  assert.equal((await db.document.findUnique({ where: { id: doc.id } }))?.lastEditedById, budi.id);
});

test("publishing, archiving and returning to draft each become a version", { skip: !enabled }, async () => {
  const [col, ana, budi] = [await collection(), await user("ana4"), await user("budi4")];
  const doc = await createDocument(input(col.id, 4), actor(ana));
  created.documents.push(doc.id);

  await setDocumentStatus(doc.id, DocumentStatus.PUBLISHED, actor(budi));
  await setDocumentStatus(doc.id, DocumentStatus.ARCHIVED, actor(ana));
  await setDocumentStatus(doc.id, DocumentStatus.DRAFT, actor(budi));

  const list = await getRevisionList(doc.id, ADMIN); // newest first
  assert.deepEqual(
    list.map((r) => [r.version, r.status, r.statusLabel, r.editorName]),
    [
      [4, "DRAFT", "Dikembalikan ke draf", "budi4"],
      [3, "ARCHIVED", "Diarsipkan", "ana4"],
      [2, "PUBLISHED", "Diterbitkan", "budi4"],
      [1, "DRAFT", null, "ana4"],
    ]
  );
  // the text did not change, so the size did not either
  assert.deepEqual(list.map((r) => r.sizeChange), [0, 0, 0, null]);
  assert.equal((await db.document.findUnique({ where: { id: doc.id } }))?.status, DocumentStatus.DRAFT);
});

test("setting the status a document already has records nothing", { skip: !enabled }, async () => {
  const [col, ana, budi] = [await collection(), await user("ana8"), await user("budi8")];
  const doc = await createDocument(input(col.id, 8), actor(ana));
  created.documents.push(doc.id);

  await setDocumentStatus(doc.id, DocumentStatus.DRAFT, actor(budi));

  assert.equal((await getRevisionList(doc.id, ADMIN)).length, 1);
  // and it does not pretend somebody edited it
  assert.equal((await db.document.findUnique({ where: { id: doc.id } }))?.lastEditedById, ana.id);
});

test("an invalid status is rejected and records nothing", { skip: !enabled }, async () => {
  const [col, ana] = [await collection(), await user("ana21")];
  const doc = await createDocument(input(col.id, 21), actor(ana));
  created.documents.push(doc.id);

  for (const bad of [undefined, null, "BOGUS"]) {
    await assert.rejects(setDocumentStatus(doc.id, bad as unknown as DocumentStatus, actor(ana)), /tidak valid/);
  }

  assert.equal((await getRevisionList(doc.id, ADMIN)).length, 1);
});

test("a status change made with the text is one version, not two", { skip: !enabled }, async () => {
  const [col, ana] = [await collection(), await user("ana9")];
  const doc = await createDocument(input(col.id, 9, "## lama"), actor(ana));
  created.documents.push(doc.id);

  await updateDocument(
    doc.id,
    { ...input(col.id, 9, "## baru"), status: DocumentStatus.PUBLISHED },
    actor(ana)
  );

  const list = await getRevisionList(doc.id, ADMIN);
  assert.deepEqual(list.map((r) => [r.version, r.status, r.statusLabel]), [
    [2, "PUBLISHED", "Diterbitkan"],
    [1, "DRAFT", null],
  ]);
});

test("a save from the form that only changes the status is a version too", { skip: !enabled }, async () => {
  const [col, ana] = [await collection(), await user("ana10")];
  const doc = await createDocument(input(col.id, 10, "## sama"), actor(ana));
  created.documents.push(doc.id);

  // the form sends the text back unchanged, with a different status
  await updateDocument(doc.id, { ...input(col.id, 10, "## sama"), status: DocumentStatus.ARCHIVED }, actor(ana));

  assert.deepEqual((await getRevisionList(doc.id, ADMIN)).map((r) => [r.status, r.statusLabel]), [
    ["ARCHIVED", "Diarsipkan"],
    ["DRAFT", null],
  ]);
});

test("a document with no history keeps its old status as version 1 on a status change", { skip: !enabled }, async () => {
  const [col, ana, budi] = [await collection(), await user("ana11"), await user("budi11")];
  const legacy = await db.document.create({
    data: {
      ...input(col.id, 11, "## teks"),
      excerpt: null,
      status: DocumentStatus.PUBLISHED,
      authorId: ana.id,
    },
  });
  created.documents.push(legacy.id);

  await setDocumentStatus(legacy.id, DocumentStatus.ARCHIVED, actor(budi));

  const revisions = await db.documentRevision.findMany({
    where: { documentId: legacy.id },
    orderBy: { version: "asc" },
  });
  assert.deepEqual(revisions.map((r) => [r.version, r.status, r.editedById]), [
    [1, DocumentStatus.PUBLISHED, ana.id],
    [2, DocumentStatus.ARCHIVED, budi.id],
  ]);
});

test("a status change and a text edit at the same moment leave history agreeing with the document", { skip: !enabled }, async () => {
  const [col, ana, budi] = [await collection(), await user("ana12"), await user("budi12")];
  for (let round = 0; round < 15; round++) {
    const doc = await createDocument(input(col.id, 1200 + round, "## awal"), actor(ana));
    created.documents.push(doc.id);
    await Promise.all([
      setDocumentStatus(doc.id, DocumentStatus.PUBLISHED, actor(budi)),
      updateDocument(doc.id, { ...input(col.id, 1200 + round, "## edit"), status: DocumentStatus.DRAFT }, actor(ana)),
    ]);
    const [current, latest] = await Promise.all([
      db.document.findUnique({ where: { id: doc.id } }),
      db.documentRevision.findFirst({ where: { documentId: doc.id }, orderBy: { version: "desc" } }),
    ]);
    assert.equal(latest?.status, current?.status, `round ${round}: status ${current?.status} vs history ${latest?.status}`);
    assert.equal(latest?.content, current?.content, `round ${round}: text differs from history`);
  }
});

test("saves at the same moment get different version numbers", { skip: !enabled }, async () => {
  const [col, ana] = [await collection(), await user("ana5")];
  const doc = await createDocument(input(col.id, 5), actor(ana));
  created.documents.push(doc.id);

  for (let round = 0; round < 8; round++) {
    await Promise.all(
      [1, 2, 3].map((k) => updateDocument(doc.id, input(col.id, 5, `## Putaran ${round}-${k}`), actor(ana)))
    );
  }
  const versions = (await getRevisionList(doc.id, ADMIN)).map((r) => r.version);
  assert.equal(new Set(versions).size, versions.length, "a version number was used twice");
  assert.equal(versions[0], Math.max(...versions));
});

test("a save that read an older copy cannot silently revert a newer one", { skip: !enabled }, async () => {
  const [col, ana, budi] = [await collection(), await user("ana7"), await user("budi7")];
  // A edits while B, who opened the original, saves it unchanged at the same moment.
  // Whichever commits last, the current text must be the latest version in history.
  for (let round = 0; round < 20; round++) {
    const doc = await createDocument(input(col.id, 700 + round, "## orig"), actor(ana));
    created.documents.push(doc.id);
    await Promise.all([
      updateDocument(doc.id, input(col.id, 700 + round, "## A edit"), actor(ana)),
      updateDocument(doc.id, input(col.id, 700 + round, "## orig"), actor(budi)),
    ]);
    const [current, latest] = await Promise.all([
      db.document.findUnique({ where: { id: doc.id } }),
      db.documentRevision.findFirst({ where: { documentId: doc.id }, orderBy: { version: "desc" } }),
    ]);
    assert.equal(
      latest?.content,
      current?.content,
      `round ${round}: the document reads "${current?.content}" but history ends at "${latest?.content}"`
    );
  }
});

test("only the latest versions are kept", { skip: !enabled }, async () => {
  const [col, ana] = [await collection(), await user("ana6")];
  const doc = await createDocument(input(col.id, 6, "## v1"), actor(ana));
  created.documents.push(doc.id);

  const total = REVISION_LIMIT + 6;
  for (let n = 2; n <= total; n++) {
    await updateDocument(doc.id, input(col.id, 6, `## v${n}`), actor(ana));
  }
  const list = await getRevisionList(doc.id, ADMIN);
  assert.equal(list.length, REVISION_LIMIT);
  assert.equal(list[0].version, total, "the newest version must be kept");
  assert.equal(list[list.length - 1].version, total - REVISION_LIMIT + 1, "the oldest kept version");
});

test("restoring a version puts its text back as a new version and keeps slug, collection and status", { skip: !enabled }, async () => {
  const u = await user("restorer");
  const col = await collection();
  const doc = await createDocument({ ...input(col.id, 90, "## Satu\n\nisi awal", "Judul awal"), status: DocumentStatus.PUBLISHED }, actor(u));
  created.documents.push(doc.id);
  await updateDocument(doc.id, { ...input(col.id, 90, "## Dua\n\nisi baru", "Judul baru"), slug: doc.slug, status: DocumentStatus.PUBLISHED }, actor(u));
  const before = await getRevisionList(doc.id, actor(u));
  assert.ok(before.length >= 2);
  const oldest = before[before.length - 1].version;

  const result = await restoreRevision(doc.id, oldest, actor(u));
  assert.equal(result.changed, true);
  const now = await db.document.findUniqueOrThrow({ where: { id: doc.id } });
  assert.equal(now.content, "## Satu\n\nisi awal");
  assert.equal(now.title, "Judul awal");
  assert.equal(now.slug, doc.slug);
  assert.equal(now.status, DocumentStatus.PUBLISHED);
  assert.equal(now.collectionId, col.id);
  const after = await getRevisionList(doc.id, actor(u));
  assert.equal(after.length, before.length + 1, "the restore is one more version, nothing removed");

  assert.equal((await restoreRevision(doc.id, oldest, actor(u))).changed, false, "restoring what is already there changes nothing");
  assert.equal((await getRevisionList(doc.id, actor(u))).length, after.length);
});

test("restoring keeps an archived or draft document as it is, and never uses another document's version", { skip: !enabled }, async () => {
  const u = await user("restorer3");
  const col = await collection();
  const a = await createDocument(input(col.id, 92, "## A1\n\ntext a1"), actor(u));
  const b = await createDocument(input(col.id, 93, "## B1\n\ntext b1"), actor(u));
  created.documents.push(a.id, b.id);
  await updateDocument(a.id, { ...input(col.id, 92, "## A2\n\ntext a2"), slug: a.slug }, actor(u));
  await setDocumentStatus(a.id, DocumentStatus.ARCHIVED, actor(u));
  // b has versions 1 and 2; a has more, so ask a for a version number only b could hold
  await updateDocument(b.id, { ...input(col.id, 93, "## B2\n\ntext b2"), slug: b.slug }, actor(u));
  const bOnly = (await getRevisionList(b.id, ADMIN)).length + 5;
  await assert.rejects(restoreRevision(a.id, bOnly, actor(u)), /Versi tidak ditemukan/);

  const result = await restoreRevision(a.id, 1, actor(u));
  assert.equal(result.changed, true);
  const now = await db.document.findUniqueOrThrow({ where: { id: a.id } });
  assert.equal(now.content, "## A1\n\ntext a1");
  assert.equal(now.status, DocumentStatus.ARCHIVED, "restoring text does not publish or unarchive");
});

test("restoring a version that only changed the status, with the same text, changes nothing", { skip: !enabled }, async () => {
  const u = await user("restorer4");
  const col = await collection();
  const doc = await createDocument(input(col.id, 94, "## Sama\n\nisi"), actor(u));
  created.documents.push(doc.id);
  await setDocumentStatus(doc.id, DocumentStatus.PUBLISHED, actor(u));
  const versions = await getRevisionList(doc.id, ADMIN);
  const first = versions[versions.length - 1].version;
  assert.equal((await restoreRevision(doc.id, first, actor(u))).changed, false);
});

test("a version that does not exist, or a role that cannot edit, cannot be restored", { skip: !enabled }, async () => {
  const u = await user("restorer2");
  const col = await collection();
  const doc = await createDocument(input(col.id, 91), actor(u));
  created.documents.push(doc.id);
  await assert.rejects(restoreRevision(doc.id, 999, actor(u)), /Versi tidak ditemukan/);
  await assert.rejects(restoreRevision(doc.id, 1, { id: u.id, role: Role.VIEWER }), /Tidak berwenang/);
});
