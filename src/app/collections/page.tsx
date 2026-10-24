import Link from "next/link";
import { FolderOpen, Lock, Plus } from "lucide-react";
import { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { getCollectionsWithDocumentCount } from "@/lib/services/collections";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CollectionsIndexPage() {
  const user = await requireUser();
  const viewer = { id: user.id, role: user.role };
  const collections = await getCollectionsWithDocumentCount({ viewer });

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Koleksi</h1>
          <p className="text-lg text-muted-foreground">
            Jelajahi semua koleksi basis pengetahuan.
          </p>
        </div>
        {user?.role === Role.ADMIN && (
          <Link
            href="/collections/new"
            className={buttonVariants({ variant: "default", size: "sm" })}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Koleksi Baru
          </Link>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {collections.map((collection) => {
          const docCount = collection.documentCount;
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
                <h2 className="text-xl font-medium">
                  {collection.restricted && <Lock className="mr-1.5 inline size-4 text-muted-foreground" aria-label="Koleksi terbatas" />}
                  {collection.name}
                </h2>
              </div>
              <p className="text-muted-foreground mb-6 flex-1">
                {collection.description}
              </p>
              <div className="text-sm font-medium text-muted-foreground/80">
                {docCount} {docCount === 1 ? 'dokumen' : 'dokumen'}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
