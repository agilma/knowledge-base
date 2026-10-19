"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const router = useRouter();
  const [isOffline, setIsOffline] = useState(false);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    // Initial status check
    const checkStatus = () => {
      const offline = !navigator.onLine;
      setIsOffline(offline);
      if (offline) {
        wasOfflineRef.current = true;
      }
    };

    checkStatus();

    const handleOnline = () => {
      setIsOffline(false);
      // Automatically refresh data once when connection is restored
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        router.refresh();
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      wasOfflineRef.current = true;
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [router]);

  if (!isOffline) {
    return null;
  }

  return (
    <div className="bg-amber-500/10 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-b border-amber-500/20 px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 transition-all">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>Anda sedang offline — menampilkan versi tersimpan</span>
    </div>
  );
}
