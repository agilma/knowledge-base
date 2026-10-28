import { DocumentStatus, DocumentType } from "@prisma/client";
import { documentSchema, type DocumentInput } from "./validation/document";

/**
 * Draft documents kept as markdown files in the repository (content/drafts) and
 * imported into the database by `npm run docs:import`. Pure parsing and
 * validation lives here so it can be tested without a database.
 */
export interface DraftFile {
  slug: string;
  title: string;
  type: DocumentType;
  /** slug of the collection the draft is filed under */
  collection: string;
  excerpt: string;
  content: string;
}

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
// The summary may be empty (an export of a document that has none must still be importable).
const KEYS = ["title", "slug", "type", "collection"] as const;

/** `name` is the file's name without `.md`; it must match the slug so files stay findable. */
export function parseDraft(text: string, name: string): DraftFile {
  const match = FRONTMATTER.exec(text.replace(/\r\n/g, "\n"));
  if (!match) throw new Error(`${name}: frontmatter (--- ... ---) tidak ditemukan`);

  const fields: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    if (!line.trim()) continue;
    const colon = line.indexOf(":");
    if (colon === -1) throw new Error(`${name}: baris frontmatter tidak valid: "${line}"`);
    fields[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  for (const key of KEYS) {
    if (!fields[key]) throw new Error(`${name}: bidang "${key}" wajib diisi`);
  }

  if (!(Object.values(DocumentType) as string[]).includes(fields.type)) {
    throw new Error(`${name}: type "${fields.type}" tidak dikenal`);
  }
  if (fields.slug !== name) {
    throw new Error(`${name}: slug "${fields.slug}" harus sama dengan nama berkas`);
  }
  const content = match[2].trim();
  if (!content) throw new Error(`${name}: isi dokumen kosong`);

  return {
    slug: fields.slug,
    title: fields.title,
    type: fields.type as DocumentType,
    collection: fields.collection,
    excerpt: fields.excerpt ?? "",
    content: content + "\n",
  };
}

/** The input `createDocument` takes. Imported documents are always drafts. */
export function toDocumentInput(draft: DraftFile, collectionId: string): DocumentInput {
  return documentSchema.parse({
    title: draft.title,
    slug: draft.slug,
    collectionId,
    type: draft.type,
    excerpt: draft.excerpt,
    content: draft.content,
    status: DocumentStatus.DRAFT,
  });
}
