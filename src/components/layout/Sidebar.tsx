import Link from "next/link";
import { Home, Search, Star, Clock, FolderOpen } from "lucide-react";
import { UserMenu } from "@/components/auth/UserMenu";

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border h-screen bg-background sticky top-0 left-0">
      <div className="p-4 flex items-center h-14 border-b border-border/50 shrink-0">
        <span className="font-semibold text-lg tracking-tight">Thunderlab KB</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        <div className="space-y-1">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
            <Home className="w-4 h-4 text-muted-foreground" />
            Home
          </Link>
          <Link href="/search" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
            <Search className="w-4 h-4 text-muted-foreground" />
            Search
          </Link>
        </div>

        <div className="space-y-1">
          <h4 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Library</h4>
          <Link href="/favorites" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
            <Star className="w-4 h-4 text-muted-foreground" />
            Favorites
          </Link>
          <Link href="/recent" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Recent
          </Link>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between px-3 mb-2">
            <Link href="/collections" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
              Collections
            </Link>
          </div>
          <Link href="/collections/engineering" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
            Engineering
          </Link>
          <Link href="/collections/project" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
            Project
          </Link>
          <Link href="/collections/process" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
            Process
          </Link>
          <Link href="/collections/general-knowledge" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
            General Knowledge
          </Link>
        </div>
      </nav>

      <div className="border-t border-border/50 shrink-0">
        <UserMenu />
      </div>
    </aside>
  );
}
