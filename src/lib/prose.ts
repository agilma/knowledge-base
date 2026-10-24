/**
 * The one definition of how a document's body looks.
 *
 * The editor and the published page each used to carry their own copy of this
 * list, so they drifted apart and what you typed was not what you got. Both
 * import this instead.
 */
export const PROSE_CLASSNAME = [
  "prose prose-neutral dark:prose-invert max-w-none prose-base",
  "prose-headings:font-semibold prose-p:leading-relaxed prose-p:text-foreground/90",
  "prose-a:text-primary hover:prose-a:text-primary/80",
  // Keep body headings below the document title (36px), which a larger prose size
  // otherwise outgrows with a 48px h1.
  "prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl",
  // Preflight zeroes the borders typography relies on, leaving tables as
  // unseparated blocks of text.
  "prose-table:w-full prose-th:border-b prose-th:border-border prose-th:px-3 prose-th:py-2",
  "prose-td:border-b prose-td:border-border/50 prose-td:px-3 prose-td:py-2",
].join(" ");
