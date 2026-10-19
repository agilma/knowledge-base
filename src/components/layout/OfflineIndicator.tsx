"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/use-online-status";

export function OfflineIndicator() {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
    } else if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      router.refresh();
    }
  }, [isOnline, router]);

  if (isOnline) {
    return null;
  }

  return (
    <div className="bg-amber-500/10 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-b border-amber-500/20 px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 transition-all">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>Anda sedang offline — menampilkan versi tersimpan</span>
    </div>
  );
}
