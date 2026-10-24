import { isEquivalentMarkdown } from "./document-templates";

/** Revisions kept per document; older ones are dropped on the next save. */
export const REVISION_LIMIT = 100;

export interface RevisionContent {
  title: string;
  excerpt: string | null;
  content: string;
  type: string;
}

/**
 * Whether a save changed anything worth a revision. The visual editor rewrites
 * markdown on load (`_a_` to `*a*`), so an untouched document would otherwise
 * differ byte for byte and add a revision every time someone pressed save.
 * An empty excerpt and a missing one are the same thing.
 */
export function hasMeaningfulChange(before: RevisionContent, after: RevisionContent): boolean {
  return (
    before.title !== after.title ||
    before.type !== after.type ||
    (before.excerpt ?? "") !== (after.excerpt ?? "") ||
    !isEquivalentMarkdown(before.content, after.content)
  );
}

export interface RevisionSize {
  version: number;
  size: number;
}

/**
 * Size change of each version against the one before it, for the history list.
 * `rows` may be in any order; the first version has nothing to compare with.
 */
export function sizeChanges(rows: RevisionSize[]): Map<number, number | null> {
  const byVersion = [...rows].sort((a, b) => a.version - b.version);
  const changes = new Map<number, number | null>();
  byVersion.forEach((row, index) => {
    changes.set(row.version, index === 0 ? null : row.size - byVersion[index - 1].size);
  });
  return changes;
}

/** "+120", "-8", "0"; null (first version) reads as "awal". */
export function formatSizeChange(change: number | null | undefined): string {
  if (change === null || change === undefined) return "awal";
  if (change === 0) return "0";
  return change > 0 ? `+${change}` : `${change}`;
}

/** The version number to give the next revision. */
export function nextVersion(latest: number | null | undefined): number {
  return (latest ?? 0) + 1;
}
