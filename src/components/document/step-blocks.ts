/**
 * Two small block types for documents written for people who are not technical:
 *
 *   ```langkah                         ```peringatan
 *   1. SOW | Scope disepakati          Belum ada approval?
 *   2. Design | Buat design dan UAT    Jangan mulai development.
 *   ```                                ```
 *
 * They stay plain text in the stored Markdown (search, history and the editor
 * see ordinary code blocks) and are drawn as numbered step cards and a red
 * notice. Anything that does not parse is shown as the code block it is.
 */
export interface Step {
  title: string;
  description: string;
}

export const MAX_STEPS = 12;

/** One step per line: `Title | one sentence`. A leading `1.` or `1)` is ignored, the numbers come from the order. */
export function parseSteps(text: string): Step[] | null {
  const steps: Step[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim().replace(/^\d+[.)]\s+/, "");
    if (!line) continue;
    const bar = line.indexOf("|");
    const title = (bar === -1 ? line : line.slice(0, bar)).trim();
    const description = bar === -1 ? "" : line.slice(bar + 1).trim();
    if (!title) return null;
    steps.push({ title, description });
  }
  return steps.length > 0 && steps.length <= MAX_STEPS ? steps : null;
}

export interface Callout {
  title: string;
  body: string[];
}

/** The first line is the headline (a leading `!` is ignored); the lines after it are the text. */
export function parseCallout(text: string): Callout | null {
  const lines = text.split("\n").map((l) => l.trim());
  const first = lines.findIndex((l) => l !== "");
  if (first === -1) return null;
  const title = lines[first].replace(/^!\s*/, "").trim();
  if (!title) return null;
  return { title, body: lines.slice(first + 1).filter((l) => l !== "") };
}
