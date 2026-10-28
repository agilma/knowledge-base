import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  HIGHLIGHT_START as S,
  HIGHLIGHT_STOP as E,
  SEARCH_VECTOR_SQL,
  buildSearchHref,
  cleanSnippet,
  firstParam,
  hasHighlight,
  parseDocumentType,
  parseSearchQuery,
  splitHighlights,
  toTsQuery,
} from "./search-query";

test("plain words are ANDed; from three letters they match as prefixes", () => {
  assert.equal(toTsQuery("pos gagal"), "'pos':* & ('gagal':* | 'error':*)");
  assert.equal(toTsQuery("di pos"), "'di' & 'pos':*");
});

test("a word also matches its synonyms, in either direction; quoted phrases do not expand", () => {
  assert.equal(toTsQuery("Kasir"), "('Kasir':* | 'cashier':*)");
  assert.equal(toTsQuery("cashier"), "('cashier':* | 'kasir':*)");
  assert.equal(toTsQuery('"gagal closing"'), "('gagal' <-> 'closing')");
});

test("case and surrounding whitespace do not matter", () => {
  assert.equal(toTsQuery("   Voucher   LABORE "), "'Voucher':* & 'LABORE':*");
});

test("a quoted phrase must match adjacent words", () => {
  assert.equal(toTsQuery('"gagal closing"'), "('gagal' <-> 'closing')");
  assert.equal(toTsQuery('pos "gagal closing"'), "'pos':* & ('gagal' <-> 'closing')");
});

test("an unbalanced quote is ignored, not an error", () => {
  assert.equal(toTsQuery('pos "gagal closing'), "'pos':* & ('gagal':* | 'error':*) & 'closing':*");
  assert.equal(toTsQuery('"'), "");
});

test("empty and symbol-only input produce no query", () => {
  for (const raw of ["", "   ", "!!!", "&|:*()<->", "'\"\\", "—…"]) {
    assert.equal(toTsQuery(raw), "", JSON.stringify(raw));
  }
});

test("tsquery syntax cannot be smuggled in", () => {
  const out = toTsQuery("a' | b:* & !(c) <-> d\\ ; DROP TABLE documents; --");
  assert.match(out, /^('[\p{L}\p{N}]+'(:\*)?( & )?)+$/u);
  assert.ok(!out.includes("|") && !out.includes("!") && !out.includes("\\"));
});

test("separators inside a word split it", () => {
  assert.deepEqual(parseSearchQuery("pos-01 e_mail v1.2"), [
    ["pos"], ["01"], ["e"], ["mail"], ["v1"], ["2"],
  ]);
});

test("accented and non-Latin letters survive", () => {
  assert.equal(toTsQuery("café"), "'café':*");
});

test("input is bounded", () => {
  const many = Array.from({ length: 100 }, (_, i) => `kata${i}`).join(" ");
  assert.ok(parseSearchQuery(many).length <= 8);
  assert.ok(parseSearchQuery("x".repeat(5000))[0][0].length <= 50);
});

test("highlight markers become segments", () => {
  assert.deepEqual(splitHighlights(`a ${S}b${E} c`), [
    { text: "a ", match: false },
    { text: "b", match: true },
    { text: " c", match: false },
  ]);
  assert.deepEqual(splitHighlights("plain"), [{ text: "plain", match: false }]);
  assert.deepEqual(splitHighlights(`${S}open`), [{ text: "open", match: true }]);
  assert.deepEqual(splitHighlights(""), []);
});

test("markup in a document is plain text to the highlighter", () => {
  const segments = splitHighlights(`<script>${S}x${E}</script>`);
  assert.equal(segments.map((s) => s.text).join(""), "<script>x</script>");
});

test("hasHighlight", () => {
  assert.equal(hasHighlight(`a${S}b${E}`), true);
  assert.equal(hasHighlight("ab"), false);
  assert.equal(hasHighlight(null), false);
});

test("snippets from markdown read as plain text", () => {
  assert.equal(
    cleanSnippet(`## Langkah\n\n1. Buka [menu ${S}retry${E}](https://x.id/a)\n- **tebal** \`kode\``),
    `Langkah Buka menu ${S}retry${E} tebal kode`
  );
});

test("document type from the URL is validated", () => {
  assert.equal(parseDocumentType("MASALAH"), "MASALAH");
  for (const bad of ["masalah", "SOLUSI", "", undefined, ["MASALAH"], "'; --"]) {
    assert.equal(parseDocumentType(bad), undefined);
  }
});

test("repeated URL params take the first value", () => {
  assert.equal(firstParam(["a", "b"]), "a");
  assert.equal(firstParam("a"), "a");
  assert.equal(firstParam(undefined), undefined);
});

test("filter links keep what is set and drop what is empty", () => {
  assert.equal(buildSearchHref({}), "/search");
  assert.equal(buildSearchHref({ q: "  " }), "/search");
  assert.equal(buildSearchHref({ q: "gagal closing", type: "MASALAH" }), "/search?q=gagal+closing&type=MASALAH");
  assert.equal(buildSearchHref({ collection: "pos" }), "/search?collection=pos");
  assert.equal(buildSearchHref({ q: "a&b=c" }), "/search?q=a%26b%3Dc");
});

test("the query uses exactly the expression the migration indexes", () => {
  const migration = readFileSync(
    new URL("../../prisma/migrations/3_fulltext_search/migration.sql", import.meta.url),
    "utf8"
  );
  const code = migration.split("\n").filter((line) => !line.startsWith("--")).join(" ");
  assert.ok(
    code.replace(/\s+/g, " ").includes(`USING GIN (${SEARCH_VECTOR_SQL})`),
    "SEARCH_VECTOR_SQL and the migration have drifted apart"
  );
});

test("the stored search column is generated from exactly the same expression", () => {
  const migration = readFileSync(
    new URL("../../prisma/migrations/9_search_vector/migration.sql", import.meta.url),
    "utf8"
  );
  const code = migration.split("\n").filter((line) => !line.startsWith("--")).join(" ").replace(/\s+/g, " ");
  assert.ok(code.includes(`GENERATED ALWAYS AS ( ${SEARCH_VECTOR_SQL} ) STORED`), "SEARCH_VECTOR_SQL and migration 9 have drifted apart");
});

test("the migration is a single, additive statement", () => {
  const migration = readFileSync(
    new URL("../../prisma/migrations/3_fulltext_search/migration.sql", import.meta.url),
    "utf8"
  );
  const code = migration.split("\n").filter((line) => !line.startsWith("--")).join("\n").trim();
  assert.equal(code.split(";").filter((part) => part.trim()).length, 1);
  assert.match(code, /^CREATE INDEX CONCURRENTLY IF NOT EXISTS /);
  assert.doesNotMatch(code, /\b(DROP|ALTER|DELETE|UPDATE|TRUNCATE)\b/i);
});
