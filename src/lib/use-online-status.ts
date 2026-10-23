"use client";

import { useEffect, useState } from "react";

/**
 * `navigator.onLine` only reports whether the device has *a* connection — it
 * stays true on a hotel captive portal, on wifi without internet, or when the
 * server itself is down. The service worker is the only part that sees whether
 * a request actually reached the server, so it reports back here and both
 * signals are combined.
 */
export function useOnlineStatus(): boolean {
  const [browserOnline, setBrowserOnline] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return navigator.onLine;
    }
    return true;
  });
  const [serverReachable, setServerReachable] = useState(true);

  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "NETWORK_STATUS") {
        setServerReachable(Boolean(event.data.reachable));
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    // This page may have loaded after the worker already noticed a failure.
    navigator.serviceWorker.controller?.postMessage({
      type: "QUERY_NETWORK_STATUS",
    });

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  return browserOnline && serverReachable;
}
