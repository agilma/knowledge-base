"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut, User as UserIcon, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function UserMenu() {
  const { data: session, status } = useSession();

  const handleSignOut = async () => {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CLEAR_PAGE_CACHE" });
    }
    if ("caches" in window) {
      try {
        await caches.delete("pages-rsc-cache");
      } catch {
        // ignore
      }
    }
    await signOut({ callbackUrl: "/login" });
  };

  if (status === "loading") {
    return (
      <div className="flex h-12 w-full items-center px-4">
        <div className="h-4 w-20 animate-pulse rounded bg-muted"></div>
      </div>
    );
  }

  const user = session?.user;

  if (!user) {
    return (
      <div className="flex w-full items-center justify-between p-4">
        <Button variant="outline" className="w-full justify-start" render={<Link href="/login" />}>
          Masuk
        </Button>
        <div className="ml-2">
          <ThemeToggle />
        </div>
      </div>
    );
  }

  const roleLabel = user.role || "VIEWER";

  return (
    <div className="flex w-full items-center justify-between p-4">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="w-[180px] justify-start px-2 hover:bg-muted">
              <div className="flex items-center gap-2 overflow-hidden">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name || "User"}
                    width={24}
                    height={24}
                    className="h-6 w-6 shrink-0 rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <UserIcon className="h-4 w-4 text-primary" />
                  </div>
                )}
                <span className="truncate text-sm font-medium">{user.name || user.email}</span>
              </div>
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-[200px]">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name || "User"}</p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {user.email}
              </p>
              <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                <Shield className="h-3 w-3" />
                <span>{roleLabel}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive dark:focus:bg-destructive/20"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Keluar</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ThemeToggle />
    </div>
  );
}
