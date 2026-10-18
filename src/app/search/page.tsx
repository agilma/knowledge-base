"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search as SearchIcon, FileText, ChevronRight } from "lucide-react";
import { documents, collections } from "@/lib/mockData";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  const filteredResults = useMemo(() => {
    let results = documents;

    if (selectedCollection) {
      results = results.filter((doc) => doc.collectionId === selectedCollection);
    }

    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(
        (doc) =>
          doc.title.toLowerCase().includes(lowerQuery) ||
          doc.excerpt.toLowerCase().includes(lowerQuery) ||
          doc.description.toLowerCase().includes(lowerQuery)
      );
    }

    return results;
  }, [query, selectedCollection]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <header className="space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Search Knowledge Base</h1>

        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            className="w-full pl-12 py-7 text-lg rounded-xl bg-background border-border focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Search documents, topics, or collections..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedCollection === null ? "default" : "secondary"}
            className="cursor-pointer px-3 py-1 text-sm font-normal"
            onClick={() => setSelectedCollection(null)}
          >
            All Collections
          </Badge>
          {collections.map((col) => (
            <Badge
              key={col.id}
              variant={selectedCollection === col.id ? "default" : "secondary"}
              className="cursor-pointer px-3 py-1 text-sm font-normal"
              onClick={() => setSelectedCollection(col.id)}
            >
              {col.name}
            </Badge>
          ))}
        </div>
      </header>

      <section>
        <p className="text-sm text-muted-foreground mb-4">
          {filteredResults.length} {filteredResults.length === 1 ? 'result' : 'results'} found
        </p>

        <div className="space-y-4">
          {filteredResults.map((doc) => {
            const collection = collections.find((c) => c.id === doc.collectionId);
            return (
              <Link
                key={doc.id}
                href={`/docs/${doc.slug}`}
                className="block p-5 rounded-xl border border-border/50 hover:border-border bg-card hover:bg-accent/50 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <span className="font-medium">{collection?.name}</span>
                      <span>•</span>
                      <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <h2 className="text-xl font-medium text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      {doc.title}
                    </h2>
                    <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                      {doc.excerpt}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-6" />
                </div>
              </Link>
            );
          })}

          {filteredResults.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-lg">No documents found matching your search.</p>
              <p className="text-sm mt-2">Try adjusting your filters or search terms.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
