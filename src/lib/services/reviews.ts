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
    select: { id: true, slug: true, title: true, excerpt: true, content: true, type: true, status: true, locked: true, updatedAt: true, collection: { select: { requiresApproval: true } } },
  });
}

export interface ReviewProposal {
  title: string;
  excerpt: string | null;
  content: string;
  type: DocumentType;
  /** The document's "last updated" when this was asked, so an approval cannot apply it over a newer text. */
  baseUpdatedAt: string;
}

/** What is stored for a request to publish: no text, only the state of the draft that was asked about. */
interface PublishBase {
  baseUpdatedAt: string;
}

export const STALE_MESSAGE = "Dokumen berubah sejak permintaan ini diajukan; minta pengaju mengajukan ulang (atau tolak)";
export const CHANGED_MESSAGE = "Permintaan berubah sejak Anda membukanya; muat ulang halaman lalu periksa lagi";
/** A request being applied for longer than this is taken to have been interrupted, and waits again. */
const APPLYING_STALE_MS = 5 * 60 * 1000;
const OPEN: ReviewStatus[] = [ReviewStatus.PENDING, ReviewStatus.APPLYING];

/** Requests whose approval was interrupted (a timeout between claiming and applying) go back to waiting. */
async function releaseStuck(client: Prisma.TransactionClient | typeof db) {
  await client.documentReview.updateMany({
    where: { status: ReviewStatus.APPLYING, decidedAt: { lt: new Date(Date.now() - APPLYING_STALE_MS) } },
    data: { status: ReviewStatus.PENDING, decidedById: null, decidedAt: null, decisionNote: null },
  });
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
    await releaseStuck(tx);
    const doc = await loadDocument(tx, documentId, actor);
    if (!doc) throw new Error("Dokumen tidak ditemukan");
    if (isAdmin(actor)) throw new Error("Admin menyetujui sendiri: terbitkan langsung");
    if (!doc.collection.requiresApproval) throw new Error("Koleksi ini tidak butuh persetujuan: terbitkan langsung");
    if (doc.locked) throw new Error("Dokumen ini dikunci; hanya admin yang boleh mengubahnya");
    if (doc.status === DocumentStatus.PUBLISHED) throw new Error("Dokumen ini sudah terbit");
    if ((await tx.documentReview.count({ where: { documentId, status: { in: OPEN } } })) > 0) throw new Error("Sudah ada permintaan yang menunggu keputusan");
    const base: PublishBase = { baseUpdatedAt: doc.updatedAt.toISOString() };
    const review = await tx.documentReview.create({
      data: { documentId, kind: ReviewKind.PUBLISH, note, requestedById: actor.id, proposal: base as unknown as Prisma.InputJsonValue },
      select: { id: true },
    });
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
  const proposed = { title: parsed.title, excerpt: parsed.excerpt || null, content: parsed.content, type: parsed.type };

  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`review:${documentId}`}))`;
    await releaseStuck(tx);
    const doc = await loadDocument(tx, documentId, actor);
    if (!doc) throw new Error("Dokumen tidak ditemukan");
    if (isAdmin(actor)) throw new Error("Admin menyetujui sendiri: simpan langsung");
    if (!doc.collection.requiresApproval || doc.status !== DocumentStatus.PUBLISHED) throw new Error("Dokumen ini bisa disimpan langsung");
    if (doc.locked) throw new Error("Dokumen ini dikunci; hanya admin yang boleh mengubahnya");
    if (!hasMeaningfulChange(doc, proposed)) throw new Error("Tidak ada perubahan untuk diajukan");
    const proposal: ReviewProposal = { ...proposed, baseUpdatedAt: doc.updatedAt.toISOString() };

    const pending = await tx.documentReview.findFirst({ where: { documentId, status: { in: OPEN } }, select: { id: true, kind: true, status: true, requestedById: true } });
    if (pending && pending.status === ReviewStatus.APPLYING) throw new Error("Permintaan sedang diproses admin; coba lagi sebentar lagi");
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
 * request and the admin's name stay on the review). The admin approves what they saw: `seen` is the
 * request's "asked at" they were shown, and a request the editor has since replaced no longer matches.
 * The request is claimed first (PENDING to APPLYING, which also keeps anyone from asking for the same
 * document meanwhile), so two admins cannot apply it twice; it becomes APPROVED once written, and goes
 * back to PENDING if the document has changed since it was asked or writing fails.
 */
export async function approveReview(reviewId: string, rawNote: unknown, actor: Viewer, seen: unknown): Promise<{ slug: string }> {
  if (!isAdmin(actor)) throw new Error("Hanya admin yang boleh menyetujui");
  const note = cleanNote(rawNote, { required: false });
  const stamp = typeof seen === "number" ? seen : typeof seen === "string" && /^\d{1,16}$/.test(seen) ? Number(seen) : NaN;
  if (!Number.isFinite(stamp)) throw new Error(CHANGED_MESSAGE);
  await releaseStuck(db);
  const review = await db.documentReview.findFirst({
    where: { id: typeof reviewId === "string" ? reviewId : "", status: ReviewStatus.PENDING },
    select: { id: true, kind: true, proposal: true, documentId: true, createdAt: true },
  });
  if (!review) throw new Error("Permintaan tidak ditemukan atau sudah diputuskan");
  if (review.createdAt.getTime() !== stamp) throw new Error(CHANGED_MESSAGE);
  const claim = await db.documentReview.updateMany({
    where: { id: review.id, status: ReviewStatus.PENDING, createdAt: review.createdAt },
    data: { status: ReviewStatus.APPLYING, decidedById: actor.id, decidedAt: new Date(), decisionNote: note },
  });
  if (claim.count === 0) throw new Error(CHANGED_MESSAGE);

  const giveBack = () =>
    db.documentReview.updateMany({
      where: { id: review.id, status: ReviewStatus.APPLYING },
      data: { status: ReviewStatus.PENDING, decidedById: null, decidedAt: null, decisionNote: null },
    });
  try {
    const doc = await db.document.findUnique({ where: { id: review.documentId }, select: { slug: true, collectionId: true, status: true, updatedAt: true } });
    if (!doc) throw new Error("Dokumen tidak ditemukan");
    const base = (review.proposal as unknown as PublishBase | null)?.baseUpdatedAt;
    if (!base || doc.updatedAt.toISOString() !== base) throw new Error(STALE_MESSAGE);

    if (review.kind === ReviewKind.PUBLISH) {
      await setDocumentStatus(review.documentId, DocumentStatus.PUBLISHED, actor, { approved: true });
    } else {
      const p = review.proposal as unknown as ReviewProposal | null;
      if (!p || typeof p.content !== "string") throw new Error("Permintaan tidak memuat perubahan");
      await updateDocument(
        review.documentId,
        { title: p.title, slug: doc.slug, collectionId: doc.collectionId, type: p.type, excerpt: p.excerpt ?? undefined, content: p.content, status: doc.status },
        actor,
        { approved: true },
      );
    }
    await db.documentReview.updateMany({ where: { id: review.id, status: ReviewStatus.APPLYING }, data: { status: ReviewStatus.APPROVED, decidedAt: new Date() } });
    return { slug: doc.slug };
  } catch (err) {
    await giveBack();
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
  const open = (i: ReviewItem) => i.status === ReviewStatus.PENDING || i.status === ReviewStatus.APPLYING;
  return [...items.filter(open), ...items.filter((i) => !open(i))];
}

/**
 * The inbox: every waiting request for an admin; for an editor their own, waiting and the latest decided,
 * so they see the answer and the reason. Only documents the person may read.
 */
export async function listInbox(actor: Viewer): Promise<{ pending: ReviewItem[]; decided: ReviewItem[] }> {
  if (!isStaff(actor)) throw new Error("Hanya penyunting yang boleh membuka kotak persetujuan");
  const base = { document: { ...documentReadableWhere(actor) }, ...(isAdmin(actor) ? {} : { requestedById: actor.id }) };
  const [pending, decided] = await Promise.all([
    db.documentReview.findMany({ where: { ...base, status: { in: OPEN } }, orderBy: { createdAt: "asc" }, take: 100, select: REVIEW_SELECT }),
    db.documentReview.findMany({ where: { ...base, status: { notIn: OPEN } }, orderBy: { decidedAt: "desc" }, take: HISTORY_LIMIT, select: REVIEW_SELECT }),
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
