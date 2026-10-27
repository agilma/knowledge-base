import Link from "next/link";
import { DocumentStatus } from "@prisma/client";
import { FileText, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

interface DocumentRowProps {
  doc: {
    slug: string;
    title: string;
    excerpt: string | null;
    status: DocumentStatus;
    restricted?: boolean;
    updatedAt: Date;
    collection: { name: string } | null;
  };
}

/** One document in a list: title, excerpt, collection and last update. */
export function DocumentRow({ doc }: DocumentRowProps) {
  return (
    <Link
      href={`/docs/${doc.slug}`}
      className="block p-5 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50 group"
    >
      <div className="flex items-start gap-4">
        <FileText className="w-5 h-5 text-muted-foreground mt-0.5 group-hover:text-primary transition-colors" />
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-medium group-hover:text-primary transition-colors">
              {doc.restricted && <Lock className="mr-1.5 inline size-4 text-muted-foreground" aria-label="Dokumen terbatas" />}
              {doc.title}
            </h3>
            {doc.status === DocumentStatus.DRAFT && (
              <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400">
                Draf
              </Badge>
            )}
            {doc.status === DocumentStatus.ARCHIVED && (
              <Badge variant="outline" className="text-xs">
                Diarsipkan
              </Badge>
            )}
          </div>
          {doc.excerpt && <p className="text-sm text-muted-foreground">{doc.excerpt}</p>}
          <p className="text-xs text-muted-foreground/80 mt-2">
            {doc.collection ? `${doc.collection.name} · ` : ""}
            Diperbarui {formatDate(doc.updatedAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}
