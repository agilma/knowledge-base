import { test } from "node:test";
import assert from "node:assert/strict";
import { findSensitive } from "./sensitive";

test("clean text raises nothing", () => {
  assert.deepEqual(findSensitive("## Langkah\n\n1. Buka POS.\n2. Klik Refresh."), []);
});

test("each kind of sensitive content is named", () => {
  assert.ok(findSensitive("hubungi a.b@contoh.id").includes("alamat email"));
  assert.ok(findSensitive("lihat https://contoh.id/x").includes("tautan"));
  assert.ok(findSensitive("rekening 1234 5678 9012").some((f) => f.startsWith("nomor panjang")));
  assert.ok(findSensitive("Password: abc").some((f) => f.startsWith("kata yang menyiratkan")));
  assert.ok(findSensitive("tanya Lala dulu").some((f) => f.startsWith("nama orang")));
});

test("short numbers such as step counts are not flagged", () => {
  assert.deepEqual(findSensitive("6 langkah, harga Rp5.000, 30 detik"), []);
});
