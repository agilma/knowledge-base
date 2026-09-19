import Link from "next/link";
import { Search } from "lucide-react";
import { recentDocumentIds, favoriteDocumentIds, collections, documents } from "@/lib/mockData";
import { Input } from "@/components/ui/input";

export default function Home() {
  const recentDocs = documents.filter((d) => recentDocumentIds.includes(d.id));
  const favoriteDocs = documents.filter((d) => favoriteDocumentIds.includes(d.id));

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 pb-20 md:pb-10 space-y-12">
      <header className="space-y-4">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Welcome to Thunderlab</h1>
        <p className="text-lg text-muted-foreground">
          Discover internal knowledge, engineering standards, and project decisions.
        </p>
      </header>

      <section>
        <Link href="/search" className="block relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          <Input
            className="w-full pl-10 py-6 text-lg rounded-xl bg-muted/50 hover:bg-muted focus:bg-background transition-colors cursor-pointer border-transparent hover:border-border focus:border-ring"
            placeholder="Search documents..."
            readOnly
          />
        </Link>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          Collections
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/collections/${collection.slug}`}
              className="p-5 rounded-xl border border-border/50 hover:border-border bg-card hover:bg-accent/50 transition-colors group"
            >
              <h3 className="font-medium text-lg mb-1 group-hover:text-accent-foreground">{collection.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{collection.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Recently Updated</h2>
            <Link href="/recent" className="text-sm text-muted-foreground hover:text-foreground transition-colors">View all</Link>
          </div>
          <div className="space-y-2">
            {recentDocs.map((doc) => (
              <Link
                key={doc.id}
                href={`/docs/${doc.slug}`}
                className="block p-4 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
              >
                <h3 className="font-medium truncate">{doc.title}</h3>
                <p className="text-sm text-muted-foreground truncate mt-1">{doc.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Favorites</h2>
            <Link href="/favorites" className="text-sm text-muted-foreground hover:text-foreground transition-colors">View all</Link>
          </div>
          <div className="space-y-2">
            {favoriteDocs.map((doc) => (
              <Link
                key={doc.id}
                href={`/docs/${doc.slug}`}
                className="block p-4 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
              >
                <h3 className="font-medium truncate">{doc.title}</h3>
                <p className="text-sm text-muted-foreground truncate mt-1">{doc.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
