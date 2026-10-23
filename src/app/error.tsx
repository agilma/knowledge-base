"use client";

import Link from "next/link";
import { TriangleAlert, RotateCw, Home } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useOnlineStatus } from "@/lib/use-online-status";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const online = useOnlineStatus();

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-6">
        <TriangleAlert className="h-8 w-8" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-2">
        Halaman Gagal Dimuat
      </h1>

      <p className="max-w-md text-sm text-muted-foreground mb-2">
        {online
          ? "Terjadi masalah saat mengambil data. Coba muat ulang; kalau tetap gagal, hubungi administrator."
          : "Anda sedang tidak terhubung ke internet. Hubungkan kembali koneksi Anda, lalu coba lagi."}
      </p>

      {error.digest && (
        <p className="text-xs text-muted-foreground mb-8">
          Kode: <code>{error.digest}</code>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <Button onClick={reset}>
          <RotateCw className="mr-2 h-4 w-4" />
          Coba Lagi
        </Button>
        <Link href="/" className={buttonVariants({ variant: "ghost" })}>
          <Home className="mr-2 h-4 w-4" />
          Beranda
        </Link>
      </div>
    </div>
  );
}
