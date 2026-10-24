import GithubSlugger from "github-slugger";

export interface Heading {
  id: string;
  title: string;
  /** Only sections (`##`) and sub-sections (`###`) are listed. */
  level: 2 | 3;
}

const HEADING_LINE = /^ {0,3}(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/;
const FENCE_LINE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * What a heading reads as once rendered, which is what `rehype-slug` turns
 * into an id: link and image labels, emphasis and code marks are gone.
 */
function headingText(raw: string): string {
  return raw
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*|__)(?=\S)(.+?)(?<=\S)\1/g, "$2")
    .replace(/\*(?=\S)(.+?)(?<=\S)\*/g, "$1")
    .replace(/(^|[^\w])_(?=\S)(.+?)(?<=\S)_(?!\w)/g, "$1$2")
    .replace(/~~(.+?)~~/g, "$1")
    .trim();
}

/**
 * The sections of a document, for the table of contents.
 *
 * `rehype-slug` gives every heading, from `#` to `######`, an id from one shared
 * counter, so a repeated title becomes `langkah`, `langkah-1`, ... To produce
 * the same ids this slugs every heading in document order and only lists `##`
 * and `###`. Lines inside fenced code are not headings.
 */
export function extractHeadings(content: string): Heading[] {
  if (!content) return [];
  const slugger = new GithubSlugger();
  const headings: Heading[] = [];

  let fence: string | null = null;
  for (const line of content.split(/\r?\n/)) {
    const fenceMatch = FENCE_LINE.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (fence === null) fence = marker[0];
      else if (marker[0] === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;

    const match = HEADING_LINE.exec(line);
    if (!match) continue;

    const level = match[1].length;
    const title = headingText(match[2]);
    const id = slugger.slug(title);
    if ((level === 2 || level === 3) && title) {
      headings.push({ id, title, level });
    }
  }

  return headings;
}
