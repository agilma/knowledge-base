import { db } from "../db";
import type { Viewer } from "../collection-access";
import { toDocumentInput, type DraftFile } from "../draft-import";
import { createDocument } from "./documents";

export interface ImportResult {
  created: string[];
  skipped: string[];
  failed: { slug: string; error: string }[];
}

/**
 * Creates each draft as a DRAFT document, unless a document with that slug
 * already exists: nothing is ever overwritten, so running it again is safe.
 * `actor` becomes the author and first editor in the history.
 */
export async function importDrafts(drafts: DraftFile[], actor: Viewer): Promise<ImportResult> {
  const result: ImportResult = { created: [], skipped: [], failed: [] };

  for (const draft of drafts) {
    try {
      const exists = await db.document.findUnique({ where: { slug: draft.slug }, select: { id: true } });
      if (exists) {
        result.skipped.push(draft.slug);
        continue;
      }
      const collection = await db.collection.findUnique({ where: { slug: draft.collection }, select: { id: true } });
      if (!collection) throw new Error(`koleksi "${draft.collection}" tidak ditemukan`);

      await createDocument(toDocumentInput(draft, collection.id), actor);
      result.created.push(draft.slug);
    } catch (err) {
      result.failed.push({ slug: draft.slug, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return result;
}
