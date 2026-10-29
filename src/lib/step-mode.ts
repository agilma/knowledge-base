import { parseCallout, parseSteps } from "@/components/document/step-blocks";

/**
 * "Mode langkah": the steps of a document, one per screen, in the order they are written. A
 * document is read for its ```langkah blocks (every step of every block) and its ```peringatan
 * notices, which come up as a screen of their own where they stand. Everything else is left to the
 * normal page. Pure text in, so it can be tested without a browser.
 */
export type FlowItem =
  | { kind: "step"; title: string; description: string; section: string | null }
  | { kind: "callout"; title: string; body: string[] };

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)[^`]*$/;
const HEADING = /^ {0,3}#{1,6}[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/;

/** The nearest heading above a step, as plain text: a link or emphasis mark is not part of what is read out. */
function plain(heading: string): string {
  return heading.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*_~]/g, "").trim();
}

export function extractStepFlow(markdown: string): FlowItem[] {
  const items: FlowItem[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let section: string | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const open = FENCE_OPEN.exec(lines[i]);
    if (!open) {
      const heading = HEADING.exec(lines[i]);
      if (heading) section = plain(heading[1]) || null;
      continue;
    }
    const fence = open[1];
    const kind = open[2].toLowerCase();
    const body: string[] = [];
    let j = i + 1;
    // The block ends at a line of the same character, at least as long; an unclosed one runs to the end.
    for (; j < lines.length; j += 1) {
      const closing = lines[j].trim();
      if (closing.length >= fence.length && closing === fence[0].repeat(closing.length)) break;
      body.push(lines[j]);
    }
    i = j;

    if (kind === "langkah") {
      const steps = parseSteps(body.join("\n"));
      if (steps) for (const step of steps) items.push({ kind: "step", ...step, section });
    } else if (kind === "peringatan") {
      const callout = parseCallout(body.join("\n"));
      if (callout) items.push({ kind: "callout", ...callout });
    }
  }
  // A document with no step has nothing for this mode, whatever notices it holds.
  return items.some((item) => item.kind === "step") ? items : [];
}

/** How many of the items are steps (the notices are not counted or ticked). */
export function stepCount(items: FlowItem[]): number {
  return items.filter((item) => item.kind === "step").length;
}

/**
 * A short fingerprint of the steps' titles, so progress kept on a device belongs to this version
 * of the steps: when the document is edited the ticks start again instead of pointing at other steps.
 */
export function flowKey(items: FlowItem[]): string {
  let hash = 0x811c9dc5;
  for (const ch of items.map((item) => `${item.kind}:${item.title}`).join("\u0001")) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}
