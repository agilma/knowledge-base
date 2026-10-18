import Link from "next/link";
import { collections, getDocumentsByCollection } from "@/lib/mockData";
import { FolderOpen } from "lucide-react";

export default function CollectionsIndexPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
      <header className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Collections</h1>
        <p className="text-lg text-muted-foreground">
          Browse all knowledge base collections.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {collections.map((collection) => {
          const docCount = getDocumentsByCollection(collection.id).length;
          return (
            <Link
              key={collection.id}
              href={`/collections/${collection.slug}`}
              className="p-6 rounded-xl border border-border/50 hover:border-border bg-card hover:bg-accent/50 transition-colors group flex flex-col h-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-muted rounded-md text-muted-foreground group-hover:text-primary transition-colors">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-medium">{collection.name}</h2>
              </div>
              <p className="text-muted-foreground mb-6 flex-1">
                {collection.description}
              </p>
              <div className="text-sm font-medium text-muted-foreground/80">
                {docCount} {docCount === 1 ? 'document' : 'documents'}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
