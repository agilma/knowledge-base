import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { getDocumentBySlug } from "@/lib/services/documents";
import { listThreads } from "@/lib/services/comments";
import { COMMENT_MAX } from "@/lib/comment-text";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackThread } from "@/components/document/FeedbackThread";
import { sendFeedbackAction } from "./actions";

export const dynamic = "force-dynamic";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Notes on one document: any reader may send one ("Ada yang kurang jelas?") and sees their own with
 * the replies; editors and admins see everyone's and can answer and mark them done. Never cached
 * for offline (see sw-routes.ts): it holds what people wrote.
 */
export default async function FeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ galat?: string | string[]; terkirim?: string | string[] }>;
}) {
  const user = await requireUser();
  const viewer = { id: user.id, role: user.role };
  const staff = user.role === Role.EDITOR || user.role === Role.ADMIN;
  const { slug } = await params;
  const query = await searchParams;

  const doc = await getDocumentBySlug(slug, { includeDrafts: staff, viewer });
  if (!doc) notFound();
  const threads = await listThreads(doc.id, viewer);
  const open = threads.filter((t) => !t.resolved).length;
  const error = first(query.galat);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      <div className="space-y-2">
        <Link href={`/docs/${doc.slug}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {doc.title}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">{staff ? "Masukan pembaca" : "Ada yang kurang jelas?"}</h1>
        <p className="text-muted-foreground">
          {staff
            ? `${open} masukan terbuka pada dokumen ini. Balas atau tandai selesai setelah diperbaiki.`
            : "Tulis bagian yang kurang jelas, salah, atau sudah berubah. Masukan Anda dibaca penyunting dokumen ini; orang lain tidak melihatnya."}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {first(query.terkirim) === "1" && !error && (
        <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
          Terima kasih, masukan Anda sudah terkirim.
        </p>
      )}

      <form action={sendFeedbackAction.bind(null, doc.id, doc.slug)} className="space-y-3">
        <Label htmlFor="body">Masukan Anda</Label>
        <Textarea id="body" name="body" required minLength={3} maxLength={COMMENT_MAX} rows={4} placeholder="Misalnya: langkah 3 tidak menyebut menu mana yang dibuka" />
        <p className="text-xs text-muted-foreground">Sampai {COMMENT_MAX} karakter. Jangan menulis kata sandi atau data pelanggan.</p>
        <Button type="submit">Kirim masukan</Button>
      </form>

      {threads.length > 0 && (
        <section className="space-y-3" aria-label={staff ? "Semua masukan" : "Masukan Anda"}>
          <h2 className="text-lg font-semibold">{staff ? "Semua masukan" : "Masukan Anda"}</h2>
          <ul className="space-y-4">
            {threads.map((thread) => (
              <FeedbackThread key={thread.id} thread={thread} slug={doc.slug} staff={staff} from="document" />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
