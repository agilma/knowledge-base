import Link from "next/link";
import { WifiOff, Home, ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-6">
        <WifiOff className="h-8 w-8" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-2">
        Halaman Belum Tersimpan
      </h1>

      <p className="max-w-md text-sm text-muted-foreground mb-8">
        Anda sedang tidak terhubung ke internet dan halaman ini belum pernah Anda buka sebelumnya.
        Silakan buka kembali halaman yang pernah Anda kunjungi saat online, atau hubungkan kembali koneksi internet Anda.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          <Home className="mr-2 h-4 w-4" />
          Beranda
        </Link>
        <Link href="/collections" className={buttonVariants({ variant: "ghost" })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Lihat Koleksi Tersimpan
        </Link>
      </div>
    </div>
  );
}
