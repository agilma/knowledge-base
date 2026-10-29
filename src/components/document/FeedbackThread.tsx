import { Check, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { COMMENT_MAX } from "@/lib/comment-text";
import { ConfirmForm } from "@/app/admin/sampah/ConfirmForm";
import { deleteCommentAction, replyAction, resolveAction } from "@/app/docs/[slug]/masukan/actions";
import type { CommentItem, ThreadItem } from "@/lib/services/comments";

function Who({ item }: { item: CommentItem }) {
  const label = item.mine ? "Anda" : item.staff ? "Penyunting" : (item.authorName ?? "Pembaca");
  return (
    <span className="text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{label}</span>
      {item.staff && !item.mine && item.authorName ? ` (${item.authorName})` : ""} · {formatDate(item.createdAt)}
    </span>
  );
}

/**
 * One note with its replies, a reply box, and for editors the "selesai" switch. Plain forms to server
 * actions (no script needed); `from` says which page to return to. The text is shown as text, with
 * its line breaks, never as Markdown or HTML.
 */
export function FeedbackThread({ thread, slug, staff, from }: { thread: ThreadItem; slug: string; staff: boolean; from: "document" | "inbox" }) {
  const items = [thread, ...thread.replies];
  return (
    <li className={`rounded-xl border p-4 space-y-3 ${thread.resolved ? "border-border bg-muted/30" : "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20"}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2 py-0.5 font-medium ${thread.resolved ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-100"}`}>
          {thread.resolved ? "Selesai" : "Terbuka"}
        </span>
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <Who item={item} />
              {(staff || item.mine) && (
                <ConfirmForm
                  action={deleteCommentAction.bind(null, slug)}
                  message={item.id === thread.id ? "Hapus masukan ini beserta balasannya?" : "Hapus balasan ini?"}
                >
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="from" value={from} />
                  <button type="submit" aria-label="Hapus" className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
                    <Trash2 className="size-4" />
                  </button>
                </ConfirmForm>
              )}
            </div>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{item.body}</p>
          </li>
        ))}
      </ul>

      <form action={replyAction.bind(null, slug)} className="space-y-2">
        <input type="hidden" name="rootId" value={thread.id} />
        <input type="hidden" name="from" value={from} />
        <Textarea name="body" required minLength={3} maxLength={COMMENT_MAX} rows={2} placeholder="Tulis balasan" aria-label="Balasan" />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm" variant="outline">
            Balas
          </Button>
        </div>
      </form>
      {staff && (
        <form action={resolveAction.bind(null, slug)}>
          <input type="hidden" name="rootId" value={thread.id} />
          <input type="hidden" name="from" value={from} />
          <input type="hidden" name="resolved" value={thread.resolved ? "0" : "1"} />
          <Button type="submit" size="sm" variant={thread.resolved ? "ghost" : "default"}>
            {thread.resolved ? (
              <>
                <RotateCcw className="mr-1.5 size-4" />
                Buka lagi
              </>
            ) : (
              <>
                <Check className="mr-1.5 size-4" />
                Tandai selesai
              </>
            )}
          </Button>
        </form>
      )}
    </li>
  );
}
