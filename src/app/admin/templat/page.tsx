import Link from "next/link";
import { ArrowLeft, FilePlus2, Trash2 } from "lucide-react";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmForm } from "@/app/admin/sampah/ConfirmForm";
import { formatDate } from "@/lib/format";
import { listTemplates, TEMPLATE_NAME_MAX, TEMPLATE_NAME_MIN } from "@/lib/services/templates";
import { deleteTemplateAction, renameTemplateAction } from "./actions";

export const dynamic = "force-dynamic";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Documents kept as starting points for new ones (roadmap 28), for editors and admins. */
export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ galat?: string | string[]; dibuat?: string | string[] }> }) {
  const user = await requireRole([Role.EDITOR, Role.ADMIN]);
  const query = await searchParams;
  const viewer = { id: user.id, role: user.role };
  const templates = await listTemplates(viewer);
  const error = first(query.galat);
  const created = first(query.dibuat);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <div className="space-y-2">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Beranda
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Templat</h1>
        <p className="text-muted-foreground">
          Dokumen yang disimpan sebagai titik awal untuk dokumen baru, lengkap dengan langkah bergambar, peringatan, dan bagian &ldquo;Perlu dikonfirmasi&rdquo;.
          Buat dari halaman dokumen dengan <strong>Jadikan templat</strong>; pakai lewat <strong>Dokumen Baru</strong>.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {created && !error && (
        <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
          Templat &ldquo;{created}&rdquo; tersimpan.
        </p>
      )}

      {templates.length === 0 ? (
        <div className="py-12 text-center border rounded-xl border-dashed border-border bg-muted/20 space-y-1">
          <p className="text-muted-foreground">Belum ada templat.</p>
          <p className="text-sm text-muted-foreground">Buka dokumen yang sudah bagus, lalu tekan Jadikan templat.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {templates.map((template) => {
            const mine = user.role === Role.ADMIN || template.createdById === user.id;
            return (
              <li key={template.id} className="space-y-3 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium break-words">{template.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {template.type.charAt(0) + template.type.slice(1).toLowerCase()} · {template.size.toLocaleString("id-ID")} karakter · {formatDate(template.createdAt)}
                      {template.createdByName ? ` · ${template.createdByName}` : ""}
                    </p>
                    {template.source === "restricted" ? (
                      <p className="mt-1 text-xs font-medium text-amber-800 dark:text-amber-300">
                        Dokumen sumbernya kini dibatasi, tetapi templat ini masih terbaca semua penyunting. Hapus bila isinya tidak boleh dibagikan.
                      </p>
                    ) : template.source ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Dari dokumen{" "}
                        <Link href={`/docs/${template.source.slug}`} className="underline underline-offset-2">
                          {template.source.title}
                        </Link>
                      </p>
                    ) : null}
                  </div>
                  <Link href={{ pathname: "/docs/new", query: { templat: template.id } }} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <FilePlus2 className="mr-1.5 h-4 w-4" />
                    Pakai
                  </Link>
                </div>
                {mine && (
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={renameTemplateAction.bind(null, template.id)} className="flex min-w-0 flex-1 items-center gap-2">
                      <Input name="name" defaultValue={template.name} required minLength={TEMPLATE_NAME_MIN} maxLength={TEMPLATE_NAME_MAX} aria-label={`Nama templat ${template.name}`} className="min-w-0" />
                      <Button type="submit" variant="outline" size="sm">
                        Ganti nama
                      </Button>
                    </form>
                    <ConfirmForm action={deleteTemplateAction.bind(null, template.id)} message={`Hapus templat "${template.name}"? Dokumen yang dibuat darinya tidak terpengaruh.`}>
                      <Button type="submit" variant="ghost" size="sm" className="text-destructive" aria-label={`Hapus templat ${template.name}`}>
                        <Trash2 className="mr-1 h-4 w-4" />
                        Hapus
                      </Button>
                    </ConfirmForm>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
