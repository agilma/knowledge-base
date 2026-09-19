import Link from "next/link";
import { documents, recentDocumentIds, collections } from "@/lib/mockData";
import { FileText, Clock, ChevronRight } from "lucide-react";

export default function RecentPage() {
  const recentDocs = documents.filter((d) => recentDocumentIds.includes(d.id));

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <Clock className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-semibold tracking-tight">Recently Viewed</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Documents you have interacted with recently.
        </p>
      </header>

      <section className="space-y-4">
        {recentDocs.length > 0 ? (
          recentDocs.map((doc) => {
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
          })
        ) : (
          <div className="text-center py-20 border rounded-xl border-dashed border-border bg-muted/20">
            <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-foreground font-medium">No recent documents.</p>
            <p className="text-sm text-muted-foreground mt-1">Documents you open will appear here.</p>
          </div>
        )}
      </section>
    </div>
  );
}
