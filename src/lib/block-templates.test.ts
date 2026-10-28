import { test } from "node:test";
import assert from "node:assert/strict";
import { BLOCK_TEMPLATES, DRAWN_BLOCK_LANGUAGES, drawnBlockNode, isDrawnBlockLanguage } from "./block-templates";
import { parseCallout, parseSteps } from "../components/document/step-blocks";
import { unsafeDiagramReason } from "../components/document/mermaid-safety";
import { withDefaultClasses } from "../components/document/mermaid-style";

test("every template is valid for the code that draws it", () => {
  const steps = parseSteps(BLOCK_TEMPLATES.langkah);
  assert.equal(steps?.length, 3);
  assert.ok(steps?.every((s) => s.title && s.description));
  assert.equal(parseCallout(BLOCK_TEMPLATES.peringatan)?.body.length, 1);
  assert.equal(unsafeDiagramReason(BLOCK_TEMPLATES.mermaid), null);
  assert.equal(unsafeDiagramReason(withDefaultClasses(BLOCK_TEMPLATES.mermaid)), null);
});

test("the inserted node is a code block in that language", () => {
  for (const language of DRAWN_BLOCK_LANGUAGES) {
    const node = drawnBlockNode(language);
    assert.equal(node.type, "codeBlock");
    assert.equal(node.attrs.language, language);
    assert.equal(node.content[0].text, BLOCK_TEMPLATES[language]);
  }
  assert.equal(isDrawnBlockLanguage("bash"), false);
  assert.equal(isDrawnBlockLanguage("langkah"), true);
  assert.equal(isDrawnBlockLanguage(null), false);
});
