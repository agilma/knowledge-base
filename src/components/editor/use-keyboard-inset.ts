import { useSyncExternalStore } from "react";

// On Android the on-screen keyboard shrinks the visual viewport but not the
// layout viewport, so a bar pinned to the bottom ends up behind the keys.
function subscribe(onChange: () => void): () => void {
  const vv = window.visualViewport;
  if (!vv) return () => {};
  vv.addEventListener("resize", onChange);
  vv.addEventListener("scroll", onChange);
  return () => {
    vv.removeEventListener("resize", onChange);
    vv.removeEventListener("scroll", onChange);
  };
}

function snapshot(): number {
  const vv = window.visualViewport;
  if (!vv) return 0;
  // Small differences are browser chrome, not a keyboard.
  const covered = window.innerHeight - vv.height - vv.offsetTop;
  return covered > 120 ? Math.round(covered) : 0;
}

/** Pixels at the bottom of the layout viewport covered by the keyboard. */
export function useKeyboardInset(): number {
  return useSyncExternalStore(subscribe, snapshot, () => 0);
}
