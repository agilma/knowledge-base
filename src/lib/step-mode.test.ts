import { test } from "node:test";
import assert from "node:assert/strict";
import { extractStepFlow, flowKey, stepCount } from "./step-mode";

const DOC = [
  "# Closing",
  "Pengantar.",
  "## Sebelum mulai",
  "```peringatan",
  "Belum ada approval?",
  "Jangan mulai.",
  "```",
  "## Langkah closing",
  "```langkah",
  "1. Login | Pakai akun koordinator",
  "2. Buka menu Riwayat",
  "```",
  "Teks biasa.",
  "~~~langkah",
  "Retry | Klik Retry",
  "~~~",
  "```js",
  "const x = 1; // bukan langkah",
  "```",
].join("\n");

test("steps and notices come out in the order written, steps with their heading", () => {
  const items = extractStepFlow(DOC);
  assert.deepEqual(
    items.map((i) => [i.kind, i.title]),
    [["callout", "Belum ada approval?"], ["step", "Login"], ["step", "Buka menu Riwayat"], ["step", "Retry"]],
  );
  const first = items[1];
  assert.ok(first.kind === "step" && first.section === "Langkah closing" && first.description === "Pakai akun koordinator");
  assert.equal(stepCount(items), 3);
});

test("a document without a step block, or with only notices, has no flow", () => {
  assert.deepEqual(extractStepFlow("# Judul\n\nTeks biasa"), []);
  assert.deepEqual(extractStepFlow("```peringatan\nAwas\n```"), []);
  assert.deepEqual(extractStepFlow(""), []);
});

test("blocks that do not parse are skipped, an unclosed block runs to the end, a longer fence is not closed by a shorter", () => {
  assert.deepEqual(extractStepFlow("```langkah\n | tanpa judul\n```"), []);
  assert.equal(extractStepFlow("```langkah\nSatu\nDua").length, 2);
  const nested = extractStepFlow("````langkah\nSatu\n```\nDua\n````");
  assert.deepEqual(nested.map((i) => i.title), ["Satu", "```", "Dua"], "the inner ``` line is text of the block, not its end");
  assert.equal(extractStepFlow("```js\n```langkah\nx\n```\n```").length, 0, "a step block inside another code block is just text");
});

test("the key follows the titles, so an edit starts the ticks again", () => {
  const a = flowKey(extractStepFlow(DOC));
  assert.equal(a, flowKey(extractStepFlow(DOC)));
  assert.notEqual(a, flowKey(extractStepFlow(DOC.replace("Login", "Masuk"))));
  assert.equal(a, flowKey(extractStepFlow(DOC.replace("Pakai akun koordinator", "Beda deskripsi"))), "wording of a description does not reset it");
});

test("blocks inside a list item or a quote are found, as the page draws them; the kind is case-sensitive", () => {
  assert.deepEqual(extractStepFlow("1. Siapkan:\n\n    ```langkah\n    A\n    B\n    ```\n").map((i) => i.title), ["A", "B"]);
  assert.deepEqual(extractStepFlow("> ```langkah\n> A\n> ```").map((i) => i.title), ["A"]);
  assert.deepEqual(extractStepFlow("```Langkah\nA\n```"), []);
  assert.deepEqual(extractStepFlow("```langkah\nA\n    ```\nB\n```").map((i) => i.title), ["A"], "a closing fence may be indented");
});

test("hostile long lines cost next to nothing", () => {
  const started = Date.now();
  extractStepFlow("```" + "a".repeat(200_000) + "`");
  extractStepFlow("# a" + " ".repeat(200_000) + "x");
  extractStepFlow(("#" + " ".repeat(500) + "x\n").repeat(500));
  assert.ok(Date.now() - started < 500, `took ${Date.now() - started} ms`);
});

test("the key tells apart titles that differ only by an emoji", () => {
  const key = (title: string) => flowKey(extractStepFlow("```langkah\n" + title + "\n```"));
  assert.notEqual(key("😀 a"), key("😁 a"));
});
