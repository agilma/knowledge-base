import { test } from "node:test";
import assert from "node:assert/strict";
import { DocumentStatus, DocumentType, Role } from "@prisma/client";
import { documentToMarkdown, exportManifest, exportPath, exportReadme, type ExportedDocument } from "./export";
import { parseDraft } from "./draft-import";
import { handleExportRequest, type ExportHandlerDeps } from "./export-handler";
import { createRateLimiter } from "./ai/rate-limit";
import { inflateRawSync } from "node:zlib";

const doc = (n: number, over: Partial<ExportedDocument> = {}): ExportedDocument => ({
  id: `id${String(n).padStart(3, "0")}`,
  slug: `dokumen-${n}`,
  title: `Judul ${n}: dengan titik dua`,
  excerpt: "Ringkasan\nbaris dua",
  content: `## Isi ${n}\r\n\r\nteks\r\n\r\n`,
  type: DocumentType.PANDUAN,
  status: DocumentStatus.PUBLISHED,
  restricted: false,
  createdAt: new Date("2026-10-01T00:00:00Z"),
  updatedAt: new Date("2026-10-28T00:00:00Z"),
  collection: { slug: "pos", name: "POS" },
  author: { name: "Penulis" },
  lastEditedBy: null,
  ...over,
});

test("an exported file can be read back by the draft importer", () => {
  const md = documentToMarkdown(doc(1));
  const parsed = parseDraft(md, "dokumen-1");
  assert.equal(parsed.title, "Judul 1: dengan titik dua");
  assert.equal(parsed.collection, "pos");
  assert.equal(parsed.type, DocumentType.PANDUAN);
  assert.equal(parsed.excerpt, "Ringkasan baris dua");
  assert.equal(parsed.content, "## Isi 1\n\nteks\n");
});

test("a document without a summary is still importable, and extra keys are kept for the record", () => {
  const md = documentToMarkdown(doc(2, { excerpt: null, status: DocumentStatus.DRAFT, restricted: true }));
  assert.equal(parseDraft(md, "dokumen-2").excerpt, "");
  assert.match(md, /status: DRAFT\n/);
  assert.match(md, /restricted: true\n/);
  assert.match(md, /author: Penulis\n/);
  assert.ok(!md.includes("last_edited_by"));
});

test("paths, manifest and readme describe the archive", () => {
  assert.equal(exportPath(doc(3)), "pos/dokumen-3.md");
  const manifest = JSON.parse(exportManifest([doc(3), doc(4, { status: DocumentStatus.ARCHIVED })]));
  assert.deepEqual(manifest.map((m: { path: string; status: string }) => [m.path, m.status]), [["pos/dokumen-3.md", "PUBLISHED"], ["pos/dokumen-4.md", "ARCHIVED"]]);
  assert.match(exportReadme({ exportedAt: new Date("2026-10-28T00:00:00Z"), count: 2 }), /Jumlah dokumen: 2/);
  assert.match(exportReadme({ exportedAt: new Date(), count: 1, collection: "pos" }), /hanya koleksi pos/);
});

// ---- the handler ----

const ADMIN = { id: "a1", role: Role.ADMIN };
function deps(over: Partial<ExportHandlerDeps> = {}, docs = [doc(1), doc(2), doc(3), doc(4), doc(5)]): ExportHandlerDeps & { calls: number } {
  const state = { calls: 0 };
  const result = {
      getUser: async () => ADMIN,
      rateLimit: createRateLimiter({ limit: 10, windowMs: 1000 }),
      resolveScope: async (slug: string | null) => (slug ? (slug === "pos" ? { id: "c1", slug: "pos" } : Promise.reject(new Error("x"))) : null),
      count: async () => docs.length,
      batch: async ({ afterId }: { afterId?: string }) => {
        state.calls++;
        return docs.filter((d) => !afterId || d.id > afterId).slice(0, 2);
      },
      now: () => new Date("2026-10-28T10:00:00Z"),
      ...over,
  };
  // read live: the number changes as the stream is consumed
  Object.defineProperty(result, "calls", { get: () => state.calls });
  return result as ExportHandlerDeps & { calls: number };
}
const get = (query = "", headers: Record<string, string> = {}) => new Request(`https://kb.test/api/admin/export${query}`, { headers });

function names(zip: Uint8Array): string[] {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const end = zip.length - 22;
  const count = view.getUint16(end + 10, true);
  let p = view.getUint32(end + 16, true);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const n = view.getUint16(p + 28, true);
    out.push(new TextDecoder().decode(zip.subarray(p + 46, p + 46 + n)));
    p += 46 + n + view.getUint16(p + 30, true) + view.getUint16(p + 32, true);
  }
  return out;
}

test("the export is a zip with every document, fetched in batches, plus readme and manifest", async () => {
  const d = deps();
  const res = await handleExportRequest(get(), d);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "application/zip");
  assert.match(res.headers.get("content-disposition") ?? "", /knowledge-base-semua-2026-10-28\.zip/);
  assert.equal(res.headers.get("cache-control"), "no-store");
  const zip = new Uint8Array(await res.arrayBuffer());
  assert.deepEqual(names(zip), ["README.txt", ...[1, 2, 3, 4, 5].map((n) => `pos/dokumen-${n}.md`), "manifest.json"]);
  assert.equal(d.calls, 4, "5 documents in batches of 2, then an empty batch ends it");
  void inflateRawSync;
});

test("no session, non-admin, other sites and too many requests are refused before anything is read", async () => {
  for (const [over, headers, status] of [
    [{ getUser: async () => null }, {}, 401],
    [{ getUser: async () => ({ id: "e", role: Role.EDITOR }) }, {}, 403],
    [{ getUser: async () => ({ id: "v", role: Role.VIEWER }) }, {}, 403],
    [{}, { "sec-fetch-site": "cross-site" }, 403],
    [{}, { "sec-fetch-site": "same-site" }, 403],
  ] as [Partial<ExportHandlerDeps>, Record<string, string>, number][]) {
    const d = deps(over);
    const res = await handleExportRequest(get("", headers), d);
    assert.equal(res.status, status);
    assert.equal(d.calls, 0);
  }
  assert.equal((await handleExportRequest(get("", { "sec-fetch-site": "none" }), deps())).status, 200);
  const limited = deps({ rateLimit: createRateLimiter({ limit: 1, windowMs: 60_000 }) });
  assert.equal((await handleExportRequest(get(), limited)).status, 200);
  const second = await handleExportRequest(get(), limited);
  assert.equal(second.status, 429);
  assert.ok(second.headers.get("retry-after"));
});

test("a collection can be exported alone; an unknown one is not found; a huge library asks for a narrower export", async () => {
  const one = await handleExportRequest(get("?koleksi=pos"), deps());
  assert.match(one.headers.get("content-disposition") ?? "", /knowledge-base-pos-/);
  assert.equal((await handleExportRequest(get("?koleksi=tidak-ada"), deps())).status, 404);
  assert.equal((await handleExportRequest(get(), deps({ count: async () => 60_001 }))).status, 413);
});
