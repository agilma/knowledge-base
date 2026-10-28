/** Escapes `\`, `%` and `_` so user text is matched literally inside a LIKE or ILIKE pattern ("100% sales" is not a wildcard). */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
