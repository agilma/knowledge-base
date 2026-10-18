"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { LogOut, User as UserIcon } from "lucide-react";
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
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function UserMenu() {
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-12 w-full items-center px-4">
        <div className="h-4 w-20 animate-pulse rounded bg-muted"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex w-full items-center justify-between p-4">
        <Button variant="outline" className="w-full justify-start" render={<Link href="/login" />} >
          Masuk
        </Button>
        <div className="ml-2">
          <ThemeToggle />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-between p-4">
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <Button variant="ghost" className="w-[180px] justify-start px-2 hover:bg-muted">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <UserIcon className="h-4 w-4 text-primary" />
              </div>
              <span className="truncate text-sm font-medium">{user.name}</span>
            </div>
          </Button>
        } />
        <DropdownMenuContent align="start" className="w-[200px]">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive dark:focus:bg-destructive/20" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Keluar</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ThemeToggle />
    </div>
  );
}
