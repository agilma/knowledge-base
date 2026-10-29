export const COMMENT_MIN = 3;
export const COMMENT_MAX = 1000;

/**
 * A note or reply as it is kept: plain text, line breaks kept (at most one blank line in a row), the
 * ends trimmed. Throws what is wrong with it. It is shown as text, never as Markdown or HTML, so
 * nothing in it needs removing.
 */
export function cleanCommentBody(raw: unknown): string {
  if (typeof raw !== "string") throw new Error("Isi masukan wajib diisi");
  // Before any cleaning: what is far over the limit is refused as it is, so the work below is bounded
  // by a small constant whatever a hand-made request sends (a form's own limit is only the browser's).
  if (raw.length > COMMENT_MAX * 4) throw new Error(`Isi masukan maksimal ${COMMENT_MAX} karakter`);
  const text = raw
    .replace(/\r\n?/g, "\n")
    // control characters other than the line break and the tab, the zero-width and direction-changing
    // marks and the extra line separators: they only hide or reorder what is read
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u0085\u200B-\u200F\u2028-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g, "")
    // trailing blanks per line, without a pattern that can backtrack
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (text.length < COMMENT_MIN) throw new Error(`Isi masukan minimal ${COMMENT_MIN} karakter`);
  if (text.length > COMMENT_MAX) throw new Error(`Isi masukan maksimal ${COMMENT_MAX} karakter`);
  return text;
}
