import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import { getCollections, listAssignableUsers } from "@/lib/services/collections";
import { getDocumentBySlug } from "@/lib/services/documents";
import { listGroups } from "@/lib/services/groups";
import Link from "next/link";
import { getTemplate, listTemplates } from "@/lib/services/templates";
import { DocumentForm } from "@/components/document/DocumentForm";

export const dynamic = "force-dynamic";

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ collection?: string; title?: string; parent?: string; templat?: string | string[] }>;
}) {
  const user = await requireRole([Role.EDITOR, Role.ADMIN]);
  const viewer = { id: user.id, role: user.role };

  const { collection: collectionSlug, title: defaultTitle, parent: parentSlug, templat: templatParam } = await searchParams;
  const templateId = Array.isArray(templatParam) ? templatParam[0] : templatParam;
  const collections = await getCollections(viewer);
  // Only an admin may restrict a document, so only an admin's form carries the section.
  const [accessUsers, accessGroups] =
    user.role === Role.ADMIN ? await Promise.all([listAssignableUsers(viewer), listGroups(viewer)]) : [undefined, undefined];

  let defaultCollectionId: string | undefined;
  if (collectionSlug) {
    const matched = collections.find((c) => c.slug === collectionSlug);
    if (matched) {
      defaultCollectionId = matched.id;
    }
  }

  // "Tambah sub-halaman" on a page: its collection and the page itself come ready-filled.
  let initialParent: { id: string; title: string } | null = null;
  if (parentSlug) {
    const parent = await getDocumentBySlug(parentSlug, { includeDrafts: true, viewer });
    if (parent) {
      initialParent = { id: parent.id, title: parent.title };
      defaultCollectionId = parent.collectionId;
    }
  }

  // A saved template: its text and type fill the form; the list of the others is offered above it.
  const [templates, chosen] = await Promise.all([listTemplates(viewer), templateId ? getTemplate(templateId, viewer) : null]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dokumen Baru</h1>
        <p className="text-muted-foreground mt-1">
          Tulis pengetahuan atau panduan baru dalam format Markdown.
        </p>
      </div>

      {templates.length > 0 && (
        <section aria-label="Mulai dari templat" className="space-y-2">
          <h2 className="text-sm font-medium">Mulai dari templat</h2>
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link
                href={{ pathname: "/docs/new", query: { ...(collectionSlug ? { collection: collectionSlug } : {}), ...(parentSlug ? { parent: parentSlug } : {}), ...(defaultTitle ? { title: defaultTitle } : {}) } }}
                aria-current={!chosen ? "true" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${!chosen ? "bg-foreground text-background" : "hover:bg-muted"}`}
              >
                Kosong (bawaan)
              </Link>
            </li>
            {templates.map((template) => (
              <li key={template.id}>
                <Link
                  href={{ pathname: "/docs/new", query: { templat: template.id, ...(collectionSlug ? { collection: collectionSlug } : {}), ...(parentSlug ? { parent: parentSlug } : {}), ...(defaultTitle ? { title: defaultTitle } : {}) } }}
                  aria-current={chosen?.id === template.id ? "true" : undefined}
                  className={`inline-flex min-h-11 max-w-full items-center break-words rounded-full border px-3 text-sm ${chosen?.id === template.id ? "bg-foreground text-background" : "hover:bg-muted"}`}
                >
                  {template.name}
                </Link>
              </li>
            ))}
          </ul>
          {templateId && !chosen && <p role="status" className="text-xs text-destructive">Templat itu tidak ditemukan (mungkin sudah dihapus); formulir dimulai dari kerangka bawaan.</p>}
          {chosen && <p className="text-xs text-muted-foreground">Isi dan jenis diambil dari templat &ldquo;{chosen.name}&rdquo;; ubah sesuka Anda sebelum menyimpan.</p>}
        </section>
      )}

      <DocumentForm
        key={chosen?.id ?? "kosong"}
        defaultTemplate={chosen ? { id: chosen.id, type: chosen.type, content: chosen.content } : undefined}
        collections={collections}
        accessUsers={accessUsers}
        accessGroups={accessGroups}
        aiEnabled={user.role === Role.ADMIN}
        defaultCollectionId={defaultCollectionId}
        initialParent={initialParent}
        defaultTitle={defaultTitle?.slice(0, 150)}
      />
    </div>
  );
}
