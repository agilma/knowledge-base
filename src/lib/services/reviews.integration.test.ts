import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { DocumentStatus, DocumentType, ReviewStatus, Role } from "@prisma/client";
import { db } from "../db";
import type { Viewer } from "../collection-access";
import { APPROVAL_REQUIRED_MESSAGE, createDocument, LOCKED_MESSAGE, setDocumentStatus, updateDocument } from "./documents";
import { approveReview, listInbox, listReviewsForDocument, rejectReview, saveMode, setDocumentLocked, submitChange, submitPublish, withdrawReview } from "./reviews";

/**
 * The approval flow and the lock: what an editor may write, what waits for an admin, and that the live
 * document is untouched until it is approved. Against a real database; skipped in CI.
 *
 *   KB_DB_TESTS=1 DATABASE_URL=postgresql://... npm test
 */
const enabled = process.env.KB_DB_TESTS === "1";
const tag = `rv${Date.now().toString(36)}`;
const T = { skip: !enabled };
const created = { users: [] as string[], collections: [] as string[] };
let admin: Viewer, editor: Viewer, other: Viewer, reader: Viewer;
let strictId: string, looseId: string;

async function user(name: string, role: Role): Promise<Viewer> {
  const row = await db.user.create({ data: { email: `${tag}-${name}@example.test`, name: `${name} ${tag}`, role } });
  created.users.push(row.id);
  return { id: row.id, role };
}
const input = (slug: string, collectionId: string, extra: Record<string, unknown> = {}) => ({
  title: `Judul ${slug}`,
  slug: `${tag}-${slug}`,
  collectionId,
  type: DocumentType.PANDUAN,
  content: `isi ${slug}`,
  status: DocumentStatus.DRAFT,
  ...extra,
});

before(async () => {
  if (!enabled) return;
  admin = await user("admin", Role.ADMIN);
  editor = await user("editor", Role.EDITOR);
  other = await user("other", Role.EDITOR);
  reader = await user("reader", Role.VIEWER);
  const strict = await db.collection.create({ data: { slug: `${tag}-strict`, name: `Ketat ${tag}`, requiresApproval: true } });
  const loose = await db.collection.create({ data: { slug: `${tag}-loose`, name: `Longgar ${tag}` } });
  created.collections.push(strict.id, loose.id);
  strictId = strict.id;
  looseId = loose.id;
});

after(async () => {
  if (!enabled) return;
  await db.document.deleteMany({ where: { collectionId: { in: created.collections } } });
  await db.collection.deleteMany({ where: { id: { in: created.collections } } });
  await db.user.deleteMany({ where: { id: { in: created.users } } });
  await db.$disconnect();
});

test("in a collection that requires approval an editor cannot publish or change a published document directly", T, async () => {
  await assert.rejects(createDocument(input("a1", strictId, { status: DocumentStatus.PUBLISHED }), editor), new RegExp(APPROVAL_REQUIRED_MESSAGE.slice(0, 30)));
  const draft = await createDocument(input("a2", strictId), editor);
  assert.equal(draft.status, DocumentStatus.DRAFT, "a draft is written freely");
  await updateDocument(draft.id, input("a2", strictId, { content: "diubah" }), editor);
  await assert.rejects(setDocumentStatus(draft.id, DocumentStatus.PUBLISHED, editor), /butuh persetujuan/);
  await assert.rejects(updateDocument(draft.id, input("a2", strictId, { status: DocumentStatus.PUBLISHED }), editor), /butuh persetujuan/);

  // the admin is the approver and is not held; an open collection is not held either
  const published = await createDocument(input("a3", strictId, { status: DocumentStatus.PUBLISHED }), admin);
  await assert.rejects(updateDocument(published.id, input("a3", strictId, { status: DocumentStatus.PUBLISHED, content: "langsung" }), editor), /butuh persetujuan/);
  await updateDocument(published.id, input("a3", strictId, { status: DocumentStatus.PUBLISHED, content: "oleh admin" }), admin);
  await createDocument(input("a4", looseId, { status: DocumentStatus.PUBLISHED }), editor);

  // making it less public is allowed to the editor
  await setDocumentStatus(published.id, DocumentStatus.ARCHIVED, editor);
  assert.equal(await saveMode(published.id, editor), "direct");
  assert.equal(await saveMode(published.id, admin), "direct");
});

test("a request to publish waits for an admin, who approves it once", T, async () => {
  const draft = await createDocument(input("b1", strictId), editor);
  await assert.rejects(submitPublish(draft.id, "x", reader), /penyunting/);
  const { id } = await submitPublish(draft.id, "  Siap ditinjau  ", editor);
  await assert.rejects(submitPublish(draft.id, null, editor), /Sudah ada permintaan/);
  await assert.rejects(submitPublish(draft.id, null, other), /Sudah ada permintaan/);
  assert.equal((await db.document.findUniqueOrThrow({ where: { id: draft.id } })).status, DocumentStatus.DRAFT);

  await assert.rejects(approveReview(id, null, editor), /Hanya admin/);
  await approveReview(id, "Disetujui", admin);
  const doc = await db.document.findUniqueOrThrow({ where: { id: draft.id } });
  assert.equal(doc.status, DocumentStatus.PUBLISHED);
  const review = await db.documentReview.findUniqueOrThrow({ where: { id } });
  assert.equal(review.status, ReviewStatus.APPROVED);
  assert.equal(review.note, "Siap ditinjau");
  assert.equal(review.decidedById, admin.id);
  assert.equal(review.decisionNote, "Disetujui");
  await assert.rejects(approveReview(id, null, admin), /tidak ditemukan atau sudah diputuskan/);
  assert.equal(await db.documentRevision.count({ where: { documentId: draft.id, status: DocumentStatus.PUBLISHED } }), 1);

  await assert.rejects(submitPublish(draft.id, null, editor), /sudah terbit/);
  const open = await createDocument(input("b2", looseId), editor);
  await assert.rejects(submitPublish(open.id, null, editor), /tidak butuh persetujuan/);
  await assert.rejects(submitPublish(draft.id, null, admin), /sudah terbit|menyetujui sendiri/);
});

test("a change to a published document leaves the live text until it is approved", T, async () => {
  const doc = await createDocument(input("c1", strictId, { status: DocumentStatus.PUBLISHED, content: "versi lama" }), admin);
  assert.equal(await saveMode(doc.id, editor), "review");
  await assert.rejects(submitChange(doc.id, { title: doc.title, content: "versi lama", type: doc.type }, null, editor), /Tidak ada perubahan/);
  await assert.rejects(submitChange(doc.id, { title: "x", content: "baru", type: doc.type }, null, editor), /minimal/);

  const first = await submitChange(doc.id, { title: doc.title, content: "usulan pertama", type: doc.type }, "Perbaiki langkah", editor);
  const second = await submitChange(doc.id, { title: doc.title, content: "usulan kedua", type: doc.type }, null, editor);
  assert.equal(second.id, first.id, "a newer request from the same editor replaces the earlier one");
  await assert.rejects(submitChange(doc.id, { title: doc.title, content: "orang lain", type: doc.type }, null, other), /permintaan lain/);
  assert.equal((await db.document.findUniqueOrThrow({ where: { id: doc.id } })).content, "versi lama", "the live document is untouched");
  assert.equal(await db.documentRevision.count({ where: { documentId: doc.id } }), 1);

  await approveReview(first.id, null, admin);
  const after = await db.document.findUniqueOrThrow({ where: { id: doc.id } });
  assert.equal(after.content, "usulan kedua");
  assert.equal(after.status, DocumentStatus.PUBLISHED);
  assert.equal(await db.documentRevision.count({ where: { documentId: doc.id } }), 2, "the change is a version in the history");
  const history = await listReviewsForDocument(doc.id, editor);
  assert.equal(history[0].status, ReviewStatus.APPROVED);
  assert.equal(history[0].proposal?.content, "usulan kedua");
  assert.deepEqual(await listReviewsForDocument(doc.id, reader), []);
});

test("a rejection needs a reason and leaves the document; a request can be withdrawn", T, async () => {
  const doc = await createDocument(input("d1", strictId, { status: DocumentStatus.PUBLISHED, content: "tetap" }), admin);
  const { id } = await submitChange(doc.id, { title: doc.title, content: "ditolak", type: doc.type }, null, editor);
  await assert.rejects(rejectReview(id, "  ", admin), /Alasan/);
  await assert.rejects(rejectReview(id, "tidak sesuai", editor), /Hanya admin/);
  await rejectReview(id, "Langkah 3 salah", admin);
  assert.equal((await db.document.findUniqueOrThrow({ where: { id: doc.id } })).content, "tetap");
  const rejected = await db.documentReview.findUniqueOrThrow({ where: { id } });
  assert.equal(rejected.status, ReviewStatus.REJECTED);
  assert.equal(rejected.decisionNote, "Langkah 3 salah");

  const again = await submitChange(doc.id, { title: doc.title, content: "diajukan lagi", type: doc.type }, null, editor);
  await assert.rejects(withdrawReview(again.id, other), /pengaju atau admin/);
  await withdrawReview(again.id, editor);
  assert.equal((await db.documentReview.findUniqueOrThrow({ where: { id: again.id } })).status, ReviewStatus.WITHDRAWN);
  await assert.rejects(withdrawReview(again.id, editor), /sudah diputuskan|tidak ditemukan/);
  // after a withdrawal anyone may ask again
  await submitChange(doc.id, { title: doc.title, content: "orang lain mengajukan", type: doc.type }, null, other);
});

test("a locked document is for admins only, whatever its collection says", T, async () => {
  const doc = await createDocument(input("e1", looseId, { status: DocumentStatus.PUBLISHED }), editor);
  await assert.rejects(setDocumentLocked(doc.id, true, editor), /Hanya admin/);
  const before = (await db.document.findUniqueOrThrow({ where: { id: doc.id } })).updatedAt.getTime();
  await setDocumentLocked(doc.id, true, admin);
  assert.equal((await db.document.findUniqueOrThrow({ where: { id: doc.id } })).updatedAt.getTime(), before, "locking is not an edit");
  assert.equal(await saveMode(doc.id, editor), "locked");
  await assert.rejects(updateDocument(doc.id, input("e1", looseId, { status: DocumentStatus.PUBLISHED, content: "diubah" }), editor), new RegExp(LOCKED_MESSAGE.slice(0, 25)));
  await assert.rejects(setDocumentStatus(doc.id, DocumentStatus.ARCHIVED, editor), /dikunci/);
  await updateDocument(doc.id, input("e1", looseId, { status: DocumentStatus.PUBLISHED, content: "oleh admin" }), admin);
  await setDocumentLocked(doc.id, false, admin);
  await updateDocument(doc.id, input("e1", looseId, { status: DocumentStatus.PUBLISHED, content: "boleh lagi" }), editor);
});

test("the inbox: an admin sees every waiting request, an editor their own, nobody a document they cannot read", T, async () => {
  const closed = await db.collection.create({ data: { slug: `${tag}-closed`, name: `Tertutup ${tag}`, requiresApproval: true, restricted: true } });
  created.collections.push(closed.id);
  const secret = await createDocument(input("f1", closed.id), admin);
  await assert.rejects(submitPublish(secret.id, null, editor), /tidak ditemukan/);
  await submitPublish(secret.id, null, admin).catch(() => undefined);

  const doc = await createDocument(input("f2", strictId), editor);
  const { id } = await submitPublish(doc.id, null, editor);
  await db.documentReview.create({ data: { documentId: secret.id, kind: "PUBLISH", requestedById: admin.id } });

  const forAdmin = await listInbox(admin);
  assert.ok(forAdmin.pending.some((r) => r.id === id));
  assert.ok(forAdmin.pending.some((r) => r.document.slug === `${tag}-f1`), "the admin reads the restricted collection");
  const forEditor = await listInbox(editor);
  assert.ok(forEditor.pending.some((r) => r.id === id));
  assert.ok(!forEditor.pending.some((r) => r.document.slug === `${tag}-f1`), "not another person's, and not a document they cannot read");
  await assert.rejects(listInbox(reader), /penyunting/);
  const otherInbox = await listInbox(other);
  assert.ok(!otherInbox.pending.some((r) => r.id === id));

  await rejectReview(id, "belum lengkap", admin);
  assert.ok((await listInbox(editor)).decided.some((r) => r.id === id && r.decisionNote === "belum lengkap"), "the editor reads the answer");
});
