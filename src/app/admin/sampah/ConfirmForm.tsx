"use client";

import type { ReactNode } from "react";

/** A form that asks first: "Hapus permanen" has no way back and sits next to "Pulihkan" on a touch screen. */
export function ConfirmForm({ action, message, children }: { action: (formData: FormData) => void | Promise<void>; message: string; children: ReactNode }) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
