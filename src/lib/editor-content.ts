import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";

/**
 * Pure helpers for what the rich editor writes back to markdown.
 *
 * The editor reads a document and writes the whole thing out again on every
 * edit, so anything it cannot represent is silently lost at the first change.
 * `isLosslessRoundTrip` is how that is caught before it happens.
 */
export interface JsonNode {
  type?: string;
  content?: JsonNode[];
  [key: string]: unknown;
}

function isEmptyParagraph(n: JsonNode): boolean {
  return n.type === "paragraph" && (!n.content || n.content.length === 0);
}

/**
 * Removes empty paragraphs directly under the document: each Enter on an empty
 * line is one, and the page's typography already spaces paragraphs apart. Those
 * inside lists, quotes and tables stay. (A spacer between two lists would be
 * lost, but markdown cannot write one that reads back, so `isLosslessRoundTrip`
 * flags such a document instead and it is edited as markdown.)
 */
export function dropEmptyParagraphs(doc: JsonNode): JsonNode {
  if (!doc.content) return doc;
  return { ...doc, content: doc.content.filter((n) => !isEmptyParagraph(n)) };
}

type Ast = { type: string; children?: Ast[]; value?: string; [key: string]: unknown };

const parser = unified().use(remarkParse).use(remarkGfm);

function isBlankParagraph(n: Ast): boolean {
  if (n.type !== "paragraph") return false;
  return (n.children ?? []).every((c) => c.type === "text" && (c.value ?? "").replace(/[\s ]/g, "") === "");
}

// What a reader sees, without how the source was laid out: no positions, no
// loose/tight list flag, and no paragraphs that are only spacing.
function normalize(node: Ast): Ast {
  const { position: _position, spread: _spread, children, ...rest } = node as Ast & { position?: unknown };
  void _position;
  void _spread;
  if (!children) return rest as Ast;
  // A spacer between two lists is what keeps them two lists, so it counts.
  const keep = children.filter(
    (c, i) => !isBlankParagraph(c) || (children[i - 1]?.type === "list" && children[i + 1]?.type === "list")
  );
  return { ...rest, type: node.type, children: keep.map(normalize) };
}

export function markdownAst(markdown: string): Ast {
  return normalize(parser.parse(markdown) as unknown as Ast);
}

/**
 * True when `roundTripped` means the same as `original` to a reader, whatever
 * its layout. Images, footnotes, raw HTML, changed escapes and merged lists
 * all make it false.
 */
export function isLosslessRoundTrip(original: string, roundTripped: string): boolean {
  return JSON.stringify(markdownAst(original)) === JSON.stringify(markdownAst(roundTripped));
}
