import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_RELATED, diffRelations, parseRelatedIds } from "./related";

test("only non-empty strings survive, trimmed and without repeats", () => {
  assert.deepEqual(parseRelatedIds(["a", " b ", "a", "", "  ", "c"]), ["a", "b", "c"]);
});

test("values that are not strings are dropped, not coerced", () => {
  assert.deepEqual(parseRelatedIds([{ not: "x" }, ["a"], 5, null, undefined, "ok"]), ["ok"]);
});

test("a document is never related to itself", () => {
  assert.deepEqual(parseRelatedIds(["self", "other"], "self"), ["other"]);
});

test("absurdly long ids are dropped", () => {
  assert.deepEqual(parseRelatedIds(["x".repeat(101), "y"]), ["y"]);
});

test("the list is capped", () => {
  const many = Array.from({ length: MAX_RELATED + 15 }, (_, i) => `d${i}`);
  const parsed = parseRelatedIds(many);
  assert.equal(parsed.length, MAX_RELATED);
  assert.equal(parsed[0], "d0");
});

test("the diff adds what is new and removes what is gone", () => {
  assert.deepEqual(diffRelations(["a", "b"], ["b", "c"]), { add: ["c"], remove: ["a"] });
});

test("an unchanged list writes nothing", () => {
  assert.deepEqual(diffRelations(["a", "b"], ["b", "a"]), { add: [], remove: [] });
  assert.deepEqual(diffRelations([], []), { add: [], remove: [] });
});

test("clearing the list removes everything", () => {
  assert.deepEqual(diffRelations(["a", "b"], []), { add: [], remove: ["a", "b"] });
});
