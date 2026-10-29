import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import { listInbox } from "@/lib/services/comments";
import { FeedbackThread } from "@/components/document/FeedbackThread";

export const dynamic = "force-dynamic";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** What readers wrote on documents, across all of them, for editors and admins (roadmap 9). */
export default async function InboxPage({ searchParams }: { searchParams: Promise<{ status?: string | string[]; galat?: string | string[] }> }) {
  const user = await requireRole([Role.EDITOR, Role.ADMIN]);
  const query = await searchParams;
  const state = first(query.status) === "selesai" ? "resolved" : "open";
  const items = await listInbox({ id: user.id, role: user.role }, state);
  const error = first(query.galat);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <div className="space-y-2">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Beranda
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Masukan pembaca</h1>
        <p className="text-muted-foreground">Catatan dari pembaca tentang bagian dokumen yang kurang jelas, salah, atau sudah berubah. Hanya penyunting dan admin yang melihatnya.</p>
      </div>

      <nav className="flex gap-2 text-sm" aria-label="Status">
        <Link href="/admin/masukan" className={`rounded-full border px-3 py-1.5 ${state === "open" ? "bg-foreground text-background" : "hover:bg-muted"}`}>
          Terbuka
        </Link>
        <Link href="/admin/masukan?status=selesai" className={`rounded-full border px-3 py-1.5 ${state === "resolved" ? "bg-foreground text-background" : "hover:bg-muted"}`}>
          Selesai
        </Link>
      </nav>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <div className="py-12 text-center border rounded-xl border-dashed border-border bg-muted/20">
          <p className="text-muted-foreground">{state === "open" ? "Tidak ada masukan yang menunggu. Bagus." : "Belum ada masukan yang selesai."}</p>
        </div>
      ) : (
        <ul className="space-y-5">
          {items.map((item) => (
            <li key={item.id} className="space-y-2">
              <Link href={`/docs/${item.document.slug}`} className="block text-sm font-medium underline underline-offset-2 break-words">
                {item.document.title}
              </Link>
              <ul>
                <FeedbackThread thread={item} slug={item.document.slug} staff from="inbox" />
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
