/**
 * Pure helpers for full-text search: turning what a person typed into a
 * Postgres `tsquery`, and turning highlighted snippets back into segments the
 * UI can render without `dangerouslySetInnerHTML`.
 *
 * Nothing here touches the database, so it can be tested with `node:test`.
 * The SQL that uses it lives in `src/lib/services/documents.ts`.
 */

import { synonymsOf } from "./search-synonyms";

/**
 * Text-search configuration. `indonesian` is the Snowball stemmer shipped with
 * PostgreSQL 15+: it strips affixes (memotong, dipotong, pemotongan → potong),
 * which is what matters for Indonesian prose. English words in the same text
 * are barely touched by it, and since the document and the query are stemmed by
 * the same configuration they still match each other.
 */
export const SEARCH_CONFIG = "indonesian";

/**
 * The indexed expression. It MUST stay character-for-character the same as the
 * one in `prisma/migrations/3_fulltext_search/migration.sql` (a test enforces
 * this): Postgres only uses an expression index when the query repeats the
 * expression, and a mismatch silently falls back to a sequential scan.
 *
 * Weights: title A, excerpt B, content C. `content` is cut at 200 000
 * characters because a tsvector cannot exceed 1 MB, and an error there would
 * make the document impossible to save.
 */
export const SEARCH_VECTOR_SQL =
  `(setweight(to_tsvector('${SEARCH_CONFIG}', coalesce(title, '')), 'A') || ` +
  `setweight(to_tsvector('${SEARCH_CONFIG}', coalesce(excerpt, '')), 'B') || ` +
  `setweight(to_tsvector('${SEARCH_CONFIG}', left(content, 200000)), 'C'))`;

/** Markers wrapped around matches by `ts_headline`. Private-use characters that
 * people do not normally write; the service strips them from the text before
 * `ts_headline` runs (`HIGHLIGHT_MARKERS`), so a document that does contain
 * them cannot fake a highlight. */
export const HIGHLIGHT_START = "\uE000";
export const HIGHLIGHT_STOP = "\uE001";
export const HIGHLIGHT_MARKERS = HIGHLIGHT_START + HIGHLIGHT_STOP;

const MAX_QUERY_LENGTH = 200;
const MAX_GROUPS = 8;
const MAX_TERM_LENGTH = 50;
/** Terms shorter than this must match whole words: "di" must not match "digital". */
const MIN_PREFIX_LENGTH = 3;

/**
 * A group is one or more terms. A group with several terms came from a quoted
 * phrase and must match as adjacent words; a group with one term is a plain word.
 */
export type SearchGroup = string[];

function tokenize(text: string): string[] {
  return (text.match(/[\p{L}\p{N}]+/gu) ?? []).map((t) => t.slice(0, MAX_TERM_LENGTH));
}

/**
 * Splits raw input into groups. Anything that is not a letter or digit is a
 * separator, which is also what makes the result safe to put in a tsquery:
 * quotes, `&`, `|`, `!`, `:`, `(`, `\` can never survive.
 *
 * An unbalanced quote is ignored rather than treated as an error — the person
 * is mid-typing, not attacking.
 */
export function parseSearchQuery(raw: string): SearchGroup[] {
  const input = raw.slice(0, MAX_QUERY_LENGTH);
  const groups: SearchGroup[] = [];

  const parts = input.split('"');
  // With an even number of parts the last quote is unbalanced: its tail is plain text.
  const balanced = parts.length % 2 === 1;

  parts.forEach((part, index) => {
    const insideQuotes = index % 2 === 1 && (balanced || index < parts.length - 1);
    const tokens = tokenize(part);
    if (insideQuotes) {
      if (tokens.length > 0) groups.push(tokens);
    } else {
      for (const token of tokens) groups.push([token]);
    }
  });

  return groups.slice(0, MAX_GROUPS);
}

/**
 * Builds the string for `to_tsquery('indonesian', ...)`. Returns "" when there
 * is nothing to search for (empty input or only symbols).
 *
 * Plain words are ANDed and, from three letters up, match as prefixes
 * (`kupon:*`), so a half-typed word still finds something, and also match their synonyms
 * (`kasir` or `cashier`, see search-synonyms.ts). Quoted phrases match
 * adjacent whole words (`'gagal' <-> 'closing'`).
 */
export function buildTsQuery(groups: SearchGroup[]): string {
  return groups
    .map((group) => {
      if (group.length > 1) {
        return `(${group.map((term) => `'${term}'`).join(" <-> ")})`;
      }
      const [term] = group;
      const variants = synonymsOf(term).map((word) => (word.length >= MIN_PREFIX_LENGTH ? `'${word}':*` : `'${word}'`));
      return variants.length > 1 ? `(${variants.join(" | ")})` : variants[0];
    })
    .join(" & ");
}

/** Convenience: raw input straight to a tsquery string. */
export function toTsQuery(raw: string): string {
  return buildTsQuery(parseSearchQuery(raw));
}

export interface HighlightSegment {
  text: string;
  match: boolean;
}

/** Splits a `ts_headline` result at the markers. Unclosed markers are tolerated. */
export function splitHighlights(text: string): HighlightSegment[] {
  const segments: HighlightSegment[] = [];
  let match = false;
  let buffer = "";

  for (const char of text) {
    if (char === HIGHLIGHT_START || char === HIGHLIGHT_STOP) {
      if (buffer) segments.push({ text: buffer, match });
      buffer = "";
      match = char === HIGHLIGHT_START;
    } else {
      buffer += char;
    }
  }
  if (buffer) segments.push({ text: buffer, match });

  return segments;
}

/** Whether any part of a headline was highlighted. */
export function hasHighlight(text: string | null | undefined): boolean {
  return !!text && text.includes(HIGHLIGHT_START);
}

/**
 * Makes a snippet cut out of markdown readable as plain text: links and images
 * become their label, structural symbols disappear, lines become one.
 * Highlight markers are left alone.
 */
export function cleanSnippet(snippet: string): string {
  return snippet
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|[-*+>]|\d+\.)\s+/gm, "")
    .replace(/[`*~|]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const SEARCH_DOCUMENT_TYPES = ["PANDUAN", "MASALAH", "REFERENSI"] as const;
export type SearchDocumentType = (typeof SEARCH_DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<SearchDocumentType, string> = {
  PANDUAN: "Panduan",
  MASALAH: "Masalah",
  REFERENSI: "Referensi",
};

/** A URL value is untrusted: anything that is not a known type means "no filter". */
export function parseDocumentType(value: unknown): SearchDocumentType | undefined {
  return SEARCH_DOCUMENT_TYPES.find((type) => type === value);
}

/** `?collection=a&collection=b` arrives as an array; take the first value. */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export interface SearchFilters {
  q?: string;
  collection?: string;
  type?: string;
}

/** Link to the search page that keeps the given filters and drops empty ones. */
export function buildSearchHref(filters: SearchFilters): string {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q);
  if (filters.collection) params.set("collection", filters.collection);
  if (filters.type) params.set("type", filters.type);
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}
