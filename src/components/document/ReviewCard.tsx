import { ReviewKind, ReviewStatus } from "@prisma/client";
import { Check, X, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RevisionDiff } from "@/components/document/RevisionDiff";
import { formatDate } from "@/lib/format";
import { REVIEW_NOTE_MAX } from "@/lib/services/reviews";
import type { ReviewItem } from "@/lib/services/reviews";
import { approveAction, rejectAction, withdrawAction } from "@/app/docs/[slug]/tinjau/actions";

const STATUS_LABEL: Record<ReviewStatus, string> = { PENDING: "Menunggu", APPROVED: "Disetujui", REJECTED: "Ditolak", WITHDRAWN: "Ditarik" };
const STATUS_CLASS: Record<ReviewStatus, string> = {
  PENDING: "bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-100",
  APPROVED: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  REJECTED: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
  WITHDRAWN: "bg-muted text-muted-foreground",
};

/**
 * One request: who asked, what for, the note, for a change the difference with the live text, and the
 * buttons that fit who is looking (the admin decides; the one who asked can take it back). Plain forms
 * to server actions. All text is shown as text.
 */
export function ReviewCard({
  review,
  slug,
  isAdmin,
  userId,
  current,
  from,
}: {
  review: ReviewItem;
  slug: string;
  isAdmin: boolean;
  userId: string;
  /** The live text, for the comparison of a change. */
  current?: { title: string; excerpt: string | null; type: string; content: string };
  from: "document" | "inbox";
}) {
  const pending = review.status === ReviewStatus.PENDING;
  const mine = review.requestedById === userId;
  return (
    <li className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_CLASS[review.status]}`}>{STATUS_LABEL[review.status]}</span>
        <span className="font-medium">{review.kind === ReviewKind.PUBLISH ? "Ajukan terbit" : "Ajukan perubahan"}</span>
        <span className="text-muted-foreground">
          {review.requestedByName ?? "Pengaju"} · {formatDate(review.createdAt)}
        </span>
      </div>
      {review.note && <p className="whitespace-pre-wrap break-words text-sm">{review.note}</p>}

      {review.kind === ReviewKind.CHANGE && review.proposal && current && (
        <details open={pending} className="rounded-lg border border-border">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Perubahan yang diajukan</summary>
          <div className="p-3">
            <RevisionDiff before={current} after={{ title: review.proposal.title, excerpt: review.proposal.excerpt, type: review.proposal.type, content: review.proposal.content }} />
          </div>
        </details>
      )}

      {!pending && (
        <p className="text-sm text-muted-foreground">
          {STATUS_LABEL[review.status]} oleh {review.decidedByName ?? "admin"}
          {review.decidedAt ? ` · ${formatDate(review.decidedAt)}` : ""}
          {review.decisionNote ? <span className="mt-1 block whitespace-pre-wrap break-words text-foreground">&ldquo;{review.decisionNote}&rdquo;</span> : null}
        </p>
      )}

      {pending && isAdmin && (
        <div className="space-y-2">
          <form action={approveAction.bind(null, slug)} className="space-y-2">
            <input type="hidden" name="reviewId" value={review.id} />
            <input type="hidden" name="from" value={from} />
            <label htmlFor={`note-${review.id}`} className="sr-only">
              Catatan (untuk menyetujui atau menolak)
            </label>
            <Textarea id={`note-${review.id}`} name="note" rows={2} maxLength={REVIEW_NOTE_MAX} placeholder="Catatan untuk pengaju (wajib bila menolak)" />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm">
                <Check className="mr-1.5 size-4" />
                {review.kind === ReviewKind.PUBLISH ? "Setujui dan terbitkan" : "Setujui dan terapkan"}
              </Button>
              <Button type="submit" size="sm" variant="outline" formAction={rejectAction.bind(null, slug)}>
                <X className="mr-1.5 size-4" />
                Tolak
              </Button>
            </div>
          </form>
        </div>
      )}
      {pending && (mine || isAdmin) && (
        <form action={withdrawAction.bind(null, slug)}>
          <input type="hidden" name="reviewId" value={review.id} />
          <input type="hidden" name="from" value={from} />
          <Button type="submit" size="sm" variant="ghost">
            <Undo2 className="mr-1.5 size-4" />
            Tarik permintaan
          </Button>
        </form>
      )}
    </li>
  );
}
