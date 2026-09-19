"use client";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Home, Search, Star, Clock, FolderOpen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DialogTitle } from "@radix-ui/react-dialog";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  const closeSheet = () => setOpen(false);

  return (
    <div className="md:hidden flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background z-10 h-14">
      <span className="font-semibold text-lg tracking-tight">Thunderlab KB</span>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="p-2 rounded-md hover:bg-muted transition-colors">
          <Menu className="w-5 h-5" />
          <span className="sr-only">Toggle Menu</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <DialogTitle className="sr-only">Navigation Menu</DialogTitle>
          <div className="p-4 border-b border-border/50 h-14 flex items-center">
            <span className="font-semibold text-lg tracking-tight">Thunderlab KB</span>
          </div>

          <nav className="p-3 space-y-6 overflow-y-auto h-[calc(100vh-3.5rem)]">
            <div className="space-y-1">
              <Link onClick={closeSheet} href="/" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
                <Home className="w-4 h-4 text-muted-foreground" />
                Home
              </Link>
              <Link onClick={closeSheet} href="/search" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
                <Search className="w-4 h-4 text-muted-foreground" />
                Search
              </Link>
            </div>

            <div className="space-y-1">
              <h4 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Library</h4>
              <Link onClick={closeSheet} href="/favorites" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
                <Star className="w-4 h-4 text-muted-foreground" />
                Favorites
              </Link>
              <Link onClick={closeSheet} href="/recent" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Recent
              </Link>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between px-3 mb-2">
                <Link onClick={closeSheet} href="/collections" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                  Collections
                </Link>
              </div>
              <Link onClick={closeSheet} href="/collections/engineering" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                Engineering
              </Link>
              <Link onClick={closeSheet} href="/collections/project" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                Project
              </Link>
              <Link onClick={closeSheet} href="/collections/process" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                Process
              </Link>
              <Link onClick={closeSheet} href="/collections/general-knowledge" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                General Knowledge
              </Link>
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
