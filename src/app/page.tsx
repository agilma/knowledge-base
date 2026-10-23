import Link from "next/link";
import { Search } from "lucide-react";
import { Role, DocumentStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { getCollections } from "@/lib/services/collections";
import { getRecentlyUpdatedDocuments } from "@/lib/services/documents";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  const canSeeDrafts = user?.role === Role.EDITOR || user?.role === Role.ADMIN;

  const collections = await getCollections();
  const recentDocs = await getRecentlyUpdatedDocuments(5, { includeDrafts: canSeeDrafts });

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 pb-20 md:pb-10 space-y-12">
      <header className="space-y-4">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Selamat datang di Knowledge Base
        </h1>
        <p className="text-lg text-muted-foreground">
          Temukan pengetahuan internal, standar rekayasa, dan keputusan proyek.
        </p>
      </header>

      <section>
        <Link href="/search" className="block relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          <Input
            className="w-full pl-10 py-6 text-lg rounded-xl bg-muted/50 hover:bg-muted focus:bg-background transition-colors cursor-pointer border-transparent hover:border-border focus:border-ring"
            placeholder="Cari dokumen, topik, atau koleksi..."
            readOnly
          />
        </Link>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            Koleksi
          </h2>
          {user?.role === Role.ADMIN && (
            <Link
              href="/collections/new"
              className="text-sm font-medium text-primary hover:underline"
            >
              + Koleksi Baru
            </Link>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/collections/${collection.slug}`}
              className="p-5 rounded-xl border border-border/50 hover:border-border bg-card hover:bg-accent/50 transition-colors group"
            >
              <h3 className="font-medium text-lg mb-1 group-hover:text-accent-foreground">{collection.name}</h3>
              {collection.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{collection.description}</p>
              )}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Terbaru Diperbarui</h2>
          <div className="flex items-center gap-4">
            {canSeeDrafts && (
              <Link
                href="/docs/new"
                className="text-sm font-medium text-primary hover:underline"
              >
                + Dokumen Baru
              </Link>
            )}
            <Link href="/search" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Lihat semua
            </Link>
          </div>
        </div>
        {recentDocs.length > 0 ? (
          <div className="space-y-2">
            {recentDocs.map((doc) => (
              <Link
                key={doc.id}
                href={`/docs/${doc.slug}`}
                className="block p-4 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium truncate">{doc.title}</h3>
                  {doc.status === DocumentStatus.DRAFT && (
                    <Badge variant="outline" className="text-xs shrink-0 border-amber-500/50 text-amber-600 dark:text-amber-400">
                      Draf
                    </Badge>
                  )}
                  {doc.status === DocumentStatus.ARCHIVED && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      Diarsipkan
                    </Badge>
                  )}
                </div>
                {doc.excerpt && (
                  <p className="text-sm text-muted-foreground truncate mt-1">{doc.excerpt}</p>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center border rounded-xl border-dashed border-border bg-muted/20">
            <p className="text-sm text-muted-foreground">Belum ada dokumen.</p>
          </div>
        )}
      </section>
    </div>
  );
}
