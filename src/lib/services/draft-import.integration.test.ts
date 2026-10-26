import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { DocumentStatus, DocumentType, Role } from "@prisma/client";
import { db } from "../db";
import type { DraftFile } from "../draft-import";
import { importDrafts } from "./draft-import";
import { getRevisionList } from "./revisions";
import { ADMIN } from "./test-viewers";

/**
 * Against a real database; skipped in CI.
 *
 *   KB_DB_TESTS=1 DATABASE_URL=postgresql://... npm test
 */
const enabled = process.env.KB_DB_TESTS === "1";
const tag = `imp${Date.now()}`;
const T = { skip: !enabled };

let adminId: string;
let collectionSlug: string;

const draft = (n: number, over: Partial<DraftFile> = {}): DraftFile => ({
  slug: `${tag}-${n}`,
  title: `Draf ${n} ${tag}`,
  type: DocumentType.MASALAH,
  collection: collectionSlug,
  excerpt: "Ringkasan",
  content: "## Konteks\n\nIsi.\n",
  ...over,
});

before(async () => {
  if (!enabled) return;
  const user = await db.user.create({ data: { email: `${tag}@example.test`, name: "Admin", role: Role.ADMIN } });
  adminId = user.id;
  const col = await db.collection.create({ data: { slug: `${tag}-col`, name: `Koleksi ${tag}` } });
  collectionSlug = col.slug;
});

after(async () => {
  if (!enabled) return;
  await db.document.deleteMany({ where: { slug: { startsWith: tag } } });
  await db.collection.deleteMany({ where: { slug: `${tag}-col` } });
  await db.user.deleteMany({ where: { id: adminId } });
  await db.$disconnect();
});

test("drafts are created as DRAFT with a first version in the history", T, async () => {
  const result = await importDrafts([draft(1), draft(2)], { id: adminId, role: Role.ADMIN });
  assert.deepEqual(result.created.sort(), [`${tag}-1`, `${tag}-2`]);
  assert.deepEqual(result.failed, []);

  const doc = await db.document.findUnique({ where: { slug: `${tag}-1` } });
  assert.equal(doc?.status, DocumentStatus.DRAFT);
  assert.equal(doc?.authorId, adminId);
  assert.equal((await getRevisionList(doc!.id, ADMIN)).length, 1);
});

test("running it again changes nothing, and an edited document is never overwritten", T, async () => {
  const doc = await db.document.findUnique({ where: { slug: `${tag}-1` } });
  await db.document.update({ where: { id: doc!.id }, data: { content: "disunting orang" } });

  const again = await importDrafts([draft(1), draft(2)], { id: adminId, role: Role.ADMIN });
  assert.deepEqual(again.created, []);
  assert.deepEqual(again.skipped.sort(), [`${tag}-1`, `${tag}-2`]);
  assert.equal((await db.document.findUnique({ where: { id: doc!.id } }))?.content, "disunting orang");
  assert.equal(await db.document.count({ where: { slug: { startsWith: `${tag}-` } } }), 2);
});

test("a missing collection or a bad draft fails that draft only", T, async () => {
  const result = await importDrafts(
    [draft(3, { collection: "tidak-ada" }), draft(4, { title: "x" }), draft(5)],
    { id: adminId, role: Role.ADMIN }
  );
  assert.deepEqual(result.created, [`${tag}-5`]);
  assert.equal(result.failed.length, 2);
  assert.match(result.failed.find((f) => f.slug === `${tag}-3`)!.error, /koleksi "tidak-ada" tidak ditemukan/);
  assert.match(result.failed.find((f) => f.slug === `${tag}-4`)!.error, /minimal 3|Judul/);
});
