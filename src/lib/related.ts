/**
 * Rules for "Pengetahuan Terkait", kept free of the database so they can be
 * tested.
 *
 * A relation is symmetric from a reader's point of view: if guide A points at
 * problem B, a person reading B wants A too. The table stores one row per pair,
 * in whichever direction it was first written, so reading and editing must treat
 * both directions as the same relation.
 */

/** More than this stops being "related" and starts being a table of contents. */
export const MAX_RELATED = 20;

/**
 * Cleans the ids sent by the form: only strings, no blanks, no repeats, never
 * the document itself, at most MAX_RELATED. A form can be posted by hand, so
 * nothing about the input is assumed.
 */
export function parseRelatedIds(values: unknown[], selfId?: string): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    const id = value.trim();
    if (!id || id.length > 100 || id === selfId) continue;
    seen.add(id);
    if (seen.size === MAX_RELATED) break;
  }
  return [...seen];
}

/** What to write so that `current` neighbours become `desired`. */
export function diffRelations(
  current: string[],
  desired: string[]
): { add: string[]; remove: string[] } {
  const have = new Set(current);
  const want = new Set(desired);
  return {
    add: desired.filter((id) => !have.has(id)),
    remove: current.filter((id) => !want.has(id)),
  };
}
