import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_STEPS, parseCallout, parseSteps } from "./step-blocks";

test("steps: title and description split on the first bar, numbering ignored", () => {
  assert.deepEqual(parseSteps("1. SOW | Scope disepakati\n2) Design | Buat design | dan UAT\nLaunch"), [
    { title: "SOW", description: "Scope disepakati" },
    { title: "Design", description: "Buat design | dan UAT" },
    { title: "Launch", description: "" },
  ]);
});

test("steps: blank lines are skipped, empty or oversize input is not a step list", () => {
  assert.equal(parseSteps("\n  \n")?.length ?? 0, 0);
  assert.equal(parseSteps(""), null);
  assert.equal(parseSteps("| tanpa judul"), null);
  const many = Array.from({ length: MAX_STEPS + 1 }, (_, i) => `Langkah ${i}`).join("\n");
  assert.equal(parseSteps(many), null);
});

test("callout: headline then text", () => {
  assert.deepEqual(parseCallout("! Belum ada approval?\n\nJangan mulai development.\nLengkapi design dulu."), {
    title: "Belum ada approval?",
    body: ["Jangan mulai development.", "Lengkapi design dulu."],
  });
  assert.deepEqual(parseCallout("Hati-hati"), { title: "Hati-hati", body: [] });
  assert.equal(parseCallout("  \n"), null);
});
