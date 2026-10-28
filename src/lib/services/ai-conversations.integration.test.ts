import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { DocumentType, Role } from "@prisma/client";
import { db } from "../db";
import {
  appendMessage,
  createConversation,
  deleteConversation,
  dropLastProposal,
  getConversation,
  listConversations,
  purgeExpired,
  renameConversation,
  RETENTION_DAYS,
} from "./ai-conversations";

/**
 * Runs against a real database: ownership and the message order are decided by
 * queries and locks, not by pure code. Skipped unless asked for:
 *
 *   KB_DB_TESTS=1 DATABASE_URL=postgresql://... npm test
 */
const enabled = process.env.KB_DB_TESTS === "1";
const tag = `ai${Date.now()}`;
const alice = `${tag}-alice`;
const bob = `${tag}-bob`;

before(async () => {
  if (!enabled) return;
  for (const id of [alice, bob]) {
    await db.user.create({ data: { id, email: `${id}@example.com`, role: Role.ADMIN } });
  }
});

after(async () => {
  if (!enabled) return;
  await db.document.deleteMany({ where: { slug: { startsWith: tag } } });
  await db.collection.deleteMany({ where: { slug: `${tag}-col` } });
  await db.user.deleteMany({ where: { id: { in: [alice, bob] } } });
  await db.$disconnect();
});

test("a chat is private: nobody else can read, list, rename, append to or delete it", { skip: !enabled }, async () => {
  const chat = await createConversation(alice, "document", "Buat panduan retur dari catatan ini");
  assert.equal(chat.title, "Buat panduan retur dari catatan ini");

  assert.equal((await getConversation(alice, chat.id))?.messages.length, 1);
  assert.equal(await getConversation(bob, chat.id), null);
  assert.equal((await listConversations(bob, "document")).some((c) => c.id === chat.id), false);
  assert.equal(await renameConversation(bob, chat.id, "diambil alih"), false);
  assert.equal(await appendMessage(bob, chat.id, { role: "user", content: "menyusup" }), false);
  assert.equal(await deleteConversation(bob, chat.id), false);

  const still = await getConversation(alice, chat.id);
  assert.equal(still?.title, chat.title);
  assert.equal(still?.messages.length, 1);
});

test("simultaneous appends get distinct, consecutive positions", { skip: !enabled }, async () => {
  const chat = await createConversation(alice, "document", "Percakapan paralel");
  await Promise.all(Array.from({ length: 8 }, (_, i) => appendMessage(alice, chat.id, { role: i % 2 ? "assistant" : "user", content: `pesan ${i}` })));
  const seqs = (await db.aiMessage.findMany({ where: { conversationId: chat.id }, orderBy: { seq: "asc" }, select: { seq: true } })).map((m) => m.seq);
  assert.deepEqual(seqs, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test("a proposal and its warnings come back as they were saved", { skip: !enabled }, async () => {
  const chat = await createConversation(alice, "document", "Dengan usulan");
  const proposal = { title: "Judul", slug: "judul", collection_slug: "pos", type: "PANDUAN", excerpt: "x", content: "## Isi" };
  await appendMessage(alice, chat.id, { role: "assistant", content: "Ini usulannya.", proposal, warnings: ["tautan"] });
  await appendMessage(alice, chat.id, { role: "assistant", content: "", error: "gagal" });
  const loaded = await getConversation(alice, chat.id);
  assert.deepEqual(loaded?.messages[1].proposal, proposal);
  assert.deepEqual(loaded?.messages[1].warnings, ["tautan"]);
  assert.equal(loaded?.messages[1].error, undefined);
  assert.equal(loaded?.messages[2].error, "gagal");
  assert.equal(loaded?.messages[2].proposal, undefined);
});

test("dropping the last proposal clears only that one and only for the owner", { skip: !enabled }, async () => {
  const chat = await createConversation(alice, "document", "Dua usulan");
  await appendMessage(alice, chat.id, { role: "assistant", content: "satu", proposal: { n: 1 }, warnings: ["a"] });
  await appendMessage(alice, chat.id, { role: "assistant", content: "dua", proposal: { n: 2 } });
  assert.equal(await dropLastProposal(bob, chat.id), false);
  assert.deepEqual((await getConversation(alice, chat.id))?.messages[2].proposal, { n: 2 });
  assert.equal(await dropLastProposal(alice, chat.id), true);
  const m = (await getConversation(alice, chat.id))!.messages;
  assert.deepEqual(m[1].proposal, { n: 1 });
  assert.equal(m[2].proposal, undefined);
});

test("the list is newest first and a chat moves up when it gets a message", { skip: !enabled }, async () => {
  const first = await createConversation(bob, "document", "Pertama");
  const second = await createConversation(bob, "document", "Kedua");
  assert.deepEqual((await listConversations(bob, "document")).map((c) => c.id).slice(0, 2), [second.id, first.id]);
  await appendMessage(bob, first.id, { role: "user", content: "naik" });
  assert.equal((await listConversations(bob, "document"))[0].id, first.id);
});

test("chats untouched for the retention period are purged, others stay", { skip: !enabled }, async () => {
  const old = await createConversation(alice, "document", "Lama");
  const fresh = await createConversation(alice, "document", "Baru");
  const stale = new Date(Date.now() - (RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000);
  await db.aiConversation.update({ where: { id: old.id }, data: { updatedAt: stale } });
  await purgeExpired(Date.now(), true);
  assert.equal(await getConversation(alice, old.id), null);
  assert.equal(await db.aiMessage.count({ where: { conversationId: old.id } }), 0);
  assert.ok(await getConversation(alice, fresh.id));
});

test("deleting a document keeps the chat; deleting a user removes theirs", { skip: !enabled }, async () => {
  const collection = await db.collection.upsert({ where: { slug: `${tag}-col` }, create: { slug: `${tag}-col`, name: "Test" }, update: {} });
  const doc = await db.document.create({ data: { slug: `${tag}-doc`, title: "Doc", content: "x", type: DocumentType.PANDUAN, collectionId: collection.id } });
  const chat = await createConversation(alice, "document", "Tentang dokumen", doc.id);
  assert.equal((await getConversation(alice, chat.id))?.documentId, doc.id);
  await db.document.delete({ where: { id: doc.id } });
  assert.equal((await getConversation(alice, chat.id))?.documentId, null);

  const bobChat = await createConversation(bob, "document", "Milik bob");
  await db.user.delete({ where: { id: bob } });
  assert.equal(await db.aiConversation.count({ where: { id: bobChat.id } }), 0);
  await db.user.create({ data: { id: bob, email: `${bob}@example.com`, role: Role.ADMIN } });
});

test("a made-up document id does not stop a chat from starting", { skip: !enabled }, async () => {
  const chat = await createConversation(alice, "document", "Dokumen palsu", "tidak-ada");
  assert.equal((await getConversation(alice, chat.id))?.documentId, null);
});
