"use client";

import { useState, type ReactNode } from "react";
import { Check, Link2 } from "lucide-react";

/**
 * A section heading that can hand out a link to itself, so a long guide can be
 * shared at the step that matters ("buka bagian Verifikasi") instead of from
 * the top. The id comes from `rehype-slug`.
 */
export function SectionHeading({
  level,
  id,
  children,
}: {
  level: 2 | 3;
  id?: string;
  children?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const Tag = level === 2 ? "h2" : "h3";

  const copyLink = async () => {
    if (!id) return;
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // No clipboard (plain http, or permission denied): put the link in the
      // address bar so it can still be copied from there.
      window.location.hash = id;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Tag id={id} className="group scroll-mt-4">
      {children}
      {id && (
        <button
          type="button"
          onClick={copyLink}
          aria-label="Salin tautan ke bagian ini"
          title="Salin tautan ke bagian ini"
          className="ml-2 inline-flex translate-y-0.5 items-center align-baseline text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-50"
        >
          {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
          <span role="status" className="sr-only">
            {copied ? "Tautan disalin" : ""}
          </span>
        </button>
      )}
    </Tag>
  );
}
