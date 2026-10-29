"use client";

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Home, Search, Star, Clock, FolderOpen, Users, Download, SearchX, Trash2, UsersRound, MessageSquare } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { UserMenu } from "@/components/auth/UserMenu";
import { Mark } from "@/components/brand/Mark";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const role = useSession().data?.user?.role;
  const isAdmin = role === "ADMIN";
  const canWrite = role === "ADMIN" || role === "EDITOR";

  const closeSheet = () => setOpen(false);

  return (
    <div className="md:hidden print:hidden flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background z-10 h-14">
      <div className="flex items-center">
        <Mark className="h-5 w-5 mr-2.5 shrink-0" />
        <span className="font-semibold text-lg tracking-tight">Knowledge Base</span>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="p-2 rounded-md hover:bg-muted transition-colors">
          <Menu className="w-5 h-5" />
          <span className="sr-only">Buka Menu Navigasi</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
          <div className="p-4 border-b border-border/50 h-14 flex items-center shrink-0">
            <Mark className="h-5 w-5 mr-2.5 shrink-0" />
            <span className="font-semibold text-lg tracking-tight">Knowledge Base</span>
          </div>

          <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
            <div className="space-y-1">
              <Link onClick={closeSheet} href="/" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
                <Home className="w-4 h-4 text-muted-foreground" />
                Beranda
              </Link>
              <Link onClick={closeSheet} href="/search" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
                <Search className="w-4 h-4 text-muted-foreground" />
                Cari
              </Link>
            </div>

            <div className="space-y-1">
              <h4 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pustaka</h4>
              <Link onClick={closeSheet} href="/favorites" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
                <Star className="w-4 h-4 text-muted-foreground" />
                Favorit
              </Link>
              <Link onClick={closeSheet} href="/recent" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Terakhir Dibuka
              </Link>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between px-3 mb-2">
                <Link onClick={closeSheet} href="/collections" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                  Koleksi
                </Link>
              </div>
              <Link onClick={closeSheet} href="/collections" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                Lihat Semua Koleksi
              </Link>
            </div>

            {canWrite && (
              <div className="space-y-1">
                <Link onClick={closeSheet} href="/admin/pencarian" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
                  <SearchX className="w-4 h-4 text-muted-foreground" />
                  Topik yang belum ada
                </Link>
                <Link onClick={closeSheet} href="/admin/masukan" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  Masukan pembaca
                </Link>
              </div>
            )}
            {isAdmin && (
              <div className="space-y-1">
                <h4 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Admin</h4>
                <Link onClick={closeSheet} href="/admin/users" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  Pengguna
                </Link>
                <Link onClick={closeSheet} href="/admin/ekspor" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
                  <Download className="w-4 h-4 text-muted-foreground" />
                  Ekspor
                </Link>
                <Link onClick={closeSheet} href="/admin/grup" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
                  <UsersRound className="w-4 h-4 text-muted-foreground" />
                  Grup
                </Link>
                <Link onClick={closeSheet} href="/admin/sampah" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-foreground">
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                  Tempat sampah
                </Link>
              </div>
            )}
          </nav>

          <div className="border-t border-border/50 shrink-0">
            <UserMenu />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
