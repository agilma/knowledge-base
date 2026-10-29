import { DocumentType, Role } from "@prisma/client";
import { db } from "../db";
import { documentReadableWhere, type Viewer } from "../collection-access";

/** Templates one workspace can keep; a limit keeps the chooser short. */
export const MAX_TEMPLATES = 100;
/** The longest text a template can hold: a starting point, not an archive. */
export const TEMPLATE_CONTENT_MAX = 50_000;
export const TEMPLATE_NAME_MIN = 3;
export const TEMPLATE_NAME_MAX = 80;

const isStaff = (viewer: Viewer) => viewer.role === Role.EDITOR || viewer.role === Role.ADMIN;

function assertStaff(viewer: Viewer) {
  if (!isStaff(viewer)) throw new Error("Hanya penyunting yang boleh memakai templat");
}

/** The name as it is kept: trimmed, inner spaces collapsed. Throws what is wrong with it. */
export function cleanTemplateName(raw: unknown): string {
  if (typeof raw !== "string") throw new Error("Nama templat wajib diisi");
  const name = raw.slice(0, 1000).replace(/\s+/g, " ").trim();
  if (name.length < TEMPLATE_NAME_MIN) throw new Error(`Nama templat minimal ${TEMPLATE_NAME_MIN} karakter`);
  if (name.length > TEMPLATE_NAME_MAX) throw new Error(`Nama templat maksimal ${TEMPLATE_NAME_MAX} karakter`);
  return name;
}

function documentType(value: string): DocumentType {
  return (Object.values(DocumentType) as string[]).includes(value) ? (value as DocumentType) : DocumentType.PANDUAN;
}

export interface TemplateItem {
  id: string;
  name: string;
  type: DocumentType;
  createdByName: string | null;
  createdById: string | null;
  createdAt: Date;
  /** Characters of text, to tell a stub from a full guide. */
  size: number;
}

/** Every template, by name. Editors and admins only. */
export async function listTemplates(viewer: Viewer): Promise<TemplateItem[]> {
  assertStaff(viewer);
  const rows = await db.documentTemplate.findMany({
    orderBy: { name: "asc" },
    take: MAX_TEMPLATES,
    select: { id: true, name: true, type: true, createdById: true, createdAt: true, createdBy: { select: { name: true, email: true } }, content: true },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: documentType(row.type),
    createdById: row.createdById,
    createdByName: row.createdBy ? (row.createdBy.name ?? row.createdBy.email) : null,
    createdAt: row.createdAt,
    size: row.content.length,
  }));
}

/** One template with its text, for the new-document form. Null when there is none such. */
export async function getTemplate(id: string, viewer: Viewer): Promise<{ id: string; name: string; type: DocumentType; content: string } | null> {
  assertStaff(viewer);
  if (typeof id !== "string" || !id) return null;
  const row = await db.documentTemplate.findUnique({ where: { id }, select: { id: true, name: true, type: true, content: true } });
  return row ? { ...row, type: documentType(row.type) } : null;
}

/**
 * Keeps a document as a template. Only a document that everyone who can sign in may read: every editor
 * can read every template, so a restricted document (or one in a restricted collection) must not become
 * one. The name is the document's title unless given; a name already taken gets " (2)", " (3)", ...
 */
export async function createTemplateFromDocument(documentId: string, rawName: unknown, viewer: Viewer): Promise<{ id: string; name: string }> {
  assertStaff(viewer);
  if (typeof documentId !== "string" || !documentId) throw new Error("Permintaan tidak valid");
  const doc = await db.document.findFirst({
    where: { id: documentId, ...documentReadableWhere(viewer) },
    select: { title: true, type: true, content: true, restricted: true, collection: { select: { restricted: true } } },
  });
  if (!doc) throw new Error("Dokumen tidak ditemukan");
  if (doc.restricted || doc.collection.restricted) {
    throw new Error("Hanya dokumen yang terbuka untuk semua pengguna yang bisa dijadikan templat");
  }
  if (doc.content.length > TEMPLATE_CONTENT_MAX) throw new Error(`Dokumen terlalu panjang untuk templat (maksimal ${TEMPLATE_CONTENT_MAX} karakter)`);
  const base = cleanTemplateName(rawName === undefined || rawName === null || rawName === "" ? doc.title.slice(0, TEMPLATE_NAME_MAX) : rawName);

  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('document_templates'))`;
    if ((await tx.documentTemplate.count()) >= MAX_TEMPLATES) throw new Error(`Templat maksimal ${MAX_TEMPLATES}`);
    const taken = new Set((await tx.documentTemplate.findMany({ where: { name: { startsWith: base.slice(0, 70), mode: "insensitive" } }, select: { name: true } })).map((t) => t.name.toLowerCase()));
    let name = base;
    for (let n = 2; taken.has(name.toLowerCase()); n += 1) name = `${base.slice(0, TEMPLATE_NAME_MAX - 6)} (${n})`;
    return tx.documentTemplate.create({ data: { name, type: doc.type, content: doc.content, createdById: viewer.id }, select: { id: true, name: true } });
  });
}

/** The creator or an admin may change or remove a template. */
async function editable(id: string, viewer: Viewer) {
  assertStaff(viewer);
  const row = await db.documentTemplate.findUnique({ where: { id: typeof id === "string" ? id : "" }, select: { id: true, createdById: true } });
  if (!row) throw new Error("Templat tidak ditemukan");
  if (viewer.role !== Role.ADMIN && row.createdById !== viewer.id) throw new Error("Hanya pembuat templat atau admin yang boleh mengubahnya");
  return row;
}

export async function renameTemplate(id: string, rawName: unknown, viewer: Viewer): Promise<void> {
  const name = cleanTemplateName(rawName);
  await editable(id, viewer);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('document_templates'))`;
    if ((await tx.documentTemplate.count({ where: { id: { not: id }, name: { equals: name, mode: "insensitive" } } })) > 0) {
      throw new Error("Nama templat sudah dipakai");
    }
    await tx.documentTemplate.update({ where: { id }, data: { name } });
  });
}

export async function deleteTemplate(id: string, viewer: Viewer): Promise<void> {
  await editable(id, viewer);
  await db.documentTemplate.deleteMany({ where: { id } });
}
