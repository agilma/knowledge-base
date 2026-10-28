/**
 * A line-by-line comparison of two texts, for showing what a version changed. No
 * dependency: documents are a few hundred lines, and the common start and end are
 * trimmed first, so what is left to compare is usually only the edited part.
 */
export type DiffLine = { type: "same" | "add" | "del"; text: string };
export type DiffItem = DiffLine | { type: "skip"; count: number };

/** Above this many cells (lines before times lines after) the middle is shown as wholly replaced instead of compared. */
export const MAX_DIFF_CELLS = 4_000_000;

function splitLines(text: string): string[] {
  if (text === "") return [];
  return text.replace(/\r\n/g, "\n").split("\n");
}

export function diffLines(before: string, after: string): DiffLine[] {
  const a = splitLines(before);
  const b = splitLines(after);

  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const head: DiffLine[] = a.slice(0, start).map((text) => ({ type: "same", text }));
  const tail: DiffLine[] = a.slice(endA).map((text) => ({ type: "same", text }));
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);

  return [...head, ...diffMiddle(midA, midB), ...tail];
}

function diffMiddle(a: string[], b: string[]): DiffLine[] {
  if (a.length === 0) return b.map((text) => ({ type: "add", text }));
  if (b.length === 0) return a.map((text) => ({ type: "del", text }));
  if (a.length * b.length > MAX_DIFF_CELLS) {
    return [...a.map((text): DiffLine => ({ type: "del", text })), ...b.map((text): DiffLine => ({ type: "add", text }))];
  }

  // Longest common subsequence table, filled from the end so the walk below goes forward.
  const width = b.length + 1;
  const lcs = new Uint32Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i * width + j] = a[i] === b[j] ? lcs[(i + 1) * width + j + 1] + 1 : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (lcs[(i + 1) * width + j] >= lcs[i * width + j + 1]) {
      out.push({ type: "del", text: a[i++] });
    } else {
      out.push({ type: "add", text: b[j++] });
    }
  }
  while (i < a.length) out.push({ type: "del", text: a[i++] });
  while (j < b.length) out.push({ type: "add", text: b[j++] });
  return out;
}

export function diffStats(lines: DiffLine[]): { added: number; removed: number } {
  return {
    added: lines.filter((l) => l.type === "add").length,
    removed: lines.filter((l) => l.type === "del").length,
  };
}

/** Keeps `context` unchanged lines around each change and folds the rest into "skip" markers. */
export function collapseUnchanged(lines: DiffLine[], context = 2): DiffItem[] {
  const keep = new Array<boolean>(lines.length).fill(false);
  lines.forEach((line, i) => {
    if (line.type === "same") return;
    for (let k = Math.max(0, i - context); k <= Math.min(lines.length - 1, i + context); k++) keep[k] = true;
  });
  const out: DiffItem[] = [];
  let skipped = 0;
  lines.forEach((line, i) => {
    if (keep[i]) {
      if (skipped > 0) out.push({ type: "skip", count: skipped });
      skipped = 0;
      out.push(line);
    } else {
      skipped++;
    }
  });
  if (skipped > 0) out.push({ type: "skip", count: skipped });
  return out;
}
