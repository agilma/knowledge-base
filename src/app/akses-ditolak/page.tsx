import Link from "next/link";
import { ShieldAlert, Home } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-6">
        <ShieldAlert className="h-8 w-8" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-2">
        Akses Ditolak
      </h1>

      <p className="max-w-md text-sm text-muted-foreground mb-8">
        Akun Anda hanya bisa membaca. Untuk menulis atau mengubah dokumen,
        minta administrator menaikkan peran Anda menjadi Editor.
      </p>

      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        <Home className="mr-2 h-4 w-4" />
        Beranda
      </Link>
    </div>
  );
}
