export const COMMENT_MIN = 3;
export const COMMENT_MAX = 1000;

/**
 * A note or reply as it is kept: plain text, line breaks kept (at most one blank line in a row), the
 * ends trimmed. Throws what is wrong with it. It is shown as text, never as Markdown or HTML, so
 * nothing in it needs removing.
 */
export function cleanCommentBody(raw: unknown): string {
  if (typeof raw !== "string") throw new Error("Isi masukan wajib diisi");
  const text = raw
    .replace(/\r\n?/g, "\n")
    // control characters other than the line break and the tab (they only hide things)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (text.length < COMMENT_MIN) throw new Error(`Isi masukan minimal ${COMMENT_MIN} karakter`);
  if (text.length > COMMENT_MAX) throw new Error(`Isi masukan maksimal ${COMMENT_MAX} karakter`);
  return text;
}
