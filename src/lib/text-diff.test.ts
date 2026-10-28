import { test } from "node:test";
import assert from "node:assert/strict";
import { collapseUnchanged, diffLines, diffStats, MAX_DIFF_CELLS } from "./text-diff";

const show = (a: string, b: string) => diffLines(a, b).map((l) => `${l.type === "same" ? " " : l.type === "add" ? "+" : "-"}${l.text}`);

test("identical texts have no changes", () => {
  assert.deepEqual(show("a\nb", "a\nb"), [" a", " b"]);
  assert.deepEqual(diffStats(diffLines("a\nb", "a\nb")), { added: 0, removed: 0 });
});

test("added, removed and changed lines", () => {
  assert.deepEqual(show("a\nb\nc", "a\nb\nc\nd"), [" a", " b", " c", "+d"]);
  assert.deepEqual(show("a\nb\nc", "a\nc"), [" a", "-b", " c"]);
  assert.deepEqual(show("a\nb\nc", "a\nB\nc"), [" a", "-b", "+B", " c"]);
});

test("a moved paragraph is a removal and an addition, not a rewrite of everything", () => {
  const out = show("1\n2\n3\n4\n5", "1\n3\n4\n2\n5");
  assert.equal(out.filter((l) => l[0] === " ").length, 4);
  assert.deepEqual(diffStats(diffLines("1\n2\n3\n4\n5", "1\n3\n4\n2\n5")), { added: 1, removed: 1 });
});

test("empty sides and line-ending differences", () => {
  assert.deepEqual(show("", "a\nb"), ["+a", "+b"]);
  assert.deepEqual(show("a\nb", ""), ["-a", "-b"]);
  assert.deepEqual(show("", ""), []);
  assert.deepEqual(show("a\r\nb", "a\nb"), [" a", " b"]);
});

test("rebuilding either side from the result gives back that side", () => {
  const a = "intro\n\n## A\nsatu\ndua\n\n## B\ntiga\nempat\nlima";
  const b = "intro\n\n## A\nsatu\nDUA\ndua-b\n\n## C\ntiga\nlima\nenam";
  const lines = diffLines(a, b);
  assert.equal(lines.filter((l) => l.type !== "add").map((l) => l.text).join("\n"), a);
  assert.equal(lines.filter((l) => l.type !== "del").map((l) => l.text).join("\n"), b);
});

test("a very large middle falls back to a plain replacement instead of hanging", () => {
  const n = Math.ceil(Math.sqrt(MAX_DIFF_CELLS)) + 10;
  const a = Array.from({ length: n }, (_, i) => `a${i}`).join("\n");
  const b = Array.from({ length: n }, (_, i) => `b${i}`).join("\n");
  const stats = diffStats(diffLines(a, b));
  assert.deepEqual(stats, { added: n, removed: n });
});

test("unchanged stretches fold into skip markers with context kept", () => {
  const lines = diffLines("1\n2\n3\n4\n5\n6\n7\n8\n9", "1\n2\n3\n4\nX\n6\n7\n8\n9");
  const items = collapseUnchanged(lines, 1);
  assert.deepEqual(items.map((i) => (i.type === "skip" ? `~${i.count}` : `${i.type}:${i.text}`)), ["~3", "same:4", "del:5", "add:X", "same:6", "~3"]);
  assert.deepEqual(collapseUnchanged(diffLines("a", "a")), [{ type: "skip", count: 1 }]);
});
