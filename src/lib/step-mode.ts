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

/** A line longer than this is never a fence or a heading here: nothing real is, and it bounds the work on hostile text. */
const MAX_LINE = 2000;
/** Leading spaces, tabs and `>` marks: a block inside a list item or a quote is indented or quoted. */
const PREFIX = /^[ \t>]*/;

/** The nearest heading above a step, as plain text: a link or emphasis mark is not part of what is read out. */
function plain(heading: string): string {
  return heading.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*_~]/g, "").trim();
}

/** `## Title ##` to "Title"; null when the line is not a heading. Written without a pattern that can backtrack. */
function headingOf(line: string): string | null {
  const indent = line.length - line.trimStart().length;
  if (indent > 3) return null;
  let hashes = 0;
  while (line[indent + hashes] === "#") hashes += 1;
  if (hashes < 1 || hashes > 6) return null;
  const after = line.slice(indent + hashes);
  if (!/^[ \t]/.test(after)) return null;
  const text = after.trim().replace(/[ \t]+#+$/, "");
  return text || null;
}

/** An opening fence: its character run and the first word after it (the block's kind); null when the line is not one. */
function openingFence(line: string): { fence: string; kind: string } | null {
  const rest = line.slice(PREFIX.exec(line)![0].length);
  const mark = rest[0];
  if (mark !== "`" && mark !== "~") return null;
  let run = 0;
  while (rest[run] === mark) run += 1;
  if (run < 3) return null;
  return { fence: mark.repeat(run), kind: rest.slice(run).trim().split(/\s/, 1)[0] ?? "" };
}

export function extractStepFlow(markdown: string): FlowItem[] {
  const items: FlowItem[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let section: string | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const open = line.length > MAX_LINE ? null : openingFence(line);
    if (!open) {
      const heading = line.length > MAX_LINE ? null : headingOf(line);
      if (heading) section = plain(heading) || null;
      continue;
    }
    const { fence, kind } = open;
    const body: string[] = [];
    let j = i + 1;
    // The block ends at a line of the same character, at least as long (whatever it is indented or quoted
    // by); an unclosed one runs to the end.
    for (; j < lines.length; j += 1) {
      const closing = lines[j].replace(PREFIX, "").trim();
      if (closing.length >= fence.length && closing.length <= MAX_LINE && closing === fence[0].repeat(closing.length)) break;
      body.push(lines[j].replace(PREFIX, ""));
    }
    i = j;

    // Case-sensitive, like the page: "Langkah" is drawn there as the code block it is.
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
    hash ^= ch.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}
