"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ListChecks, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FlowItem } from "@/lib/step-mode";

const CHANGED = "kb-steps-changed";

function read(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function write(key: string, value: string) {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // storage blocked or full: the ticks then last until the page is closed, which is still usable
  }
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGED, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGED, callback);
    window.removeEventListener("storage", callback);
  };
}

/**
 * The steps of a document one to a screen, in large type, for someone standing at a machine: what
 * to do now, a big button for "done, next", and a tick per step kept on this device (never sent
 * anywhere). The ticks belong to this version of the steps (`storageKey`), so editing the steps
 * starts a fresh run instead of pointing at the wrong ones.
 */
export function StepRunner({ items, storageKey, title, backHref }: { items: FlowItem[]; storageKey: string; title: string; backHref: string }) {
  // Ticked step positions, as "0,2,3". The server has nothing: the ticks appear once on the device.
  const stored = useSyncExternalStore(
    subscribe,
    () => read(storageKey),
    () => "",
  );
  const done = new Set(stored ? stored.split(",").map(Number) : []);
  const stepIndexes = items.flatMap((item, i) => (item.kind === "step" ? [i] : []));
  const total = stepIndexes.length;

  const firstOpen = items.findIndex((item, i) => item.kind === "step" && !done.has(i));
  const [picked, setPicked] = useState<number | null>(null);
  // Until the person moves, the screen is the first step not yet ticked; all ticked means the end.
  const index = picked ?? (firstOpen === -1 ? items.length : firstOpen);
  const [listOpen, setListOpen] = useState(false);

  const finished = index >= items.length;
  const current = finished ? null : items[index];
  const position = current?.kind === "step" ? stepIndexes.indexOf(index) + 1 : null;
  const doneCount = stepIndexes.filter((i) => done.has(i)).length;

  const setDone = (ticked: Set<number>) => write(storageKey, [...ticked].sort((a, b) => a - b).join(","));
  const go = (to: number) => setPicked(Math.max(0, Math.min(items.length, to)));

  const next = () => {
    if (current?.kind === "step") setDone(new Set(done).add(index));
    go(index + 1);
  };
  const toggle = (i: number) => {
    const copy = new Set(done);
    if (copy.has(i)) copy.delete(i);
    else copy.add(i);
    setDone(copy);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
      if (event.key === "ArrowLeft") go(index - 1);
      if (event.key === "ArrowRight") {
        const item = items[index];
        if (item?.kind === "step") setDone(new Set(done).add(index));
        go(index + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Keep the screen on while it is being followed; not every browser can, and none needs to.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const hold = () => {
      const wake = (navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock;
      wake?.request("screen").then((l) => (lock = l), () => undefined);
    };
    hold();
    const onVisible = () => document.visibilityState === "visible" && hold();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => undefined);
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-2xl flex-col px-5 pb-6 pt-4">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <X className="size-4" />
            Keluar
          </Link>
          <Button type="button" variant="outline" size="sm" onClick={() => setListOpen((open) => !open)} aria-expanded={listOpen}>
            <ListChecks className="mr-1.5 size-4" />
            Daftar langkah
          </Button>
        </div>
        <p className="truncate text-sm font-medium text-muted-foreground">{title}</p>
        <div
          role="progressbar"
          aria-label="Langkah selesai"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={doneCount}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }} />
        </div>
        <p className="text-sm text-muted-foreground">
          {doneCount} dari {total} langkah selesai
        </p>
      </header>

      {listOpen && (
        <ol className="mt-4 divide-y divide-border rounded-xl border border-border">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  go(i);
                  setListOpen(false);
                }}
                className={`flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left ${i === index ? "bg-accent" : ""}`}
              >
                {item.kind === "step" ? (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
                    {stepIndexes.indexOf(i) + 1}
                  </span>
                ) : (
                  <AlertTriangle className="size-5 shrink-0 text-rose-600" aria-label="Peringatan" />
                )}
                <span className="min-w-0 break-words">{item.title}</span>
              </button>
              {item.kind === "step" && (
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  aria-pressed={done.has(i)}
                  aria-label={`${done.has(i) ? "Batalkan selesai" : "Tandai selesai"}: ${item.title}`}
                  className={`mr-2 flex size-10 shrink-0 items-center justify-center rounded-md border ${done.has(i) ? "border-emerald-600 bg-emerald-600 text-white" : "border-border text-transparent"}`}
                >
                  <Check className="size-5" />
                </button>
              )}
            </li>
          ))}
        </ol>
      )}

      <main className="flex flex-1 flex-col justify-center py-8" aria-live="polite">
        {finished ? (
          <div className="space-y-4 text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Check className="size-9" />
            </span>
            <h1 className="text-3xl font-bold">Semua langkah selesai</h1>
            <p className="text-lg text-muted-foreground">{doneCount === total ? "Semua langkah sudah ditandai." : `${doneCount} dari ${total} langkah ditandai.`}</p>
          </div>
        ) : current?.kind === "callout" ? (
          <div role="note" className="space-y-3 rounded-2xl border-2 border-rose-300 bg-rose-50 p-6 text-rose-950 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-50">
            <AlertTriangle className="size-9 text-rose-600" aria-hidden="true" />
            <h1 className="break-words text-3xl font-bold leading-tight">{current.title}</h1>
            {current.body.map((line, i) => (
              <p key={i} className="break-words text-xl leading-snug">
                {line}
              </p>
            ))}
          </div>
        ) : current ? (
          <div className="space-y-4">
            {current.section && <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{current.section}</p>}
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-2xl font-bold text-white">{position}</span>
              <h1 className="break-words text-3xl font-bold leading-tight sm:text-4xl">{current.title}</h1>
            </div>
            {current.description && <p className="break-words text-xl leading-snug text-muted-foreground sm:text-2xl">{current.description}</p>}
            {done.has(index) && (
              <p className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <Check className="size-4" /> Sudah ditandai selesai
              </p>
            )}
          </div>
        ) : null}
      </main>

      <footer className="sticky bottom-0 space-y-3 bg-background pb-2 pt-3">
        {finished ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-14 text-base"
              onClick={() => {
                write(storageKey, "");
                setPicked(0);
              }}
            >
              <RotateCcw className="mr-2 size-5" />
              Mulai ulang
            </Button>
            <Link href={backHref} className="inline-flex h-14 items-center justify-center rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground">
              Kembali ke dokumen
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <Button type="button" variant="outline" size="lg" className="h-14 px-5" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Sebelumnya">
              <ArrowLeft className="size-5" />
            </Button>
            <Button type="button" size="lg" className="h-14 text-lg" onClick={next}>
              {current?.kind === "callout" ? "Mengerti, lanjut" : index === items.length - 1 || stepIndexes[stepIndexes.length - 1] === index ? "Selesai" : "Selesai, lanjut"}
              <ArrowRight className="ml-2 size-5" />
            </Button>
          </div>
        )}
      </footer>
    </div>
  );
}
