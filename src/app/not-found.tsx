import Link from "next/link";
import { FileQuestion, Home, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-6">
        <FileQuestion className="h-8 w-8" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-2">
        Halaman Tidak Ditemukan
      </h1>

      <p className="max-w-md text-sm text-muted-foreground mb-8">
        Dokumen atau koleksi ini tidak ada, sudah dipindahkan, atau belum
        diterbitkan. Coba cari berdasarkan kata kuncinya.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/search" className={buttonVariants({ variant: "outline" })}>
          <Search className="mr-2 h-4 w-4" />
          Cari
        </Link>
        <Link href="/" className={buttonVariants({ variant: "ghost" })}>
          <Home className="mr-2 h-4 w-4" />
          Beranda
        </Link>
      </div>
    </div>
  );
}
