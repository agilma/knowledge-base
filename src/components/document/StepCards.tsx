import { AlertTriangle } from "lucide-react";
import type { Callout, Step } from "./step-blocks";

/**
 * A short sequence as numbered cards, like the team's printed SOP sheets: one
 * column on a phone with an arrow between cards, a grid from tablet width up.
 */
export function StepCards({ steps }: { steps: Step[] }) {
  return (
    <ol role="list" className="not-prose my-6 grid list-none gap-2 p-0 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
      {steps.map((step, i) => (
        <li key={i} className="break-inside-avoid">
          <div className="flex gap-3 sm:h-full rounded-xl border-2 border-emerald-300 bg-emerald-50 p-3 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-50">
            <span
              aria-hidden="true"
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white"
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="font-semibold leading-snug">{step.title}</p>
              {step.description && (
                <p className="mt-0.5 text-sm leading-snug text-emerald-900/80 dark:text-emerald-100/80">{step.description}</p>
              )}
            </div>
          </div>
          {i < steps.length - 1 && (
            <div aria-hidden="true" className="flex justify-center pt-2 text-emerald-600 sm:hidden print:hidden">
              ↓
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

/** A red notice for the one thing a reader must not get wrong. */
export function CalloutBox({ callout }: { callout: Callout }) {
  return (
    <div
      role="note"
      className="not-prose my-6 flex gap-3 break-inside-avoid rounded-xl border-2 border-rose-300 bg-rose-50 p-4 text-rose-950 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-50"
    >
      <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white">
        <AlertTriangle className="size-4" />
      </span>
      <div className="min-w-0 space-y-1">
        <p className="font-semibold leading-snug">{callout.title}</p>
        {callout.body.map((line, i) => (
          <p key={i} className="text-sm leading-snug">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
