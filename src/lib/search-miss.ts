/**
 * Turns what someone typed into the phrase kept in the list of searches that found nothing.
 * The list is read by editors and holds no user, so anything that could identify a person or
 * is not a topic (an email, a phone or account number, a long sentence) is not kept at all.
 */
export const MISS_MAX_CHARS = 100;
export const MISS_MAX_WORDS = 8;

export function normalizeMissQuery(raw: string): string | null {
  if (typeof raw !== "string") return null;
  if (raw.includes("@")) return null;
  // six digits in a row: a phone, an invoice or account number, not a topic
  if (/\d[\s.-]?\d[\s.-]?\d[\s.-]?\d[\s.-]?\d[\s.-]?\d/.test(raw)) return null;
  const text = raw
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  if (text.length < 2 || text.length > MISS_MAX_CHARS) return null;
  if (text.split(" ").length > MISS_MAX_WORDS) return null;
  return text;
}
