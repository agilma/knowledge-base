"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownContent } from "@/components/document/MarkdownContent";

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  id,
  name,
  placeholder = "Tulis konten dalam format Markdown...",
  rows = 14,
  className,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<"write" | "preview">("write");

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={tab === "write" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setTab("write")}
          >
            Tulis
          </Button>
          <Button
            type="button"
            variant={tab === "preview" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setTab("preview")}
          >
            Pratinjau
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">Mendukung sintaks Markdown</span>
      </div>

      {tab === "write" ? (
        <Textarea
          id={id}
          name={name}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="font-mono text-sm leading-relaxed"
        />
      ) : (
        <div className="min-h-[280px] p-4 rounded-lg border bg-card/50 overflow-y-auto">
          {value.trim() ? (
            <MarkdownContent content={value} />
          ) : (
            <p className="text-sm text-muted-foreground italic">Belum ada konten untuk dipratinjau.</p>
          )}
        </div>
      )}
    </div>
  );
}
