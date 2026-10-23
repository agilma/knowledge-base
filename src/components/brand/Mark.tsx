import { cn } from "cn";

/**
 * The product mark: a bound spine with entries beside it.
 *
 * Drawn in `currentColor` and in one colour only, so it sits correctly in the
 * sidebar, on the login screen and in either theme without a second asset.
 * `src/app/icon.svg` and the PNGs under `public/icons/` carry the same
 * geometry — change one and change the others.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="currentColor"
      aria-hidden="true"
      className={cn("h-6 w-6", className)}
    >
      <rect x="8" y="8" width="11" height="48" rx="5.5" />
      <rect x="25" y="13" width="31" height="9" rx="4.5" />
      <rect x="25" y="27.5" width="31" height="9" rx="4.5" />
      <rect x="25" y="42" width="20" height="9" rx="4.5" />
    </svg>
  );
}
