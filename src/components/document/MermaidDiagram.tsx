"use client";

import { useEffect, useId, useState } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { unsafeDiagramReason } from "./mermaid-safety";
import { MERMAID_CONFIG, naturalWidth, withDefaultClasses } from "./mermaid-style";

type State = { svg: string } | { error: string } | null;

// mermaid keeps global state while it renders, so diagrams are drawn one at a time.
let queue: Promise<unknown> = Promise.resolve();

async function renderDiagram(id: string, chart: string): Promise<string> {
  const unsafe = unsafeDiagramReason(chart);
  if (unsafe) throw new Error(unsafe);
  const task = queue.then(async () => {
    // Loaded on first use: most documents have no diagram and should not pay for the library.
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize(MERMAID_CONFIG);
    return (await mermaid.render(id, withDefaultClasses(chart))).svg;
  });
  queue = task.catch(() => undefined);
  return task;
}

const ZOOM_STEPS = [0.5, 0.75, 1, 1.5, 2, 3];

/** The diagram at its natural size (times `zoom`), scrollable, for reading small text on a phone. */
function DiagramViewer({ svg, open, onOpenChange }: { svg: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [zoom, setZoom] = useState(1);
  const width = naturalWidth(svg);
  const step = (dir: 1 | -1) =>
    setZoom((z) => {
      const i = ZOOM_STEPS.indexOf(z);
      return ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, i + dir))];
    });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] w-[95vw] max-w-[95vw] flex-col gap-3 p-3 sm:max-w-[95vw]">
        <div className="flex items-center gap-2 pr-10">
          <DialogTitle className="mr-auto text-sm">Diagram alur</DialogTitle>
          <Button type="button" variant="outline" size="icon-sm" aria-label="Perkecil" onClick={() => step(-1)} disabled={zoom === ZOOM_STEPS[0]}>
            <Minus className="size-4" />
          </Button>
          <span className="w-10 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
          <Button type="button" variant="outline" size="icon-sm" aria-label="Perbesar" onClick={() => step(1)} disabled={zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1]}>
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-white p-4">
          <div
            className="mx-auto [&_svg]:!h-auto [&_svg]:!w-full [&_svg]:!max-w-none"
            style={{ width: width ? width * zoom : `${zoom * 100}%` }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A ```mermaid block drawn as a diagram. The source stays visible while it
 * loads and when it cannot be drawn (bad syntax, or offline before the library
 * was ever fetched), so the content is never lost. The card is always white:
 * the diagram draws dark text, which is unreadable on a dark page.
 */
export function MermaidDiagram({ chart }: { chart: string }) {
  const id = "mmd" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const [state, setState] = useState<State>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    renderDiagram(id, chart).then(
      (svg) => !cancelled && setState({ svg }),
      (err) =>
        !cancelled &&
        setState({
          error: `Diagram tidak bisa ditampilkan. Periksa penulisan diagramnya${
            unsafeDiagramReason(chart) ? ` (${err instanceof Error ? err.message : "ditolak"})` : ""
          }.`,
        }),
    );
    return () => {
      cancelled = true;
    };
  }, [id, chart]);

  if (state && "svg" in state) {
    return (
      <div className="not-prose relative my-6 break-inside-avoid">
        <div
          role="img"
          aria-label="Diagram alur"
          className="overflow-x-auto rounded-xl border border-border bg-white p-4 shadow-sm [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: state.svg }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="absolute right-2 top-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-300 dark:bg-white dark:text-slate-700 dark:hover:bg-slate-50 print:hidden"
          onClick={() => setViewerOpen(true)}
        >
          <Maximize2 className="mr-1.5 size-3.5" />
          Perbesar
        </Button>
        <DiagramViewer svg={state.svg} open={viewerOpen} onOpenChange={setViewerOpen} />
      </div>
    );
  }

  return (
    <div className="my-6">
      {state && "error" in state && (
        <p role="alert" className="mb-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">{chart}</pre>
    </div>
  );
}
