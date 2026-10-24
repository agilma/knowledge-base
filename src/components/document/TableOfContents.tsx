import type { Heading } from "@/lib/markdown";

/** Links to a document's sections; sub-sections are indented under their section. */
export function TableOfContents({ headings }: { headings: Heading[] }) {
  return (
    <nav className="space-y-1" aria-label="Daftar isi">
      {headings.map((heading) => (
        <a
          key={heading.id}
          href={`#${heading.id}`}
          className={
            "block border-l-2 border-transparent py-1 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground " +
            (heading.level === 3 ? "pl-6" : "pl-3")
          }
        >
          {heading.title}
        </a>
      ))}
    </nav>
  );
}
