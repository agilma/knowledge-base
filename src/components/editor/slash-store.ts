import type { SlashHandlers, SlashState } from "./slash-extension";

export interface SlashSnapshot {
  state: SlashState | null;
  selected: number;
}

/**
 * Where the open slash menu lives. The editor calls into it from outside
 * React, and the menu subscribes to it.
 */
export function createSlashStore() {
  let snapshot: SlashSnapshot = { state: null, selected: 0 };
  const listeners = new Set<() => void>();

  const set = (next: SlashSnapshot) => {
    snapshot = next;
    for (const l of listeners) l();
  };

  const handlers: SlashHandlers = {
    onUpdate: (state) => set({ state, selected: 0 }),
    onKeyDown: (event) => {
      const { state, selected } = snapshot;
      if (!state || state.items.length === 0) return false;
      const count = state.items.length;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const step = event.key === "ArrowDown" ? 1 : -1;
        set({ state, selected: (selected + step + count) % count });
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        state.command(state.items[selected]);
        return true;
      }
      if (event.key === "Escape") {
        set({ state: null, selected: 0 });
        return true;
      }
      return false;
    },
  };

  return {
    handlers,
    getSnapshot: () => snapshot,
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}
