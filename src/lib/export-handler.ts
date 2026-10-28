import { Role } from "@prisma/client";
import { documentToMarkdown, exportManifest, exportPath, exportReadme, type ExportedDocument } from "./export";
import { json } from "./ai/http";
import { ZipWriter } from "./zip";

export interface ExportHandlerDeps {
  getUser(): Promise<{ id: string; role: Role } | null>;
  rateLimit: { take(key: string): { ok: true } | { ok: false; retryAfterMs: number } };
  /** Throws for a collection that does not exist. */
  resolveScope(collectionSlug: string | null): Promise<{ id: string; slug: string } | null>;
  count(collectionId?: string): Promise<number>;
  batch(options: { afterId?: string; collectionId?: string }): Promise<ExportedDocument[]>;
  now(): Date;
}

/**
 * The export as a zip, written a batch at a time so a library of thousands of documents is
 * never held in memory at once. Admin only; it carries everything, drafts and restricted
 * documents included.
 */
export async function handleExportRequest(request: Request, deps: ExportHandlerDeps): Promise<Response> {
  const user = await deps.getUser();
  if (!user) return json(401, "Silakan masuk lebih dulu.");
  if (user.role !== Role.ADMIN) return json(403, "Fitur ini hanya untuk admin.");

  // A link on another site must not be able to start a heavy download in an admin's browser.
  // Direct navigation sends "none" or "same-origin"; a browser that sends nothing is let through.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return json(403, "Permintaan ditolak.");

  let scope: { id: string; slug: string } | null;
  try {
    scope = await deps.resolveScope(new URL(request.url).searchParams.get("koleksi"));
  } catch {
    return json(404, "Koleksi tidak ditemukan.");
  }
  const total = await deps.count(scope?.id);
  if (total > 60_000) return json(413, "Terlalu banyak dokumen untuk satu berkas. Ekspor per koleksi.");

  // Only an export that will really be written uses up one of the few allowed.
  const limit = deps.rateLimit.take(user.id);
  if (!limit.ok) {
    return json(429, "Ekspor baru saja dibuat. Coba lagi beberapa menit lagi.", { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) });
  }

  const now = deps.now();
  const zip = new ZipWriter();
  const manifest: ExportedDocument[] = [];
  const encoder = new TextEncoder();
  let afterId: string | undefined;
  let stage: "readme" | "documents" | "tail" | "done" = "readme";
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    // The browser gave up (closed the tab, cancelled the download): stop reading documents.
    cancel() {
      stage = "done";
      cancelled = true;
    },
    // A pull that adds nothing is not called again, so it keeps going until a chunk is enqueued or the stream is closed.
    async pull(controller) {
      try {
        let sent = false;
        while (!sent) {
          if (cancelled) return;
          if (stage === "readme") {
            controller.enqueue(zip.add("README.txt", encoder.encode(exportReadme({ exportedAt: now, count: total, collection: scope?.slug })), now));
            stage = "documents";
            sent = true;
          } else if (stage === "documents") {
            const docs = await deps.batch({ afterId, collectionId: scope?.id });
            for (const doc of docs) {
              controller.enqueue(zip.add(exportPath(doc), encoder.encode(documentToMarkdown(doc)), doc.updatedAt));
              manifest.push({ ...doc, content: "" });
              sent = true;
            }
            if (docs.length === 0) stage = "tail";
            else afterId = docs[docs.length - 1].id;
          } else if (stage === "tail") {
            controller.enqueue(zip.add("manifest.json", encoder.encode(exportManifest(manifest)), now));
            controller.enqueue(zip.finish());
            stage = "done";
            sent = true;
            console.info("[export] selesai", { adminId: user.id, dokumen: manifest.length, koleksi: scope?.slug ?? "semua" });
          } else {
            controller.close();
            return;
          }
        }
      } catch (err) {
        // A cancelled download makes the next enqueue throw; that is not a failure.
        if (!cancelled) {
          console.error("[export] gagal", { name: (err as Error)?.name });
          controller.error(err);
        }
      }
    },
  });

  const stamp = now.toISOString().slice(0, 10);
  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="knowledge-base-${scope?.slug ?? "semua"}-${stamp}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
