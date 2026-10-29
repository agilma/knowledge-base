import { DocumentStatus, DocumentType, Prisma, ReviewKind, ReviewStatus, Role } from "@prisma/client";
import { db } from "../db";
import { documentReadableWhere, type Viewer } from "../collection-access";
import { documentSchema } from "../validation/document";
import { hasMeaningfulChange } from "../revisions";
import { setDocumentStatus, updateDocument } from "./documents";

/**
 * The approval flow (roadmap 12) and the lock (roadmap 36). In a collection that requires approval an
 * editor cannot make a document published or change a published one (documents.ts refuses it); they ask
 * here, and an admin approves or rejects. The live document does not change until it is approved. A locked
 * document is for admins only, whatever the collection says.
 */
export const REVIEW_NOTE_MAX = 500;
export const REJECT_NOTE_MIN = 3;
export const HISTORY_LIMIT = 20;

const isStaff = (viewer: Viewer) => viewer.role === Role.EDITOR || viewer.role === Role.ADMIN;
const isAdmin = (viewer: Viewer) => viewer.role === Role.ADMIN;

function cleanNote(raw: unknown, { required }: { required: boolean }): string | null {
  const text = typeof raw === "string" ? raw.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim() : "";
  if (!text) {
    if (required) throw new Error(`Alasan penolakan wajib diisi (minimal ${REJECT_NOTE_MIN} karakter)`);
    return null;
  }
  if (required && text.length < REJECT_NOTE_MIN) throw new Error(`Alasan penolakan wajib diisi (minimal ${REJECT_NOTE_MIN} karakter)`);
  if (text.length > REVIEW_NOTE_MAX) throw new Error(`Catatan maksimal ${REVIEW_NOTE_MAX} karakter`);
  return text;
}

/** A document the actor may read, with what the rules need to know about its collection. */
function loadDocument(client: Prisma.TransactionClient | typeof db, id: string, actor: Viewer) {
  return client.document.findFirst({
    where: { id: typeof id === "string" ? id : "", ...documentReadableWhere(actor) },
    select: { id: true, slug: true, title: true, excerpt: true, content: true, type: true, status: true, locked: true, collection: { select: { requiresApproval: true } } },
  });
}

export interface ReviewProposal {
  title: string;
  excerpt: string | null;
  content: string;
  type: DocumentType;
}

export interface ReviewItem {
  id: string;
  documentId: string;
  kind: ReviewKind;
  status: ReviewStatus;
  note: string | null;
  decisionNote: string | null;
  createdAt: Date;
  decidedAt: Date | null;
  requestedByName: string | null;
  requestedById: string | null;
  decidedByName: string | null;
  proposal: ReviewProposal | null;
  document: { slug: string; title: string };
}

/**
 * What an editor's save of this document would do: written straight ("direct"), or asked of an admin
 * ("review", for a published document in a collection that requires approval), or refused ("locked").
 * The form and the actions use it to choose; the rules themselves are enforced again in documents.ts.
 */
export async function saveMode(documentId: string, actor: Viewer): Promise<"direct" | "review" | "locked"> {
  const doc = await loadDocument(db, documentId, actor);
  if (!doc) throw new Error("Dokumen tidak ditemukan");
  if (isAdmin(actor)) return "direct";
  if (doc.locked) return "locked";
  return doc.collection.requiresApproval && doc.status === DocumentStatus.PUBLISHED ? "review" : "direct";
}

/** Asks an admin to publish a draft (or archived) document of a collection that requires approval. */
export async function submitPublish(documentId: string, rawNote: unknown, actor: Viewer): Promise<{ id: string; slug: string }> {
  if (!isStaff(actor)) throw new Error("Hanya penyunting yang boleh mengajukan");
  const note = cleanNote(rawNote, { required: false });
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`review:${documentId}`}))`;
    const doc = await loadDocument(tx, documentId, actor);
    if (!doc) throw new Error("Dokumen tidak ditemukan");
    if (isAdmin(actor)) throw new Error("Admin menyetujui sendiri: terbitkan langsung");
    if (!doc.collection.requiresApproval) throw new Error("Koleksi ini tidak butuh persetujuan: terbitkan langsung");
    if (doc.locked) throw new Error("Dokumen ini dikunci; hanya admin yang boleh mengubahnya");
    if (doc.status === DocumentStatus.PUBLISHED) throw new Error("Dokumen ini sudah terbit");
    if ((await tx.documentReview.count({ where: { documentId, status: ReviewStatus.PENDING } })) > 0) throw new Error("Sudah ada permintaan yang menunggu keputusan");
    const review = await tx.documentReview.create({ data: { documentId, kind: ReviewKind.PUBLISH, note, requestedById: actor.id }, select: { id: true } });
    return { id: review.id, slug: doc.slug };
  });
}

/**
 * Asks an admin to change the text of a published document of a collection that requires approval. The
 * live document stays as it is; a newer request from the same editor replaces their earlier one.
 */
export async function submitChange(documentId: string, input: unknown, rawNote: unknown, actor: Viewer): Promise<{ id: string; slug: string }> {
  if (!isStaff(actor)) throw new Error("Hanya penyunting yang boleh mengajukan");
  const note = cleanNote(rawNote, { required: false });
  const raw = (input ?? {}) as Record<string, unknown>;
  const parsed = documentSchema.pick({ title: true, excerpt: true, content: true, type: true }).parse({ title: raw.title, excerpt: raw.excerpt, content: raw.content, type: raw.type });
  const proposal: ReviewProposal = { title: parsed.title, excerpt: parsed.excerpt || null, content: parsed.content, type: parsed.type };

  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`review:${documentId}`}))`;
    const doc = await loadDocument(tx, documentId, actor);
    if (!doc) throw new Error("Dokumen tidak ditemukan");
    if (isAdmin(actor)) throw new Error("Admin menyetujui sendiri: simpan langsung");
    if (!doc.collection.requiresApproval || doc.status !== DocumentStatus.PUBLISHED) throw new Error("Dokumen ini bisa disimpan langsung");
    if (doc.locked) throw new Error("Dokumen ini dikunci; hanya admin yang boleh mengubahnya");
    if (!hasMeaningfulChange(doc, proposal)) throw new Error("Tidak ada perubahan untuk diajukan");

    const pending = await tx.documentReview.findFirst({ where: { documentId, status: ReviewStatus.PENDING }, select: { id: true, kind: true, requestedById: true } });
    if (pending && !(pending.kind === ReviewKind.CHANGE && pending.requestedById === actor.id)) {
      throw new Error("Sudah ada permintaan lain yang menunggu keputusan");
    }
    const data = { proposal: proposal as unknown as Prisma.InputJsonValue, note };
    if (pending) {
      await tx.documentReview.update({ where: { id: pending.id }, data: { ...data, createdAt: new Date() } });
      return { id: pending.id, slug: doc.slug };
    }
    const review = await tx.documentReview.create({ data: { documentId, kind: ReviewKind.CHANGE, requestedById: actor.id, ...data }, select: { id: true } });
    return { id: review.id, slug: doc.slug };
  });
}

/** The editor who asked, or an admin, takes the request back. */
export async function withdrawReview(reviewId: string, actor: Viewer): Promise<{ slug: string }> {
  if (!isStaff(actor)) throw new Error("Tidak berwenang");
  const review = await db.documentReview.findFirst({
    where: { id: typeof reviewId === "string" ? reviewId : "", status: ReviewStatus.PENDING, document: { ...documentReadableWhere(actor) } },
    select: { id: true, requestedById: true, document: { select: { slug: true } } },
  });
  if (!review) throw new Error("Permintaan tidak ditemukan atau sudah diputuskan");
  if (!isAdmin(actor) && review.requestedById !== actor.id) throw new Error("Hanya pengaju atau admin yang boleh menarik permintaan");
  const { count } = await db.documentReview.updateMany({ where: { id: review.id, status: ReviewStatus.PENDING }, data: { status: ReviewStatus.WITHDRAWN, decidedById: actor.id, decidedAt: new Date() } });
  if (count === 0) throw new Error("Permintaan sudah diputuskan");
  return { slug: review.document.slug };
}

/**
 * An admin approves: the document is published, or its text replaced by the proposal, as the admin (the
 * request and the admin's name stay on the review). The request is claimed first, so two admins pressing
 * Approve cannot apply it twice; if applying fails the request goes back to waiting.
 */
export async function approveReview(reviewId: string, rawNote: unknown, actor: Viewer): Promise<{ slug: string }> {
  if (!isAdmin(actor)) throw new Error("Hanya admin yang boleh menyetujui");
  const note = cleanNote(rawNote, { required: false });
  const review = await db.documentReview.findFirst({
    where: { id: typeof reviewId === "string" ? reviewId : "", status: ReviewStatus.PENDING },
    select: { id: true, kind: true, proposal: true, documentId: true },
  });
  if (!review) throw new Error("Permintaan tidak ditemukan atau sudah diputuskan");
  const claim = await db.documentReview.updateMany({
    where: { id: review.id, status: ReviewStatus.PENDING },
    data: { status: ReviewStatus.APPROVED, decidedById: actor.id, decidedAt: new Date(), decisionNote: note },
  });
  if (claim.count === 0) throw new Error("Permintaan sudah diputuskan");

  try {
    const doc = await db.document.findUnique({ where: { id: review.documentId }, select: { slug: true, collectionId: true, status: true } });
    if (!doc) throw new Error("Dokumen tidak ditemukan");
    if (review.kind === ReviewKind.PUBLISH) {
      await setDocumentStatus(review.documentId, DocumentStatus.PUBLISHED, actor, { approved: true });
    } else {
      const p = review.proposal as unknown as ReviewProposal | null;
      if (!p) throw new Error("Permintaan tidak memuat perubahan");
      await updateDocument(
        review.documentId,
        { title: p.title, slug: doc.slug, collectionId: doc.collectionId, type: p.type, excerpt: p.excerpt ?? undefined, content: p.content, status: doc.status },
        actor,
        { approved: true },
      );
    }
    return { slug: doc.slug };
  } catch (err) {
    await db.documentReview.updateMany({
      where: { id: review.id, status: ReviewStatus.APPROVED },
      data: { status: ReviewStatus.PENDING, decidedById: null, decidedAt: null, decisionNote: null },
    });
    throw err;
  }
}

/** An admin rejects, with the reason the editor will read. The document is left as it is. */
export async function rejectReview(reviewId: string, rawNote: unknown, actor: Viewer): Promise<{ slug: string }> {
  if (!isAdmin(actor)) throw new Error("Hanya admin yang boleh menolak");
  const note = cleanNote(rawNote, { required: true });
  const review = await db.documentReview.findFirst({
    where: { id: typeof reviewId === "string" ? reviewId : "", status: ReviewStatus.PENDING },
    select: { id: true, document: { select: { slug: true } } },
  });
  if (!review) throw new Error("Permintaan tidak ditemukan atau sudah diputuskan");
  const { count } = await db.documentReview.updateMany({
    where: { id: review.id, status: ReviewStatus.PENDING },
    data: { status: ReviewStatus.REJECTED, decidedById: actor.id, decidedAt: new Date(), decisionNote: note },
  });
  if (count === 0) throw new Error("Permintaan sudah diputuskan");
  return { slug: review.document.slug };
}

const REVIEW_SELECT = {
  id: true,
  documentId: true,
  kind: true,
  status: true,
  note: true,
  decisionNote: true,
  createdAt: true,
  decidedAt: true,
  proposal: true,
  requestedById: true,
  requestedBy: { select: { name: true, email: true } },
  decidedBy: { select: { name: true, email: true } },
  document: { select: { slug: true, title: true } },
} satisfies Prisma.DocumentReviewSelect;

type ReviewRow = Prisma.DocumentReviewGetPayload<{ select: typeof REVIEW_SELECT }>;

function toItem(row: ReviewRow): ReviewItem {
  return {
    id: row.id,
    documentId: row.documentId,
    kind: row.kind,
    status: row.status,
    note: row.note,
    decisionNote: row.decisionNote,
    createdAt: row.createdAt,
    decidedAt: row.decidedAt,
    requestedById: row.requestedById,
    requestedByName: row.requestedBy ? (row.requestedBy.name ?? row.requestedBy.email) : null,
    decidedByName: row.decidedBy ? (row.decidedBy.name ?? row.decidedBy.email) : null,
    proposal: row.kind === ReviewKind.CHANGE ? (row.proposal as unknown as ReviewProposal | null) : null,
    document: row.document,
  };
}

/** Requests on one document, waiting first then the latest decided, for editors and admins who may read it. */
export async function listReviewsForDocument(documentId: string, actor: Viewer): Promise<ReviewItem[]> {
  if (!isStaff(actor)) return [];
  const rows = await db.documentReview.findMany({
    where: { documentId, document: { ...documentReadableWhere(actor) } },
    orderBy: [{ createdAt: "desc" }],
    take: HISTORY_LIMIT,
    select: REVIEW_SELECT,
  });
  const items = rows.map(toItem);
  return [...items.filter((i) => i.status === ReviewStatus.PENDING), ...items.filter((i) => i.status !== ReviewStatus.PENDING)];
}

/**
 * The inbox: every waiting request for an admin; for an editor their own, waiting and the latest decided,
 * so they see the answer and the reason. Only documents the person may read.
 */
export async function listInbox(actor: Viewer): Promise<{ pending: ReviewItem[]; decided: ReviewItem[] }> {
  if (!isStaff(actor)) throw new Error("Hanya penyunting yang boleh membuka kotak persetujuan");
  const base = { document: { ...documentReadableWhere(actor) }, ...(isAdmin(actor) ? {} : { requestedById: actor.id }) };
  const [pending, decided] = await Promise.all([
    db.documentReview.findMany({ where: { ...base, status: ReviewStatus.PENDING }, orderBy: { createdAt: "asc" }, take: 100, select: REVIEW_SELECT }),
    db.documentReview.findMany({ where: { ...base, status: { not: ReviewStatus.PENDING } }, orderBy: { decidedAt: "desc" }, take: HISTORY_LIMIT, select: REVIEW_SELECT }),
  ]);
  return { pending: pending.map(toItem), decided: decided.map(toItem) };
}

/** Locks or unlocks a document: while locked only an admin may change it. Not an edit of the text. Admin only. */
export async function setDocumentLocked(documentId: string, locked: boolean, actor: Viewer): Promise<{ slug: string }> {
  if (!isAdmin(actor)) throw new Error("Hanya admin yang boleh mengunci dokumen");
  if (typeof locked !== "boolean") throw new Error("Permintaan tidak valid");
  const doc = await db.document.findUnique({ where: { id: typeof documentId === "string" ? documentId : "" }, select: { slug: true } });
  if (!doc) throw new Error("Dokumen tidak ditemukan");
  // SQL, so the document's "last updated" time (which means "its text changed") is left alone
  await db.$executeRaw`UPDATE documents SET locked = ${locked} WHERE id = ${documentId}`;
  return { slug: doc.slug };
}
