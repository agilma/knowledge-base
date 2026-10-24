import { test } from "node:test";
import assert from "node:assert/strict";
import { REVISION_LIMIT, formatSizeChange, hasMeaningfulChange, nextVersion, sizeChanges, statusChangeLabel } from "./revisions";

const base = { title: "Judul", excerpt: null, content: "## A\n\n- satu\n- dua", type: "PANDUAN" };

test("an untouched document is not a change, even if the editor reformatted it", () => {
  assert.equal(hasMeaningfulChange(base, { ...base }), false);
  assert.equal(hasMeaningfulChange(base, { ...base, content: "## A\n\n* satu\n* dua\n" }), false);
});

test("an empty excerpt and a missing one are the same", () => {
  assert.equal(hasMeaningfulChange(base, { ...base, excerpt: "" }), false);
});

test("a changed title, type, excerpt or text is a change", () => {
  assert.equal(hasMeaningfulChange(base, { ...base, title: "Judul baru" }), true);
  assert.equal(hasMeaningfulChange(base, { ...base, type: "MASALAH" }), true);
  assert.equal(hasMeaningfulChange(base, { ...base, excerpt: "ringkas" }), true);
  assert.equal(hasMeaningfulChange(base, { ...base, content: "## A\n\n- satu\n- dua\n- tiga" }), true);
});

test("sizes are compared with the previous version, whatever the input order", () => {
  const changes = sizeChanges([
    { version: 3, size: 90 },
    { version: 1, size: 100 },
    { version: 2, size: 140 },
  ]);
  assert.equal(changes.get(1), null);
  assert.equal(changes.get(2), 40);
  assert.equal(changes.get(3), -50);
});

test("size changes read as +n, -n, 0 or awal", () => {
  assert.equal(formatSizeChange(120), "+120");
  assert.equal(formatSizeChange(-8), "-8");
  assert.equal(formatSizeChange(0), "0");
  assert.equal(formatSizeChange(null), "awal");
});

test("the next version follows the latest, starting at 1", () => {
  assert.equal(nextVersion(null), 1);
  assert.equal(nextVersion(undefined), 1);
  assert.equal(nextVersion(7), 8);
});

test("the number of versions kept is the documented 100", () => {
  // docs/USER-GUIDE.md and the history page promise this number.
  assert.equal(REVISION_LIMIT, 100);
});

test("a status change reads as what was done to the document", () => {
  assert.equal(statusChangeLabel("DRAFT", "PUBLISHED"), "Diterbitkan");
  assert.equal(statusChangeLabel("PUBLISHED", "ARCHIVED"), "Diarsipkan");
  assert.equal(statusChangeLabel("ARCHIVED", "PUBLISHED"), "Diterbitkan");
  assert.equal(statusChangeLabel("PUBLISHED", "DRAFT"), "Dikembalikan ke draf");
});

test("no label for the first version, an unchanged status, or an unknown one", () => {
  assert.equal(statusChangeLabel(null, "PUBLISHED"), null);
  assert.equal(statusChangeLabel(undefined, "DRAFT"), null);
  assert.equal(statusChangeLabel("PUBLISHED", "PUBLISHED"), null);
  assert.equal(statusChangeLabel("DRAFT", "DELETED"), null);
});
