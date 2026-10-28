import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { DocumentStatus, DocumentType, Role } from "@prisma/client";
import { db } from "../db";
import { countExportable, exportBatch, resolveExportScope } from "./export";

/**
 * Against a real database: the export must carry what an admin may see, drafts and restricted
 * documents included, in stable batches, and must refuse everyone else.
 *
 *   KB_DB_TESTS=1 DATABASE_URL=postgresql://... npm test
 */
const enabled = process.env.KB_DB_TESTS === "1";
const tag = `exp${Date.now()}`;
const admin = { id: `${tag}-admin`, role: Role.ADMIN };
const editor = { id: `${tag}-editor`, role: Role.EDITOR };
let collectionId = "";

before(async () => {
  if (!enabled) return;
  const col = await db.collection.create({ data: { slug: `${tag}-col`, name: "Ekspor", restricted: true } });
  collectionId = col.id;
  const statuses = [DocumentStatus.PUBLISHED, DocumentStatus.DRAFT, DocumentStatus.ARCHIVED, DocumentStatus.PUBLISHED, DocumentStatus.DRAFT];
  for (const [i, status] of statuses.entries()) {
    await db.document.create({
      data: { slug: `${tag}-d${i}`, title: `Dokumen ${i}`, content: `isi ${i}`, type: DocumentType.PANDUAN, status, collectionId, restricted: i === 3 },
    });
  }
});

after(async () => {
  if (!enabled) return;
  await db.document.deleteMany({ where: { slug: { startsWith: tag } } });
  await db.collection.deleteMany({ where: { slug: `${tag}-col` } });
  await db.$disconnect();
});

test("the export includes drafts, archived and restricted documents, in stable batches", { skip: !enabled }, async () => {
  assert.equal(await countExportable(admin, collectionId), 5);
  const seen: string[] = [];
  let afterId: string | undefined;
  for (;;) {
    const batch = await exportBatch(admin, { afterId, take: 2, collectionId });
    if (batch.length === 0) break;
    assert.ok(batch.length <= 2);
    seen.push(...batch.map((d) => d.slug));
    afterId = batch[batch.length - 1].id;
  }
  assert.deepEqual(seen.sort(), [0, 1, 2, 3, 4].map((i) => `${tag}-d${i}`));
  const all = await exportBatch(admin, { take: 10, collectionId });
  assert.deepEqual(all.map((d) => d.status).sort(), ["ARCHIVED", "DRAFT", "DRAFT", "PUBLISHED", "PUBLISHED"]);
  assert.equal(all.filter((d) => d.restricted).length, 1);
  assert.ok(all.every((d) => d.collection.slug === `${tag}-col`));
});

test("only an admin can export, and an unknown collection is refused", { skip: !enabled }, async () => {
  await assert.rejects(exportBatch(editor, { collectionId }), /Hanya admin/);
  await assert.rejects(countExportable(editor), /Hanya admin/);
  await assert.rejects(resolveExportScope(editor, `${tag}-col`), /Hanya admin/);
  await assert.rejects(resolveExportScope(admin, "tidak-ada-koleksi-ini"), /Koleksi tidak ditemukan/);
  assert.deepEqual(await resolveExportScope(admin, `${tag}-col`), { id: collectionId, slug: `${tag}-col` });
  assert.equal(await resolveExportScope(admin, null), null);
});
