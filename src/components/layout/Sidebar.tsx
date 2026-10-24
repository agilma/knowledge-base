import Link from "next/link";
import { Home, Search, Star, Clock, FolderOpen, PenLine } from "lucide-react";
import { UserMenu } from "@/components/auth/UserMenu";
import { getCollections } from "@/lib/services/collections";
import { Mark } from "@/components/brand/Mark";
import { getCurrentUser } from "@/lib/auth/session";
import { Role } from "@prisma/client";
import { buttonVariants } from "@/components/ui/button";

export async function Sidebar() {
  // Without a known user no collection is listed: what is shown is decided per
  // person now, so the sidebar fails closed.
  let collections: Awaited<ReturnType<typeof getCollections>> = [];
  let canWrite = false;
  try {
    const user = await getCurrentUser();
    if (user) {
      collections = await getCollections({ id: user.id, role: user.role });
      canWrite = user.role === Role.EDITOR || user.role === Role.ADMIN;
    }
  } catch {
    collections = [];
    canWrite = false;
  }

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border h-screen bg-background sticky top-0 left-0">
      <div className="p-4 flex items-center h-14 border-b border-border/50 shrink-0">
        <Mark className="h-5 w-5 mr-2.5 shrink-0" />
        <span className="font-semibold text-lg tracking-tight">Knowledge Base</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        {/* Writing usually occurs to you while reading something else, and the
            only entry points used to be the home page and a collection page. */}
        {canWrite && (
          <Link
            href="/docs/new"
            className={buttonVariants({
              variant: "outline",
              className: "w-full justify-start",
            })}
          >
            <PenLine className="mr-2 h-4 w-4" />
            Dokumen Baru
          </Link>
        )}

        <div className="space-y-1">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
            <Home className="w-4 h-4 text-muted-foreground" />
            Beranda
          </Link>
          <Link href="/search" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
            <Search className="w-4 h-4 text-muted-foreground" />
            Cari
          </Link>
        </div>

        <div className="space-y-1">
          <h4 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pustaka</h4>
          <Link href="/favorites" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
            <Star className="w-4 h-4 text-muted-foreground" />
            Favorit
          </Link>
          <Link href="/recent" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Terakhir Dibuka
          </Link>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between px-3 mb-2">
            <Link href="/collections" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
              Koleksi
            </Link>
          </div>
          {collections.map((col) => (
            <Link
              key={col.id}
              href={`/collections/${col.slug}`}
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground"
            >
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              {col.name}
            </Link>
          ))}
        </div>
      </nav>

      <div className="border-t border-border/50 shrink-0">
        <UserMenu />
      </div>
    </aside>
  );
}
