import { test } from "node:test";
import assert from "node:assert/strict";
import { clampPage } from "./pagination";

test("a page number is kept inside 1..pages", () => {
  assert.equal(clampPage("3", 10), 3);
  assert.equal(clampPage("999", 10), 10);
  assert.equal(clampPage("0", 10), 1);
  assert.equal(clampPage("-4", 10), 1);
  assert.equal(clampPage("2abc", 10), 2);
});

test("missing, unreadable or empty-list values give page 1", () => {
  assert.equal(clampPage(undefined, 10), 1);
  assert.equal(clampPage("abc", 10), 1);
  assert.equal(clampPage("", 10), 1);
  assert.equal(clampPage("5", 0), 1);
});
