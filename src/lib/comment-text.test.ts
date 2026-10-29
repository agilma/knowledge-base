import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanCommentBody, COMMENT_MAX } from "./comment-text";

test("a note is trimmed, line breaks kept, runs of blank lines shortened, trailing spaces dropped", () => {
  assert.equal(cleanCommentBody("  Langkah 3 kurang jelas.  \r\n\r\n\r\n\r\nMohon ditambah contoh.  \n"), "Langkah 3 kurang jelas.\n\nMohon ditambah contoh.");
});

test("control characters are removed, ordinary text and markup characters are left as typed", () => {
  assert.equal(cleanCommentBody("a\u0000b\u0007c <b>tebal</b> **x**"), "abc <b>tebal</b> **x**");
});

test("too short, too long and not a string are refused", () => {
  assert.throws(() => cleanCommentBody("ab"), /minimal/);
  assert.throws(() => cleanCommentBody("   \n  "), /minimal/);
  assert.throws(() => cleanCommentBody("x".repeat(COMMENT_MAX + 1)), /maksimal/);
  assert.equal(cleanCommentBody("x".repeat(COMMENT_MAX)).length, COMMENT_MAX);
  assert.throws(() => cleanCommentBody(42), /wajib/);
  assert.throws(() => cleanCommentBody(undefined), /wajib/);
});

test("hostile input is bounded: far over the limit is refused at once, whitespace runs cost nothing", () => {
  const started = Date.now();
  assert.throws(() => cleanCommentBody("a" + " ".repeat(1_000_000) + "b"), /maksimal/);
  assert.throws(() => cleanCommentBody("a" + " ".repeat(3900) + "b".repeat(50)), /maksimal/);
  assert.throws(() => cleanCommentBody((" \u0000").repeat(1900) + "xyz"), /maksimal/);
  assert.ok(Date.now() - started < 300, `took ${Date.now() - started} ms`);
});

test("direction-changing and zero-width marks are removed", () => {
  assert.equal(cleanCommentBody("abc\u202Edef\u200Bghi\u2028jkl\uFEFF"), "abcdefghijkl");
});
