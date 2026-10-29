"use client";

import { useState } from "react";
import { ExternalLink, Play, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/lib/use-online-status";
import type { Embed } from "@/lib/embed";

/**
 * A Canva, YouTube, Google Slides or Figma page inside the document. It shows a card first and loads
 * the provider's frame only when the reader asks: nothing is requested from another company by
 * merely opening a document (no tracking, no waiting, nothing to load offline), and the link to the
 * page itself is always there. `embed` comes from `parseEmbed`, which builds both addresses from
 * parts that passed a check, so neither is ever the author's text. The frame is sandboxed to what
 * these viewers need.
 */
export function EmbedFrame({ embed }: { embed: Embed }) {
  const online = useOnlineStatus();
  const [loaded, setLoaded] = useState(false);

  return (
    <figure className="not-prose my-6 break-inside-avoid rounded-xl border border-border bg-card p-3" data-embed={embed.provider}>
      {loaded && online ? (
        <div className="relative w-full overflow-hidden rounded-lg bg-muted print:hidden" style={{ aspectRatio: `${embed.ratio}` }}>
          <iframe
            src={embed.src}
            title={embed.caption || `${embed.label}: sematan`}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
            allow="fullscreen"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-lg bg-muted/50 p-4 print:hidden">
          <p className="text-sm text-muted-foreground">
            {embed.caption ? <span className="font-medium text-foreground">{embed.caption}</span> : <span className="font-medium text-foreground">Sematan {embed.label}</span>}
            <span className="block">Konten dari {embed.label}; dimuat hanya bila Anda menekan tombol di bawah.</span>
          </p>
          {online ? (
            <Button type="button" size="sm" onClick={() => setLoaded(true)}>
              <Play className="mr-1.5 size-4" />
              Tampilkan
            </Button>
          ) : (
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <WifiOff className="size-4" /> Butuh internet untuk menampilkannya.
            </p>
          )}
        </div>
      )}
      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="min-w-0 break-words text-muted-foreground">{embed.caption || `${embed.label}`}</span>
        <a href={embed.openUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline">
          Buka di {embed.label}
          <ExternalLink className="size-3.5" />
        </a>
      </figcaption>
    </figure>
  );
}
