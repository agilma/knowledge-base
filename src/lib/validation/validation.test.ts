import { test } from "node:test";
import assert from "node:assert/strict";
import { CollectionStatus, DocumentStatus, DocumentType } from "@prisma/client";
import { documentSchema } from "./document";
import { collectionSchema } from "./collection";

const validDocument = {
  title: "Panduan POS",
  slug: "panduan-pos",
  collectionId: "col1",
  content: "isi",
};

function documentIssues(input: unknown): string[] {
  const result = documentSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."));
}

test("a minimal document is valid and takes the defaults", () => {
  const parsed = documentSchema.parse(validDocument);
  assert.equal(parsed.type, DocumentType.PANDUAN);
  assert.equal(parsed.status, DocumentStatus.DRAFT);
});

test("title length is bounded", () => {
  assert.deepEqual(documentIssues({ ...validDocument, title: "ab" }), ["title"]);
  assert.deepEqual(documentIssues({ ...validDocument, title: "x".repeat(151) }), ["title"]);
  assert.deepEqual(documentIssues({ ...validDocument, title: "x".repeat(150) }), []);
});

test("a slug may only hold lowercase letters, digits and hyphens", () => {
  for (const slug of ["Panduan", "pa ndu", "pa_ndu", "panduan!", "../etc", "pan/duan"]) {
    assert.deepEqual(documentIssues({ ...validDocument, slug }), ["slug"], slug);
  }
  assert.deepEqual(documentIssues({ ...validDocument, slug: "pos-01" }), []);
});

test("an unknown type or status is rejected, so a forged form cannot set one", () => {
  assert.deepEqual(documentIssues({ ...validDocument, type: "SOLUSI" }), ["type"]);
  assert.deepEqual(documentIssues({ ...validDocument, status: "DELETED" }), ["status"]);
});

test("content and collection are required", () => {
  assert.deepEqual(documentIssues({ ...validDocument, content: "" }), ["content"]);
  assert.deepEqual(documentIssues({ ...validDocument, collectionId: "" }), ["collectionId"]);
});

test("the excerpt is optional, may be empty, and is capped", () => {
  assert.deepEqual(documentIssues({ ...validDocument, excerpt: "" }), []);
  assert.deepEqual(documentIssues({ ...validDocument, excerpt: "x".repeat(301) }), ["excerpt"]);
});

test("a collection needs a name and a valid slug, and defaults to active", () => {
  const parsed = collectionSchema.parse({ name: "Murni POS", slug: "murni-pos" });
  assert.equal(parsed.status, CollectionStatus.ACTIVE);
  assert.equal(collectionSchema.safeParse({ name: "ab", slug: "murni-pos" }).success, false);
  assert.equal(collectionSchema.safeParse({ name: "Murni POS", slug: "Murni POS" }).success, false);
  assert.equal(collectionSchema.safeParse({ name: "Murni POS", slug: "x", status: "GONE" }).success, false);
});
