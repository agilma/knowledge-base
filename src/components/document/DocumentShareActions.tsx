"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, FileDown, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { documentUrl } from "@/lib/share";

type Feedback = { kind: "copied" } | { kind: "manual"; url: string } | null;

/**
 * Share and "save as PDF" for readers. Sharing hands over a link to the same
 * page, which still asks the recipient to sign in and checks their access, so
 * nothing here can widen who sees a document. The PDF is the browser's own
 * print of this page (see the `@media print` rules in globals.css).
 */
export function DocumentShareActions({ slug, title, excerpt }: { slug: string; title: string; excerpt?: string | null }) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const show = (next: Feedback) => {
    setFeedback(next);
    window.clearTimeout(timer.current);
    if (next?.kind === "copied") timer.current = window.setTimeout(() => setFeedback(null), 2500);
  };

  const share = async () => {
    const url = documentUrl(window.location.origin, slug);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: excerpt || undefined, url });
        return;
      } catch (err) {
        // Closing the share sheet is a choice, not a failure.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      show({ kind: "copied" });
    } catch {
      // No clipboard (plain http, or permission denied): show the link to copy by hand.
      show({ kind: "manual", url });
    }
  };

  const savePdf = () => {
    // The page prints as it looks, so a dark theme would print light text on
    // white paper. Switch to the light theme for the print and put it back after.
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    const restore = () => {
      window.removeEventListener("afterprint", restore);
      if (wasDark) root.classList.add("dark");
    };
    window.addEventListener("afterprint", restore);
    // Some mobile browsers return from print() before the dialog closes and
    // never fire afterprint, so the theme must not depend on it alone.
    window.setTimeout(restore, 60_000);
    root.classList.remove("dark");
    window.print();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button type="button" variant="outline" size="sm" onClick={share}>
        <Share2 className="mr-2 h-4 w-4" />
        Bagikan
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={savePdf} title="Buka dialog cetak, lalu pilih Simpan sebagai PDF">
        <FileDown className="mr-2 h-4 w-4" />
        PDF
      </Button>
      <span role="status" className="text-xs text-muted-foreground">
        {feedback?.kind === "copied" && (
          <span className="inline-flex items-center gap-1">
            <Check className="size-3.5" /> Tautan disalin. Penerima harus masuk dan punya akses.
          </span>
        )}
      </span>
      {feedback?.kind === "manual" && (
        <input
          readOnly
          aria-label="Tautan dokumen"
          value={feedback.url}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
        />
      )}
    </div>
  );
}

/** Where a printed copy came from; shown only on paper. The origin is known only in the browser. */
export function PrintSource({ slug, collection, status }: { slug: string; collection?: string; status: string }) {
  // Empty on the server and during hydration, the real origin afterwards.
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const url = origin ? documentUrl(origin, slug) : "";
  return (
    <p className="hidden print:block text-xs text-muted-foreground">
      Knowledge Base{collection ? ` · ${collection}` : ""}
      {status !== "PUBLISHED" ? ` · ${status === "DRAFT" ? "DRAF" : "DIARSIPKAN"}` : ""}
      {url ? ` · ${url}` : ""}
    </p>
  );
}
