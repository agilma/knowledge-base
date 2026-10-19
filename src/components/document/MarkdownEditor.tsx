"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  rows?: number;
  className?: string;
}

const DynamicMDXEditor = dynamic(
  () => import("./InitializedMDXEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[280px] p-4 border rounded-lg bg-card animate-pulse flex items-center justify-center text-sm text-muted-foreground">
        Memuat editor visual...
      </div>
    ),
  }
);

export function MarkdownEditor({
  value,
  onChange,
  id,
  name,
  placeholder = "Tulis dokumen di sini menggunakan Markdown...",
  rows = 14,
  className = "",
}: MarkdownEditorProps) {
  const [hasError, setHasError] = useState(false);
  const [useRawMode, setUseRawMode] = useState(false);

  const handleError = useCallback((err: { error: string; source: string }) => {
    console.warn("MarkdownEditor Parse Error:", err);
    setHasError(true);
  }, []);

  if (hasError || useRawMode) {
    return (
      <div className={`space-y-2 ${className}`}>
        {hasError && (
          <div className="p-3 text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-md">
            Konten ini berisi sintaks yang tidak didukung editor visual; diedit dalam mode Markdown.
          </div>
        )}
        <div className="flex items-center justify-between border-b pb-2">
          <span className="text-xs font-medium text-muted-foreground">Mode Markdown (Mentah)</span>
          {!hasError && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setUseRawMode(false)}
              className="text-xs h-7 px-2"
            >
              Beralih ke Editor Visual
            </Button>
          )}
        </div>
        <Textarea
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="font-mono text-sm leading-relaxed"
        />
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setUseRawMode(true)}
          className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
        >
          Mode Markdown
        </Button>
      </div>

      <DynamicMDXEditor
        markdown={value}
        onChange={onChange}
        placeholder={placeholder}
        onError={handleError}
      />
    </div>
  );
}
