"use client";

import "./globals.css";

/**
 * Replaces the root layout when the layout itself throws — for instance when
 * the session lookup in `layout.tsx` cannot reach the database. `error.tsx`
 * sits below the layout and never sees that failure. This file has to bring
 * its own <html> and <body>, and can only use what it imports itself.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="id">
      <body className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center text-foreground">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">
          Aplikasi Gagal Dimuat
        </h1>
        <p className="mb-2 max-w-md text-sm text-muted-foreground">
          Terjadi masalah di server, kemungkinan sementara. Coba muat ulang;
          kalau tetap gagal, hubungi administrator.
        </p>
        {error.digest && (
          <p className="mb-6 text-xs text-muted-foreground">
            Kode: <code>{error.digest}</code>
          </p>
        )}
        <button
          type="button"
          onClick={() => retry()}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Coba Lagi
        </button>
      </body>
    </html>
  );
}
