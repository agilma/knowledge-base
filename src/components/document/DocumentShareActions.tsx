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
export function DocumentShareActions({ slug, title }: { slug: string; title: string }) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const timer = useRef<number | undefined>(undefined);
  const sharing = useRef(false);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const show = (next: Feedback) => {
    setFeedback(next);
    window.clearTimeout(timer.current);
    if (next?.kind === "copied") timer.current = window.setTimeout(() => setFeedback(null), 2500);
  };

  const share = async () => {
    // A second tap while the share sheet is open would be rejected and mistaken for "no share support".
    if (sharing.current) return;
    sharing.current = true;
    try {
      await doShare();
    } finally {
      sharing.current = false;
    }
  };

  const doShare = async () => {
    const url = documentUrl(window.location.origin, slug);
    if (typeof navigator.share === "function") {
      try {
        // Title and link only: the excerpt is document content, and the person it is sent to may not have access to it.
        await navigator.share({ title, url });
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

  // The print stylesheet makes the page light whatever the theme, so this is just the dialog.
  const savePdf = () => window.print();

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button type="button" variant="outline" size="sm" onClick={share}>
        <Share2 className="mr-2 h-4 w-4" />
        Bagikan
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={savePdf} title="Buka dialog cetak, lalu pilih Simpan sebagai PDF">
        <FileDown className="mr-2 h-4 w-4" />
        Simpan PDF
      </Button>
      <span role="status" className="text-xs text-muted-foreground empty:hidden">
        {feedback?.kind === "copied" && (
          <span className="inline-flex items-center gap-1">
            <Check className="size-3.5" /> Tautan disalin. Penerima harus masuk dan punya akses.
          </span>
        )}
      </span>
      {feedback?.kind === "manual" && (
        <input
          readOnly
          autoFocus
          aria-label="Salin tautan dokumen ini secara manual"
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
