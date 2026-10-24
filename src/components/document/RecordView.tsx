"use client";

import { useEffect } from "react";
import { recordViewAction } from "@/app/docs/user-actions";

/**
 * Records the visit after the page is on screen. Doing it in the server render
 * would also count link prefetches and the service worker's background fetches
 * as "opened".
 */
export function RecordView({ documentId }: { documentId: string }) {
  useEffect(() => {
    if (!navigator.onLine) return;
    // navigator.onLine stays true on a dead connection; a failed record is not worth surfacing.
    recordViewAction(documentId).catch(() => {});
  }, [documentId]);

  return null;
}
