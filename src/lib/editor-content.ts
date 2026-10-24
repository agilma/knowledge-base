/**
 * Pure helpers for what the editor writes back to markdown.
 *
 * Each Enter on an empty line is an empty paragraph to the editor, and the
 * markdown serializer writes it as a literal `&nbsp;` line. Paragraphs are
 * already spaced apart by the page's typography, so those lines only litter
 * the stored text and make a document that was left with stray Enters look
 * edited. They are dropped from what is saved; the editor itself keeps them,
 * so the cursor never jumps while typing.
 */
export interface JsonNode {
  type?: string;
  content?: JsonNode[];
  [key: string]: unknown;
}

/** Removes empty paragraphs directly under the document. Those inside lists, quotes and tables stay. */
export function dropEmptyParagraphs(doc: JsonNode): JsonNode {
  if (!doc.content) return doc;
  const kept = doc.content.filter((n) => !(n.type === "paragraph" && (!n.content || n.content.length === 0)));
  return { ...doc, content: kept };
}
