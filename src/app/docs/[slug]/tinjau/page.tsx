import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, LockOpen } from "lucide-react";
import { DocumentStatus, ReviewStatus, Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import { getDocumentBySlug } from "@/lib/services/documents";
import { listReviewsForDocument, REVIEW_NOTE_MAX } from "@/lib/services/reviews";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ReviewCard } from "@/components/document/ReviewCard";
import { lockAction, submitPublishAction } from "./actions";

export const dynamic = "force-dynamic";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Approval and lock of one document (roadmap 12 and 36), for editors and admins: ask to publish, see the
 * requests and their answers, and for an admin approve, reject and lock. Never cached for offline.
 */
export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ galat?: string | string[]; diajukan?: string | string[]; disetujui?: string | string[] }>;
}) {
  const user = await requireRole([Role.EDITOR, Role.ADMIN]);
  const viewer = { id: user.id, role: user.role };
  const admin = user.role === Role.ADMIN;
  const { slug } = await params;
  const query = await searchParams;

  const doc = await getDocumentBySlug(slug, { includeDrafts: true, viewer });
  if (!doc) notFound();
  const reviews = await listReviewsForDocument(doc.id, viewer);
  const hasPending = reviews.some((r) => r.status === ReviewStatus.PENDING);
  const requiresApproval = doc.collection?.requiresApproval ?? false;
  const canAskPublish = !admin && requiresApproval && doc.status !== DocumentStatus.PUBLISHED && !doc.locked && !hasPending;
  const error = first(query.galat);
  const current = { title: doc.title, excerpt: doc.excerpt, type: doc.type, content: doc.content };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      <div className="space-y-2">
        <Link href={`/docs/${doc.slug}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {doc.title}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Persetujuan</h1>
        <p className="text-muted-foreground">
          {requiresApproval
            ? "Koleksi ini butuh persetujuan admin: dokumen baru terbit, atau dokumen yang terbit berubah, setelah admin menyetujui. Sampai saat itu dokumen yang tampil tidak berubah."
            : "Koleksi ini tidak butuh persetujuan. Admin tetap bisa mengunci dokumen agar hanya admin yang mengubahnya."}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {(first(query.diajukan) || first(query.disetujui)) && !error && (
        <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
          {first(query.disetujui) ? "Disetujui dan diterapkan." : "Permintaan terkirim ke admin."}
        </p>
      )}

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4" aria-label="Kunci dokumen">
        <p className="min-w-0 text-sm">
          {doc.locked ? (
            <>
              <Lock className="mr-1.5 inline size-4" />
              <span className="font-medium">Terkunci</span>: hanya admin yang boleh mengubah, menerbitkan, atau mengarsipkan dokumen ini.
            </>
          ) : (
            <>
              <LockOpen className="mr-1.5 inline size-4" />
              <span className="font-medium">Tidak dikunci.</span> Penyunting yang boleh membacanya boleh mengubahnya
              {requiresApproval ? " (dengan persetujuan bila terbit)" : ""}.
            </>
          )}
        </p>
        {admin && (
          <form action={lockAction.bind(null, doc.id, doc.slug)}>
            <input type="hidden" name="locked" value={doc.locked ? "0" : "1"} />
            <Button type="submit" size="sm" variant="outline">
              {doc.locked ? "Buka kunci" : "Kunci dokumen"}
            </Button>
          </form>
        )}
      </section>

      {canAskPublish && (
        <form action={submitPublishAction.bind(null, doc.id, doc.slug)} className="space-y-3 rounded-xl border border-border p-4">
          <Label htmlFor="note">Ajukan terbit</Label>
          <Textarea id="note" name="note" rows={3} maxLength={REVIEW_NOTE_MAX} placeholder="Catatan untuk admin (opsional): apa yang sudah diperiksa" />
          <Button type="submit">Ajukan ke admin</Button>
        </form>
      )}

      <section className="space-y-3" aria-label="Permintaan">
        <h2 className="text-lg font-semibold">Permintaan</h2>
        {reviews.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Belum ada permintaan untuk dokumen ini.</p>
        ) : (
          <ul className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} slug={doc.slug} isAdmin={admin} userId={user.id} current={current} from="document" />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
