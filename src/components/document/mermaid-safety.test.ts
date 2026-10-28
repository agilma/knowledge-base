import { test } from "node:test";
import assert from "node:assert/strict";
import { unsafeDiagramReason } from "./mermaid-safety";

test("ordinary diagrams pass, including arrows that start with <", () => {
  assert.equal(unsafeDiagramReason('flowchart TD\n  A["SOW"] --> B{"OK?"}\n  B <--> C\n  C <-.-> D["a<br/>b"]'), null);
});

test("what strict mode leaves behind is refused", () => {
  assert.ok(unsafeDiagramReason('flowchart TD\n  A["<img src=https://x.test/p.gif>"]'));
  assert.ok(unsafeDiagramReason('flowchart TD\n  A --> B\n  click A "https://x.test" _blank'));
  assert.ok(unsafeDiagramReason('%%{init: {"themeCSS": ".a{}"}}%%\nflowchart TD\n A-->B'));
  assert.ok(unsafeDiagramReason("flowchart TD\n  A[\"x\"] --> B\n  style A fill:url(https://x.test/a)"));
});
