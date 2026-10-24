"use client";

import { useCallback, useSyncExternalStore } from "react";
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

const DynamicRichTextEditor = dynamic(
  () => import("@/components/editor/RichTextEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[280px] p-4 border rounded-lg bg-card animate-pulse flex items-center justify-center text-sm text-muted-foreground">
        Memuat editor visual...
      </div>
    ),
  }
);

const EDITOR_MODE_KEY = "kb:editor-mode";

type EditorMode = "raw" | "visual";

// Authors who prefer Markdown had to reach for the toggle on every document.
// The preference lives outside React, so it is read through an external store
// rather than an effect, and falls back to the visual editor wherever storage
// is unavailable (private window, blocked site data).
const modeListeners = new Set<() => void>();
let cachedMode: EditorMode | null = null;

function readEditorMode(): EditorMode {
  if (cachedMode === null) {
    try {
      cachedMode = localStorage.getItem(EDITOR_MODE_KEY) === "raw" ? "raw" : "visual";
    } catch {
      cachedMode = "visual";
    }
  }
  return cachedMode;
}

function subscribeEditorMode(onChange: () => void): () => void {
  modeListeners.add(onChange);
  return () => {
    modeListeners.delete(onChange);
  };
}

function writeEditorMode(mode: EditorMode): void {
  cachedMode = mode;
  try {
    localStorage.setItem(EDITOR_MODE_KEY, mode);
  } catch {
    // the preference simply will not persist
  }
  for (const listener of modeListeners) listener();
}

export function MarkdownEditor({
  value,
  onChange,
  id,
  name,
  placeholder = "Tulis dokumen di sini menggunakan Markdown...",
  rows = 14,
  className = "",
}: MarkdownEditorProps) {
  const mode = useSyncExternalStore(
    subscribeEditorMode,
    readEditorMode,
    () => "visual" as EditorMode
  );
  const useRawMode = mode === "raw";

  const chooseMode = useCallback((raw: boolean) => {
    writeEditorMode(raw ? "raw" : "visual");
  }, []);

  if (useRawMode) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between border-b pb-2">
          <span className="text-xs font-medium text-muted-foreground">Mode Markdown (Mentah)</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => chooseMode(false)}
            className="text-xs h-7 px-2"
          >
            Beralih ke Editor Visual
          </Button>
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
          onClick={() => chooseMode(true)}
          className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
        >
          Mode Markdown
        </Button>
      </div>

      <DynamicRichTextEditor markdown={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}
