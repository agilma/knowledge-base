import { test, after } from "node:test";
import assert from "node:assert/strict";
import { db } from "../db";
import { dismissSearchMiss, listSearchMisses, MISS_RETENTION_DAYS, purgeSearchMisses, recordSearchMiss } from "./search-misses";

/**
 * Against a real database: the count is an upsert, and the purge is SQL.
 *
 *   KB_DB_TESTS=1 DATABASE_URL=postgresql://... npm test
 */
const enabled = process.env.KB_DB_TESTS === "1";
const tag = `zz${Date.now().toString(36)}`;

after(async () => {
  if (!enabled) return;
  await db.searchMiss.deleteMany({ where: { query: { startsWith: tag } } });
  await db.$disconnect();
});

test("the same phrase, however typed, is one row that counts up", { skip: !enabled }, async () => {
  assert.equal(await recordSearchMiss(`${tag} Retur  Barang!`), true);
  assert.equal(await recordSearchMiss(`${tag} retur barang`), true);
  await Promise.all([recordSearchMiss(`${tag} retur barang`), recordSearchMiss(`${tag} retur barang`)]);
  const row = await db.searchMiss.findUniqueOrThrow({ where: { query: `${tag} retur barang` } });
  assert.equal(row.count, 4, "four searches, one row, no lost update");
  assert.equal(await db.searchMiss.count({ where: { query: { startsWith: tag } } }), 1);
});

test("phrases that could identify someone are not stored", { skip: !enabled }, async () => {
  assert.equal(await recordSearchMiss(`${tag} budi@contoh.id`), false);
  assert.equal(await recordSearchMiss(`${tag} 0812345678`), false);
  assert.equal(await db.searchMiss.count({ where: { query: { startsWith: tag }, OR: [{ query: { contains: "@" } }, { query: { contains: "0812" } }] } }), 0);
});

test("the list is the most searched first, within the window, and dismissing removes a phrase", { skip: !enabled }, async () => {
  for (let i = 0; i < 3; i++) await recordSearchMiss(`${tag} sering`);
  await recordSearchMiss(`${tag} jarang`);
  // 100 days ago: outside the 90-day window of the list, inside the retention of the table
  await db.searchMiss.update({ where: { query: `${tag} jarang` }, data: { lastAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) } });
  const list = (await listSearchMisses({ limit: 500 })).filter((m) => m.query.startsWith(tag)).map((m) => m.query);
  assert.ok(list.indexOf(`${tag} retur barang`) < list.indexOf(`${tag} sering`), "4 searches come before 3");
  assert.ok(!list.includes(`${tag} jarang`), "older than the window is not listed");
  assert.equal(await dismissSearchMiss(`${tag} sering`), true);
  assert.equal(await dismissSearchMiss(`${tag} sering`), false);
  assert.equal(await db.searchMiss.count({ where: { query: `${tag} sering` } }), 0);
});

test("phrases older than the retention are purged; newer ones stay", { skip: !enabled }, async () => {
  await purgeSearchMisses(Date.now(), true);
  assert.equal(await db.searchMiss.count({ where: { query: `${tag} jarang` } }), 1, "100 days old is inside the retention of 180");
  await db.searchMiss.update({ where: { query: `${tag} jarang` }, data: { lastAt: new Date(Date.now() - (MISS_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000) } });
  await purgeSearchMisses(Date.now(), true);
  assert.equal(await db.searchMiss.count({ where: { query: `${tag} jarang` } }), 0);
  assert.equal(await db.searchMiss.count({ where: { query: `${tag} retur barang` } }), 1);
});
