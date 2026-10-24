import { Prisma } from "@prisma/client";
import { db } from "../db";
import { sizeChanges } from "../revisions";

export interface RevisionListItem {
  version: number;
  title: string;
  createdAt: Date;
  editorName: string | null;
  /** Characters added (or removed) against the previous version; null for the first. */
  sizeChange: number | null;
}

/** Every kept version of a document, newest first, without loading their text. */
export async function getRevisionList(documentId: string): Promise<RevisionListItem[]> {
  const rows = await db.$queryRaw<
    { version: number; title: string; createdAt: Date; editorName: string | null; size: number }[]
  >(Prisma.sql`
    SELECT r.version, r.title, r."createdAt", u.name AS "editorName", length(r.content)::int AS size
    FROM document_revisions r
    LEFT JOIN users u ON u.id = r."editedById"
    WHERE r."documentId" = ${documentId}
    ORDER BY r.version DESC`);

  const changes = sizeChanges(rows.map((row) => ({ version: row.version, size: row.size })));
  return rows.map((row) => ({
    version: row.version,
    title: row.title,
    createdAt: row.createdAt,
    editorName: row.editorName,
    sizeChange: changes.get(row.version) ?? null,
  }));
}

export async function getRevision(documentId: string, version: number) {
  if (!Number.isInteger(version) || version < 1) return null;
  return db.documentRevision.findUnique({
    where: { documentId_version: { documentId, version } },
    include: { editedBy: { select: { name: true } } },
  });
}
