/** The address people should be given for a document: no hash, no query, and the same one every time. */
export function documentUrl(origin: string, slug: string): string {
  return `${origin}/docs/${encodeURIComponent(slug)}`;
}
