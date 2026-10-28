import { test, after } from "node:test";
import assert from "node:assert/strict";
import { DocumentStatus, Role } from "@prisma/client";
import { db } from "../db";
import { ADMIN } from "./test-viewers";
import { searchDocuments } from "./documents";
import { deleteTrashedForever, listTrash, purgeTrash, restoreTrashedDocument, trashDocument, TRASH_RETENTION_DAYS } from "./trash";

/**
 * Against a real database: the move is a transaction over several tables.
 *
 *   KB_DB_TESTS=1 DATABASE_URL=postgresql://... npm test
 */
const enabled = process.env.KB_DB_TESTS === "1";
const tag = `tr${Date.now().toString(36)}`;
const word = "wq" + Math.random().toString(36).replace(/[^a-z]/g, "").slice(0, 8).padEnd(8, "z");
const ids = { users: [] as string[], documents: [] as string[], collections: [] as string[] };

async function makeUser(n: number, role: Role = Role.EDITOR) {
  const user = await db.user.create({ data: { email: `${tag}-${n}@test.local`, name: `Orang ${n}`, role } });
  ids.users.push(user.id);
  return user;
}

after(async () => {
  if (!enabled) return;
  await db.trashedDocument.deleteMany({ where: { slug: { startsWith: tag } } });
  await db.document.deleteMany({ where: { slug: { startsWith: tag } } });
  await db.collection.deleteMany({ where: { slug: { startsWith: tag } } });
  await db.user.deleteMany({ where: { id: { in: ids.users } } });
  await db.$disconnect();
});

test("deleting moves a document out of every query, restoring brings back all of it", { skip: !enabled }, async () => {
  const admin = await makeUser(1, Role.ADMIN);
  const author = await makeUser(2);
  const member = await makeUser(3);
  const col = await db.collection.create({ data: { slug: `${tag}-col`, name: "Koleksi uji" } });
  ids.collections.push(col.id);
  const other = await db.document.create({ data: { slug: `${tag}-other`, title: "Lain", content: "x", collectionId: col.id } });
  const doc = await db.document.create({
    data: {
      slug: `${tag}-a`,
      title: `Judul ${word}`,
      content: `isi ${word}`,
      status: DocumentStatus.PUBLISHED,
      restricted: true,
      collectionId: col.id,
      authorId: author.id,
      revisions: {
        create: [
          { version: 1, title: "v1", content: "satu", type: "PANDUAN", status: "DRAFT", editedById: author.id },
          { version: 2, title: "v2", content: "dua", type: "PANDUAN", status: "PUBLISHED", editedById: member.id },
        ],
      },
      members: { create: [{ userId: member.id }] },
      relatedFrom: { create: [{ toId: other.id }] },
      relatedTo: { create: [{ fromId: other.id }] },
    },
  });
  const viewer = { id: admin.id, role: Role.ADMIN };

  await trashDocument(doc.id, viewer);
  assert.equal(await db.document.count({ where: { id: doc.id } }), 0);
  assert.equal(await db.documentRevision.count({ where: { documentId: doc.id } }), 0);
  assert.equal((await searchDocuments(word, { viewer, includeDrafts: true })).total, 0, "trashed documents are not searchable");
  const list = (await listTrash(viewer)).filter((i) => i.slug === `${tag}-a`);
  assert.equal(list.length, 1);
  assert.equal(list[0].daysLeft, TRASH_RETENTION_DAYS);
  assert.equal(list[0].deletedByName, "Orang 1");

  // someone took the slug meanwhile, and one person was deleted
  await db.document.create({ data: { slug: `${tag}-a`, title: "Pengganti", content: "y", collectionId: col.id } });
  await db.user.delete({ where: { id: member.id } });

  const { slug } = await restoreTrashedDocument(list[0].id, viewer);
  assert.equal(slug, `${tag}-a-pulih`);
  const back = await db.document.findUniqueOrThrow({
    where: { id: doc.id },
    include: { revisions: { orderBy: { version: "asc" } }, members: true, relatedFrom: true, relatedTo: true },
  });
  assert.equal(back.title, `Judul ${word}`);
  assert.equal(back.status, DocumentStatus.PUBLISHED);
  assert.equal(back.restricted, true);
  assert.equal(back.authorId, author.id);
  assert.equal(back.createdAt.getTime(), doc.createdAt.getTime());
  assert.equal(back.updatedAt.getTime(), doc.updatedAt.getTime(), "restoring is not an edit");
  assert.deepEqual(back.revisions.map((r) => [r.version, r.editedById]), [[1, author.id], [2, null]], "a deleted editor becomes unknown");
  assert.equal(back.members.length, 0, "a deleted member is not restored");
  assert.equal(back.relatedFrom.length, 1);
  assert.equal(back.relatedTo.length, 1);
  assert.equal((await searchDocuments(word, { viewer, includeDrafts: true })).total, 1);
  assert.equal(await db.trashedDocument.count({ where: { documentId: doc.id } }), 0);
  await assert.rejects(restoreTrashedDocument(list[0].id, viewer), /tidak ada di tempat sampah/);
});

test("only an admin can trash, restore or empty; someone who cannot read it learns nothing", { skip: !enabled }, async () => {
  const col = await db.collection.create({ data: { slug: `${tag}-col2`, name: "Koleksi dua" } });
  ids.collections.push(col.id);
  const doc = await db.document.create({ data: { slug: `${tag}-b`, title: "B", content: "b", collectionId: col.id } });
  const editor = { id: "test-editor", role: Role.EDITOR };

  await assert.rejects(trashDocument(doc.id, editor), /Hanya admin/);
  assert.equal(await db.document.count({ where: { id: doc.id } }), 1);
  await trashDocument(doc.id, ADMIN);
  const row = await db.trashedDocument.findUniqueOrThrow({ where: { documentId: doc.id } });
  await assert.rejects(restoreTrashedDocument(row.id, editor), /Hanya admin/);
  await assert.rejects(listTrash(editor), /Hanya admin/);
  assert.equal(await deleteTrashedForever(row.id, ADMIN), true);
  assert.equal(await deleteTrashedForever(row.id, ADMIN), false);
});

test("a document whose collection is gone stays in the trash; old entries are purged", { skip: !enabled }, async () => {
  const col = await db.collection.create({ data: { slug: `${tag}-col3`, name: "Koleksi tiga" } });
  const doc = await db.document.create({ data: { slug: `${tag}-c`, title: "C", content: "c", collectionId: col.id } });
  await trashDocument(doc.id, ADMIN);
  await db.collection.delete({ where: { id: col.id } });
  const row = await db.trashedDocument.findUniqueOrThrow({ where: { documentId: doc.id } });
  await assert.rejects(restoreTrashedDocument(row.id, ADMIN), /koleksinya lagi/);
  assert.equal(await db.trashedDocument.count({ where: { id: row.id } }), 1, "the failed restore left it in the trash");

  await db.trashedDocument.update({ where: { id: row.id }, data: { deletedAt: new Date(Date.now() - (TRASH_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000) } });
  await purgeTrash(Date.now(), true);
  assert.equal(await db.trashedDocument.count({ where: { id: row.id } }), 0);
});
