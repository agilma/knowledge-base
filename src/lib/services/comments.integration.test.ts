import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { DocumentStatus, Role } from "@prisma/client";
import { db } from "../db";
import type { Viewer } from "../collection-access";
import { addFeedback, addReply, countOpen, deleteComment, FEEDBACK_PER_HOUR, listInbox, listThreads, setResolved } from "./comments";
import { restoreTrashedDocument, trashDocument } from "./trash";

/**
 * Reader notes: who sees what, the limit, the thread rules. Against a real database; skipped in CI.
 *
 *   KB_DB_TESTS=1 DATABASE_URL=postgresql://... npm test
 */
const enabled = process.env.KB_DB_TESTS === "1";
const tag = `cm${Date.now().toString(36)}`;
const T = { skip: !enabled };
const created = { users: [] as string[], collections: [] as string[] };
let admin: Viewer, editor: Viewer, ana: Viewer, budi: Viewer;
let docId: string, secretId: string, draftId: string;

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
  const open = await db.collection.create({ data: { slug: `${tag}-open`, name: `Terbuka ${tag}` } });
  const closed = await db.collection.create({ data: { slug: `${tag}-closed`, name: `Tertutup ${tag}`, restricted: true } });
  created.collections.push(open.id, closed.id);
  docId = (await db.document.create({ data: { slug: `${tag}-doc`, title: "Panduan", content: "isi", status: DocumentStatus.PUBLISHED, collectionId: open.id } })).id;
  draftId = (await db.document.create({ data: { slug: `${tag}-draft`, title: "Draf", content: "isi", status: DocumentStatus.DRAFT, collectionId: open.id } })).id;
  secretId = (await db.document.create({ data: { slug: `${tag}-secret`, title: "Rahasia", content: "isi", status: DocumentStatus.PUBLISHED, collectionId: closed.id } })).id;
});

after(async () => {
  if (!enabled) return;
  await db.trashedDocument.deleteMany({ where: { collectionId: { in: created.collections } } });
  await db.document.deleteMany({ where: { collectionId: { in: created.collections } } });
  await db.collection.deleteMany({ where: { id: { in: created.collections } } });
  await db.user.deleteMany({ where: { id: { in: created.users } } });
  await db.$disconnect();
});

test("a reader's note is seen by its author and by editors, not by other readers", T, async () => {
  const { id } = await addFeedback(docId, "  Langkah 3 kurang jelas.  ", ana);
  assert.equal((await listThreads(docId, ana)).length, 1);
  assert.equal((await listThreads(docId, budi)).length, 0, "another reader sees nothing");
  const forEditor = await listThreads(docId, editor);
  assert.equal(forEditor.length, 1);
  assert.equal(forEditor[0].body, "Langkah 3 kurang jelas.");
  assert.ok(forEditor[0].authorName?.startsWith("ana"), "staff see who wrote it");
  assert.equal((await listThreads(docId, ana))[0].authorName, null, "the writer is shown as 'Anda', not by name");
  assert.equal((await listThreads(docId, ana))[0].mine, true);

  // other readers cannot reply, resolve or delete it, and are told it does not exist
  await assert.rejects(addReply(id, "numpang", budi), /tidak ditemukan/);
  await assert.rejects(setResolved(id, true, ana), /penyunting/);
  await assert.rejects(setResolved(id, true, budi), /penyunting/);
  await assert.rejects(deleteComment(id, budi), /tidak ditemukan/);
});

test("replies, resolving, and the author reopening a resolved thread", T, async () => {
  const { id } = await addFeedback(docId, "Gambar tidak muncul", budi);
  await addReply(id, "Terima kasih, kami cek.", editor);
  await setResolved(id, true, editor);
  let thread = (await listThreads(docId, budi)).find((t) => t.id === id)!;
  assert.equal(thread.resolved, true);
  assert.equal(thread.replies.length, 1);
  assert.equal(thread.replies[0].staff, true, "a reply from an editor is marked as theirs");

  await addReply(id, "Masih belum muncul.", budi);
  thread = (await listThreads(docId, budi)).find((t) => t.id === id)!;
  assert.equal(thread.resolved, false, "the reader answering reopens it");
  assert.equal(thread.replies.length, 2);

  assert.ok((await countOpen(editor)) >= 1);
  const open = await listInbox(editor, "open");
  assert.ok(open.some((t) => t.id === id && t.document.slug === `${tag}-doc`));
  await setResolved(id, true, admin);
  assert.ok((await listInbox(editor, "resolved")).some((t) => t.id === id));
  await assert.rejects(listInbox(ana), /penyunting/);
  assert.equal(await countOpen(ana), 0);
});

test("only a document the reader may read can be written on, and a draft is for staff", T, async () => {
  await assert.rejects(addFeedback(secretId, "tembus?", ana), /tidak ditemukan/);
  await assert.rejects(addFeedback(draftId, "draf?", ana), /tidak ditemukan/);
  await addFeedback(draftId, "Draf perlu dicek", editor);
  await assert.rejects(addFeedback("tidak-ada", "halo!!", ana), /tidak ditemukan/);
  // an editor outside the restricted collection cannot read it either, so the inbox leaves it out
  assert.deepEqual(await listThreads(secretId, editor), []);
  await addFeedback(secretId, "Dari admin", admin);
  assert.ok(!(await listInbox(editor, "open")).some((t) => t.document.slug === `${tag}-secret`));
  assert.ok((await listInbox(admin, "open")).some((t) => t.document.slug === `${tag}-secret`));
});

test("text is validated, and one person is limited per hour", T, async () => {
  await assert.rejects(addFeedback(docId, "ab", ana), /minimal/);
  await assert.rejects(addFeedback(docId, "x".repeat(1001), ana), /maksimal/);
  const cara = await user("cara", Role.VIEWER);
  for (let i = 0; i < FEEDBACK_PER_HOUR; i++) await addFeedback(docId, `Catatan nomor ${i}`, cara);
  await assert.rejects(addFeedback(docId, "satu lagi", cara), /Terlalu banyak/);
  // the limit is per person: another reader is not held back
  await addFeedback(docId, "Dari orang lain", budi);
  // at the same moment, the limit still holds
  const dina = await user("dina", Role.VIEWER);
  const results = await Promise.allSettled(Array.from({ length: FEEDBACK_PER_HOUR + 5 }, (_, i) => addFeedback(docId, `Serentak ${i}`, dina)));
  assert.equal(results.filter((r) => r.status === "fulfilled").length, FEEDBACK_PER_HOUR);
});

test("an author deletes their own note and its replies; staff delete any", T, async () => {
  const { id } = await addFeedback(docId, "Akan saya hapus", ana);
  await addReply(id, "Balasan penyunting", editor);
  await deleteComment(id, ana);
  assert.equal(await db.documentComment.count({ where: { OR: [{ id }, { parentId: id }] } }), 0);
  const second = await addFeedback(docId, "Hapus oleh penyunting", ana);
  await deleteComment(second.id, editor);
  assert.equal(await db.documentComment.count({ where: { id: second.id } }), 0);
});

test("notes travel with a document through the trash", T, async () => {
  const col = await db.collection.create({ data: { slug: `${tag}-col3`, name: `Tiga ${tag}` } });
  created.collections.push(col.id);
  const doc = await db.document.create({ data: { slug: `${tag}-trash`, title: "Sampah", content: "isi", status: DocumentStatus.PUBLISHED, collectionId: col.id } });
  const { id } = await addFeedback(doc.id, "Catatan sebelum dihapus", ana);
  await addReply(id, "Dibalas", editor);
  await setResolved(id, true, editor);

  await trashDocument(doc.id, admin);
  assert.equal(await db.documentComment.count({ where: { documentId: doc.id } }), 0);
  const row = await db.trashedDocument.findUniqueOrThrow({ where: { documentId: doc.id } });
  await restoreTrashedDocument(row.id, admin);
  const back = (await listThreads(doc.id, editor))[0];
  assert.equal(back.id, id);
  assert.equal(back.resolved, true);
  assert.equal(back.replies.length, 1);
  assert.equal(back.replies[0].body, "Dibalas");
  assert.ok(back.authorName?.startsWith("ana"));
});
