import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { extractHeadings } from "./markdown";

/** The ids the page really renders, so the table of contents can be checked against them. */
function renderedIds(markdown: string): string[] {
  const html = renderToStaticMarkup(
    createElement(
      ReactMarkdown,
      { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug] },
      markdown
    )
  );
  return [...html.matchAll(/<h([23]) id="([^"]*)"/g)].map((m) => m[2]);
}

test("lists sections and sub-sections with their level", () => {
  assert.deepEqual(extractHeadings("# Judul\n\n## Konteks\ntext\n### Detail\n#### Dalam\n## Langkah"), [
    { id: "konteks", title: "Konteks", level: 2 },
    { id: "detail", title: "Detail", level: 3 },
    { id: "langkah", title: "Langkah", level: 2 },
  ]);
});

test("a heading inside fenced code is not a heading", () => {
  const md = "## Nyata\n\n```bash\n## komentar shell\n### lain\n```\n\n~~~\n## tilde\n~~~\n\n## Setelah";
  assert.deepEqual(extractHeadings(md).map((h) => h.title), ["Nyata", "Setelah"]);
});

test("an indented code block line is not a heading", () => {
  assert.deepEqual(extractHeadings("## A\n\n    ## kode\n"), [{ id: "a", title: "A", level: 2 }]);
});

test("repeated titles get the same numbered ids as the rendered page", () => {
  const md = "## Langkah\n\n## Langkah\n\n### Langkah\n\n## Langkah";
  assert.deepEqual(extractHeadings(md).map((h) => h.id), renderedIds(md));
});

test("headings of other levels still take part in the numbering", () => {
  const md = "# Langkah\n\n#### Langkah\n\n## Langkah";
  assert.deepEqual(extractHeadings(md).map((h) => h.id), renderedIds(md));
});

test("emphasis, code, links and closing hashes do not leak into ids", () => {
  const md = [
    "## Pakai **tebal** dan _miring_",
    "## Cek `retry()` dulu",
    "## Lihat [panduan](https://x.id/a) ini",
    "## Dengan penutup ##",
    "### snake_case_name",
  ].join("\n\n");
  assert.deepEqual(extractHeadings(md).map((h) => h.id), renderedIds(md));
  assert.equal(extractHeadings(md)[3].title, "Dengan penutup");
});

test("windows line endings and empty input", () => {
  assert.deepEqual(extractHeadings("## A\r\n\r\n### B\r\n").map((h) => h.id), ["a", "b"]);
  assert.deepEqual(extractHeadings(""), []);
});
