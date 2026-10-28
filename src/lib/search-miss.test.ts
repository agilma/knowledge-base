import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeMissQuery } from "./search-miss";

test("a phrase is kept as lower-case words", () => {
  assert.equal(normalizeMissQuery("  Gagal   CLOSING!! "), "gagal closing");
  assert.equal(normalizeMissQuery("“retur barang”"), "retur barang");
  assert.equal(normalizeMissQuery("POS-offline"), "pos offline");
});

test("anything that could identify a person, or is not a topic, is not kept", () => {
  assert.equal(normalizeMissQuery("agil@thunderlab.id"), null);
  assert.equal(normalizeMissQuery("0812 3456 7890"), null);
  assert.equal(normalizeMissQuery("invoice 1234567"), null);
  assert.equal(normalizeMissQuery("a"), null);
  assert.equal(normalizeMissQuery("!!!"), null);
  assert.equal(normalizeMissQuery("x".repeat(101)), null);
  assert.equal(normalizeMissQuery("satu dua tiga empat lima enam tujuh delapan sembilan"), null);
});

test("short numbers such as a step count are fine", () => {
  assert.equal(normalizeMissQuery("langkah 12"), "langkah 12");
});
