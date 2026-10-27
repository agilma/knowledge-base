import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DocumentStatus, DocumentType } from "@prisma/client";
import { MarkdownManager } from "@tiptap/markdown";
import { parseDraft, toDocumentInput } from "./draft-import";
import { createContentExtensions } from "./editor-extensions";
import { dropEmptyParagraphs, isLosslessRoundTrip, type JsonNode } from "./editor-content";

const OK = `---
title: Judul Uji
slug: judul-uji
type: MASALAH
collection: murni-erp
excerpt: Ringkasan singkat.
---
## Konteks

Isi.
`;

test("a well formed file is read", () => {
  const d = parseDraft(OK, "judul-uji");
  assert.equal(d.title, "Judul Uji");
  assert.equal(d.type, DocumentType.MASALAH);
  assert.equal(d.collection, "murni-erp");
  assert.match(d.content, /^## Konteks/);
});

test("a file with a problem is refused, naming the file", () => {
  assert.throws(() => parseDraft("tanpa frontmatter", "x"), /x: frontmatter/);
  assert.throws(() => parseDraft(OK.replace("MASALAH", "LAIN"), "judul-uji"), /type "LAIN"/);
  assert.throws(() => parseDraft(OK, "nama-lain"), /harus sama dengan nama berkas/);
  assert.throws(() => parseDraft(OK.replace("title: Judul Uji\n", ""), "judul-uji"), /"title" wajib/);
  assert.throws(() => parseDraft(OK.replace("## Konteks\n\nIsi.\n", ""), "judul-uji"), /isi dokumen kosong/);
  assert.throws(() => parseDraft(OK.replace("excerpt: Ringkasan singkat.", "bukan pasangan"), "judul-uji"), /baris frontmatter/);
});

test("the document input is always a draft", () => {
  const input = toDocumentInput(parseDraft(OK, "judul-uji"), "kol-1");
  assert.equal(input.status, DocumentStatus.DRAFT);
  assert.equal(input.collectionId, "kol-1");
});

// What is in the repository: every draft must be safe to publish into a knowledge base.
const DIR = join(process.cwd(), "content", "drafts");
const files = readdirSync(DIR).filter((f) => f.endsWith(".md") && f !== "README.md");
const manager = new MarkdownManager({ extensions: createContentExtensions() } as never);

test("there are drafts to import", () => {
  assert.ok(files.length >= 7);
});

for (const file of files) {
  const name = file.replace(/\.md$/, "");
  const text = readFileSync(join(DIR, file), "utf8");

  test(`${name}: valid, anonymised, sourced and openable in the visual editor`, () => {
    const draft = parseDraft(text, name);
    assert.doesNotThrow(() => toDocumentInput(draft, "kol-1"));

    // nothing that identifies a person or reaches an internal system
    assert.ok(!/@/.test(text), "contains an @ (email or mention)");
    assert.ok(!/https?:\/\//i.test(text), "contains a link");
    assert.ok(!/docs\.google|drive\.google/i.test(text), "contains a Google link");
    for (const person of ["vera", "arika", "intan", "ronny", "erick", "marcel", "yulianta", "risma", "lala", "agil", "chelsy"]) {
      assert.ok(!new RegExp(`\\b${person}`, "i").test(text), `names ${person}`);
    }

    // the reader can trace it back, and what is unsure is said so
    assert.match(draft.content, /^## Sumber$/m, "no Sumber section");
    assert.match(
      draft.content,
      /Tiket CS di log tiket \(nomor baris\): \d|^Dokumen panduan training .+ dari tim/m,
      "Sumber names neither ticket numbers nor the team document it came from"
    );
    assert.match(draft.content, /^## Perlu (dikonfirmasi|dilengkapi)$/m, "no section for what is unconfirmed");

    // it opens in the rich editor instead of falling back to raw markdown
    const saved = manager.serialize(dropEmptyParagraphs(manager.parse(draft.content) as JsonNode) as never);
    assert.ok(isLosslessRoundTrip(draft.content, saved), "would be rewritten by the visual editor");
  });
}
