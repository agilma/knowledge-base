import { Prisma, Role } from "@prisma/client";
import { db } from "../db";
import { hasMeaningfulChange, sizeChanges, statusChangeLabel } from "../revisions";
import { updateDocument } from "./documents";
import { documentReadableSql, documentReadableWhere, type Viewer } from "../collection-access";

export interface RevisionListItem {
  version: number;
  title: string;
  createdAt: Date;
  editorName: string | null;
  /** Characters added (or removed) against the previous version; null for the first. */
  sizeChange: number | null;
  status: string;
  /** "Diterbitkan", "Diarsipkan", ... when this version changed the status; else null. */
  statusLabel: string | null;
}

/**
 * Every kept version of a document, newest first, without loading their text.
 * Empty when the viewer cannot read the document's collection, so the history of a
 * restricted document is not readable even by a caller that forgot to check first.
 */
export async function getRevisionList(documentId: string, viewer: Viewer): Promise<RevisionListItem[]> {
  const rows = await db.$queryRaw<
    {
      version: number;
      title: string;
      createdAt: Date;
      editorName: string | null;
      size: number;
      status: string;
    }[]
  >(Prisma.sql`
    SELECT r.version, r.title, r."createdAt", u.name AS "editorName", length(r.content)::int AS size,
           r.status::text AS status
    FROM document_revisions r
    JOIN documents d ON d.id = r."documentId"
    JOIN collections c ON c.id = d."collectionId"
    LEFT JOIN users u ON u.id = r."editedById"
    WHERE r."documentId" = ${documentId}
      AND ${documentReadableSql(viewer, "d", "c")}
    ORDER BY r.version DESC`);

  const changes = sizeChanges(rows.map((row) => ({ version: row.version, size: row.size })));
  // Rows are newest first, so the version before row i is row i + 1.
  return rows.map((row, index) => ({
    version: row.version,
    title: row.title,
    createdAt: row.createdAt,
    editorName: row.editorName,
    sizeChange: changes.get(row.version) ?? null,
    status: row.status,
    statusLabel: statusChangeLabel(rows[index + 1]?.status, row.status),
  }));
}

export async function getRevision(documentId: string, version: number, viewer: Viewer) {
  if (!Number.isInteger(version) || version < 1) return null;
  return db.documentRevision.findFirst({
    where: { documentId, version, document: documentReadableWhere(viewer) },
    include: { editedBy: { select: { name: true } } },
  });
}

/**
 * Puts the text of an older version back as the document's text. It is an ordinary save:
 * a new version is added to the history (nothing is rewritten or removed), and the document's
 * slug, collection and status stay as they are now, since a version of the text is not a
 * version of where the document lives or whether it is published.
 */
export async function restoreRevision(documentId: string, version: number, actor: Viewer): Promise<{ changed: boolean; slug: string }> {
  if (actor.role !== Role.EDITOR && actor.role !== Role.ADMIN) throw new Error("Tidak berwenang");
  const revision = await getRevision(documentId, version, actor);
  if (!revision) throw new Error("Versi tidak ditemukan");
  const current = await db.document.findFirst({ where: { id: documentId, ...documentReadableWhere(actor) } });
  if (!current) throw new Error("Dokumen tidak ditemukan");
  if (!hasMeaningfulChange(current, revision)) return { changed: false, slug: current.slug };

  await updateDocument(
    documentId,
    {
      title: revision.title,
      slug: current.slug,
      collectionId: current.collectionId,
      type: revision.type,
      excerpt: revision.excerpt ?? undefined,
      content: revision.content,
      status: current.status,
    },
    actor,
  );
  return { changed: true, slug: current.slug };
}
