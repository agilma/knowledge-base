/** The page to show for a `?halaman=` value: a number from 1 to `pages`; anything unreadable is page 1. */
export function clampPage(requested: string | undefined, pages: number): number {
  const n = Number.parseInt(requested ?? "1", 10);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(n, 1), Math.max(pages, 1));
}
