import { test } from "node:test";
import assert from "node:assert/strict";
import { naturalWidth, withDefaultClasses } from "./mermaid-style";
import { unsafeDiagramReason } from "./mermaid-safety";

test("a flowchart gets the ready-made classes, once", () => {
  const out = withDefaultClasses("flowchart TD\n  A --> B\n");
  assert.match(out, /classDef start/);
  assert.match(out, /classDef decision/);
  assert.match(out, /classDef stop/);
  assert.match(out, /classDef done/);
  assert.equal(withDefaultClasses(out), out);
  assert.match(withDefaultClasses("graph LR\n A-->B"), /classDef stop/);
});

test("other diagram types and charts with their own classes are left alone", () => {
  const seq = "sequenceDiagram\n  A->>B: hai";
  assert.equal(withDefaultClasses(seq), seq);
  const own = "flowchart TD\n  A --> B\n  classDef start fill:#fff";
  assert.equal(withDefaultClasses(own), own);
});

test("the added classes pass the safety check", () => {
  assert.equal(unsafeDiagramReason(withDefaultClasses("flowchart TD\n A --> B")), null);
});

test("reads the natural width from the viewBox", () => {
  assert.equal(naturalWidth('<svg viewBox="0 0 452.6 700.2">'), 453);
  assert.equal(naturalWidth("<svg>"), null);
});
