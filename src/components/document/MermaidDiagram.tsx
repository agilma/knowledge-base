"use client";

import { useEffect, useId, useState } from "react";

type State = { svg: string } | { error: string } | null;

// mermaid keeps global state while it renders, so diagrams are drawn one at a time.
let queue: Promise<unknown> = Promise.resolve();

async function renderDiagram(id: string, chart: string): Promise<string> {
  const task = queue.then(async () => {
    // Loaded on first use: most documents have no diagram and should not pay for the library.
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize({
      startOnLoad: false,
      // Document text is data, not markup: no HTML in labels, no click handlers.
      securityLevel: "strict",
      suppressErrorRendering: true,
      theme: "default",
    });
    return (await mermaid.render(id, chart)).svg;
  });
  queue = task.catch(() => undefined);
  return task;
}

/**
 * A ```mermaid block drawn as a diagram. The source stays visible while it
 * loads and when it cannot be drawn (bad syntax, or offline before the library
 * was ever fetched), so the content is never lost. The card is always white:
 * the default theme draws dark text, which is unreadable on a dark page.
 */
export function MermaidDiagram({ chart }: { chart: string }) {
  const id = "mmd" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const [state, setState] = useState<State>(null);

  useEffect(() => {
    let cancelled = false;
    renderDiagram(id, chart).then(
      (svg) => !cancelled && setState({ svg }),
      () => !cancelled && setState({ error: "Diagram tidak bisa ditampilkan. Periksa penulisan diagramnya." }),
    );
    return () => {
      cancelled = true;
    };
  }, [id, chart]);

  if (state && "svg" in state) {
    return (
      <div
        role="img"
        aria-label="Diagram alur"
        className="not-prose my-6 overflow-x-auto rounded-lg border border-border bg-white p-4 break-inside-avoid [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: state.svg }}
      />
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
