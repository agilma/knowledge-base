import test from "node:test";
import assert from "node:assert/strict";
import { dropEmptyParagraphs, type JsonNode } from "./editor-content";

const p = (text?: string): JsonNode => ({ type: "paragraph", ...(text ? { content: [{ type: "text", text }] } : {}) });

test("empty paragraphs at the top level are dropped", () => {
  const doc: JsonNode = { type: "doc", content: [p("a"), p(), p(), p("b"), p()] };
  assert.deepEqual(dropEmptyParagraphs(doc).content, [p("a"), p("b")]);
});

test("empty paragraphs inside a list item or quote are kept", () => {
  const item: JsonNode = { type: "listItem", content: [p()] };
  const quote: JsonNode = { type: "blockquote", content: [p()] };
  const doc: JsonNode = { type: "doc", content: [{ type: "bulletList", content: [item] }, quote] };
  assert.deepEqual(dropEmptyParagraphs(doc), doc);
});

test("other empty blocks and a document without content are untouched", () => {
  const rule: JsonNode = { type: "horizontalRule" };
  assert.deepEqual(dropEmptyParagraphs({ type: "doc", content: [rule] }).content, [rule]);
  assert.deepEqual(dropEmptyParagraphs({ type: "doc" }), { type: "doc" });
});
