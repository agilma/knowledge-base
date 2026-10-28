import Link from "next/link";
import { ArrowLeft, PenLine, X } from "lucide-react";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import { buttonVariants, Button } from "@/components/ui/button";
import { searchDocuments } from "@/lib/services/documents";
import { listSearchMisses } from "@/lib/services/search-misses";
import { formatDate } from "@/lib/format";
import { dismissSearchMissAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SearchMissesPage() {
  const user = await requireRole([Role.EDITOR, Role.ADMIN]);
  const viewer = { id: user.id, role: user.role };
  const misses = await listSearchMisses({ limit: 50, sinceDays: 90 });

  // What readers could not find may already be written as a draft, which they cannot see.
  const matches = await Promise.all(
    misses.map(async (m) => {
      const found = await searchDocuments(m.query, { viewer, includeDrafts: true });
      return found.results[0] ?? null;
    }),
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <div className="space-y-2">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Beranda
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Topik yang belum ada</h1>
        <p className="text-muted-foreground">
          Pencarian yang tidak menemukan apa pun dalam 90 hari terakhir, yang paling sering dulu. Ini petunjuk apa yang dicari orang tetapi belum
          ditulis, atau ditulis dengan kata lain. Yang dicatat hanya kata yang diketik, tanpa siapa yang mencari.
        </p>
      </div>

      {misses.length === 0 ? (
        <div className="py-12 text-center border rounded-xl border-dashed border-border bg-muted/20">
          <p className="text-muted-foreground">Belum ada pencarian yang gagal. Bagus.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {misses.map((m, i) => {
            const match = matches[i];
            return (
              <li key={m.query} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium break-words">{m.query}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.count} kali · terakhir {formatDate(m.lastAt)}
                    {match && (
                      <>
                        {" "}
                        ·{" "}
                        <Link href={`/docs/${match.slug}`} className="text-amber-700 underline underline-offset-2 dark:text-amber-300">
                          sudah ada: {match.title}
                          {match.status !== "PUBLISHED" ? " (belum terbit)" : ""}
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={{ pathname: "/docs/new", query: { title: m.query } }}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                    aria-label={`Tulis dokumen tentang ${m.query}`}
                  >
                    <PenLine className="mr-1.5 h-3.5 w-3.5" />
                    Tulis
                  </Link>
                  <form action={dismissSearchMissAction}>
                    <input type="hidden" name="query" value={m.query} />
                    <Button type="submit" variant="ghost" size="sm" aria-label={`Abaikan ${m.query}`}>
                      <X className="mr-1 h-3.5 w-3.5" />
                      Abaikan
                    </Button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
