import GithubSlugger from "github-slugger";

export interface Heading {
  id: string;
  title: string;
}

export function extractHeadings(content: string): Heading[] {
  if (!content) return [];
  const slugger = new GithubSlugger();
  const headings: Heading[] = [];

  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ") && !trimmed.startsWith("### ")) {
      const rawTitle = trimmed.replace(/^##\s+/, "").trim();
      const cleanTitle = rawTitle.replace(/[*_`]/g, "");
      const id = slugger.slug(cleanTitle);
      headings.push({ id, title: cleanTitle });
    }
  }

  return headings;
}
