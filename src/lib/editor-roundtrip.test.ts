import test from "node:test";
import assert from "node:assert/strict";
import { MarkdownManager } from "@tiptap/markdown";
import { createContentExtensions } from "./editor-extensions";
import { CodeBlockWithPreview } from "../components/editor/code-block-preview";
import { dropEmptyParagraphs, isLosslessRoundTrip, type JsonNode } from "./editor-content";

const manager = new MarkdownManager({ extensions: createContentExtensions() } as never);
// What the browser actually runs: the same model with a preview drawn under some code blocks.
const previewManager = new MarkdownManager({ extensions: createContentExtensions(CodeBlockWithPreview) } as never);

/** What the editor would save after the document is opened and edited. */
function save(markdown: string): string {
  return manager.serialize(dropEmptyParagraphs(manager.parse(markdown) as JsonNode) as never);
}

const SAFE: Record<string, string> = {
  headings: "## Konteks\n\n### Sub judul\n\nIsi.\n",
  marks: "Teks **tebal**, *miring*, ~~coret~~, `kode` dan [tautan](https://example.com \"judul\").\n",
  "nested lists": "1. Satu\n2. Dua\n   - anak a\n   - anak b\n3. Tiga\n\n- [ ] belum\n- [x] sudah\n",
  "loose list": "- a\n\n- b\n\n- c\n",
  quote: "> Kutipan penting\n",
  code: "```bash\necho \"halo\"\n```\n",
  "step cards and notice": "```langkah\n1. SOW | Scope disepakati\n2. Design | Buat design dan UAT\n```\n\n```peringatan\n! Belum ada approval?\nJangan mulai development.\n```\n",
  // Arrows, quotes and brackets must survive an open-and-save in the editor.
  mermaid: "```mermaid\nflowchart TD\n  A[\"SOW\"] --> B{\"Approval?\"}\n  B -- Ya --> C[\"Development\"]\n```\n",
  table: "| A | B |\n| --- | --- |\n| a1 | b1 |\n| a\\|2 | `x\\|y` |\n",
  rule: "Atas\n\n---\n\nBawah\n",
  "special characters": "* _ < > & © “ ” – — … 😀 日本語\n",
  "extra blank lines": "Satu\n\n\n\nDua\n",
  "spacer paragraph": "Satu\n\n&nbsp;\n\nDua\n",
  setext: "Judul\n=====\n\nIsi\n",
};

const LOSSY: Record<string, string> = {
  image: "x ![gambar](https://x.com/a.png \"t\") y\n",
  footnote: "Kalimat[^1].\n\n[^1]: Isi catatan.\n",
  "inline html": "Teks <span style=\"color:red\">merah</span>\n",
  "block html": "<div class=\"x\">\n  blok **html**\n</div>\n",
  details: "<details><summary>Klik</summary>\n\nisi\n\n</details>\n",
  comment: "Satu\n\n<!-- catatan -->\n\nDua\n",
  "fence inside fence": "````md\n```js\nconst a = 1;\n```\n````\n",
  "escaped heading": "\\# bukan judul\n",
  "spacer between lists": "- a\n- b\n\n&nbsp;\n\n- c\n",
  "spacer between numbered lists": "1. satu\n\n&nbsp;\n\n1. mulai lagi\n",
  "escaped list": "1\\. bukan daftar\n",
};

for (const [name, md] of Object.entries(SAFE)) {
  test(`stays the same for a reader: ${name}`, () => {
    const once = save(md);
    assert.ok(isLosslessRoundTrip(md, once), `changed:\n${md}\n--->\n${once}`);
    // opening and saving again changes nothing more
    assert.equal(save(once), once);
  });
}

for (const [name, md] of Object.entries(LOSSY)) {
  test(`is caught as lossy: ${name}`, () => {
    assert.ok(!isLosslessRoundTrip(md, save(md)), `should differ:\n${md}\n--->\n${save(md)}`);
  });
}

test("layout differences alone are not loss", () => {
  assert.ok(isLosslessRoundTrip("| A | B |\n| - | - |\n| 1 | 2 |\n", "| A   | B   |\n| --- | --- |\n| 1   | 2   |\n"));
  assert.ok(isLosslessRoundTrip("* a\n* b\n", "- a\n- b\n"));
  assert.ok(isLosslessRoundTrip("_a_ __b__\n", "*a* **b**\n"));
});

test("the preview-drawing code block matches the plain one on code blocks in awkward places", () => {
  const cases = [
    "```ts title=x\nconst a = 1;\n```\n",
    "~~~\ntilde fence\n~~~\n",
    "```\n```\n",
    "```\n\n```\n",
    "- item\n\n  ```bash\n  echo hai\n  ```\n",
    "> kutipan\n>\n> ```text\n> baris\n> ```\n",
    "```Mermaid\nflowchart TD\n```\n",
    "```langkah extra\nA | b\n```\n",
    "````md\n```js\nx\n```\n````\n",
  ];
  for (const md of cases) {
    assert.equal(previewManager.serialize(dropEmptyParagraphs(previewManager.parse(md) as JsonNode) as never), save(md), `differs for:\n${md}`);
  }
});

test("the editor's preview-drawing code block reads and writes exactly the same Markdown", () => {
  const savePreview = (md: string) => previewManager.serialize(dropEmptyParagraphs(previewManager.parse(md) as JsonNode) as never);
  for (const md of [...Object.values(SAFE), ...Object.values(LOSSY)]) {
    assert.equal(savePreview(md), save(md), `differs for:\n${md}`);
  }
});
