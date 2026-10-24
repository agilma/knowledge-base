import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify } from "./slug";

test("titles become lowercase hyphenated slugs", () => {
  assert.equal(slugify("POS Gagal Closing"), "pos-gagal-closing");
});

test("accents are stripped and symbols dropped", () => {
  assert.equal(slugify("Café & Résumé: panduan!"), "cafe-resume-panduan");
});

test("spaces, underscores and repeated hyphens collapse to one hyphen", () => {
  assert.equal(slugify("a  b__c---d"), "a-b-c-d");
});

test("leading and trailing hyphens are trimmed", () => {
  assert.equal(slugify("  --Halo--  "), "halo");
});

test("a title with no usable characters gives an empty slug", () => {
  assert.equal(slugify("!!!"), "");
  assert.equal(slugify(""), "");
});

test("a result always satisfies the slug pattern the forms enforce", () => {
  for (const title of ["Voucher LABORE tidak bisa", "Éclair 2.0 (baru)", "a_b c-d"]) {
    const slug = slugify(title);
    assert.match(slug, /^[a-z0-9-]*$/);
  }
});
