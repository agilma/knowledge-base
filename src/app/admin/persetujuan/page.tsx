import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import { listInbox } from "@/lib/services/reviews";
import { ReviewCard } from "@/components/document/ReviewCard";
import { getDocumentBySlug } from "@/lib/services/documents";

export const dynamic = "force-dynamic";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Requests waiting for an admin (and, for an editor, their own with the answers): roadmap 12. */
export default async function ApprovalInboxPage({ searchParams }: { searchParams: Promise<{ galat?: string | string[] }> }) {
  const user = await requireRole([Role.EDITOR, Role.ADMIN]);
  const viewer = { id: user.id, role: user.role };
  const admin = user.role === Role.ADMIN;
  const query = await searchParams;
  const { pending, decided } = await listInbox(viewer);
  const error = first(query.galat);

  // the live text of each document with a change waiting, for the comparison
  const live = new Map<string, { title: string; excerpt: string | null; type: string; content: string }>();
  for (const item of pending.filter((r) => r.proposal)) {
    const doc = await getDocumentBySlug(item.document.slug, { includeDrafts: true, viewer });
    if (doc) live.set(item.id, { title: doc.title, excerpt: doc.excerpt, type: doc.type, content: doc.content });
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <div className="space-y-2">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Beranda
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Persetujuan</h1>
        <p className="text-muted-foreground">
          {admin ? "Permintaan terbit dan perubahan dokumen yang menunggu keputusan Anda." : "Permintaan Anda dan jawaban admin."}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <section className="space-y-3" aria-label="Menunggu">
        <h2 className="text-lg font-semibold">Menunggu ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Tidak ada yang menunggu.</p>
        ) : (
          <ul className="space-y-5">
            {pending.map((review) => (
              <li key={review.id} className="space-y-2">
                <Link href={`/docs/${review.document.slug}`} className="block break-words text-sm font-medium underline underline-offset-2">
                  {review.document.title}
                </Link>
                <ul>
                  <ReviewCard review={review} slug={review.document.slug} isAdmin={admin} userId={user.id} current={live.get(review.id)} from="inbox" />
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      {decided.length > 0 && (
        <section className="space-y-3" aria-label="Sudah diputuskan">
          <h2 className="text-lg font-semibold">Terbaru diputuskan</h2>
          <ul className="space-y-5">
            {decided.map((review) => (
              <li key={review.id} className="space-y-2">
                <Link href={`/docs/${review.document.slug}`} className="block break-words text-sm font-medium underline underline-offset-2">
                  {review.document.title}
                </Link>
                <ul>
                  <ReviewCard review={review} slug={review.document.slug} isAdmin={admin} userId={user.id} from="inbox" />
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
