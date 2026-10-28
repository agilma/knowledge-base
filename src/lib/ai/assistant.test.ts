/* eslint-disable @typescript-eslint/no-explicit-any -- the recorded request bodies are inspected loosely */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DocumentType, Role } from "@prisma/client";
import { type AssistantClient, type AssistantDeps, type AssistantEvent, MAX_TOOL_ROUNDS, runAssistant } from "./assistant";
import { handleAssistantRequest, type HandlerDeps } from "./handler";
import { createRateLimiter } from "./rate-limit";
import type { AssistantRequest } from "./request";

type Msg = { stop_reason: string | null; content: Record<string, unknown>[]; text?: string };

/** A client that answers each call from a script and records what it was asked. */
function fakeClient(script: Msg[]) {
  const calls: Record<string, unknown>[] = [];
  const client: AssistantClient = {
    beta: {
      messages: {
        stream(params) {
          calls.push(JSON.parse(JSON.stringify(params)));
          const msg = script[Math.min(calls.length - 1, script.length - 1)];
          return {
            async *[Symbol.asyncIterator]() {
              if (msg.text) yield { type: "content_block_delta", delta: { type: "text_delta", text: msg.text } };
            },
            finalMessage: async () => ({ stop_reason: msg.stop_reason, content: msg.content as never }),
          };
        },
      },
    },
  };
  return { client, calls };
}

const ADMIN = { id: "a1", role: Role.ADMIN };
const deps: AssistantDeps = {
  getCollections: async () => [{ slug: "pos", name: "POS" }],
  searchDocuments: async () => [
    { title: "Retur", slug: "retur", status: "PUBLISHED", collection: { name: "POS" }, excerpt: null, snippet: "..." },
  ],
  getDocument: async (slug) =>
    slug === "panjang"
      ? { title: "P", slug, status: "PUBLISHED", type: "PANDUAN", collection: { name: "POS" }, content: "x".repeat(40_000) }
      : null,
};
const request: AssistantRequest = {
  messages: [{ role: "user", content: "buat panduan retur" }],
  form: { title: "", slug: "", collectionSlug: "pos", type: DocumentType.PANDUAN, excerpt: "" },
};
const proposalInput = {
  title: "Panduan Retur",
  slug: "panduan-retur",
  collection_slug: "pos",
  type: "PANDUAN",
  excerpt: "Cara retur.",
  content: "## Langkah\n\n1. Buka nota.",
};
const propose = (input: unknown): Msg => ({
  stop_reason: "tool_use",
  content: [{ type: "tool_use", id: "t1", name: "propose_document", input }],
});

async function collect(client: AssistantClient, req = request) {
  const events: AssistantEvent[] = [];
  await runAssistant({ client, request: req, viewer: ADMIN, deps, emit: (e) => events.push(e) });
  return events;
}

test("streams text and forwards a proposal, then stops without another call", async () => {
  const { client, calls } = fakeClient([{ ...propose(proposalInput), text: "Ini usulannya." }]);
  const events = await collect(client);
  assert.deepEqual(events.map((e) => e.type), ["text", "proposal"]);
  assert.equal(calls.length, 1);
  const p = events[1] as Extract<AssistantEvent, { type: "proposal" }>;
  assert.equal(p.proposal.slug, "panduan-retur");
  assert.deepEqual(p.warnings, []);
});

test("request carries the pinned model settings, frozen system prompt and context", async () => {
  const { client, calls } = fakeClient([propose(proposalInput)]);
  await collect(client);
  const c = calls[0] as Record<string, any>;
  assert.equal(c.model, "claude-opus-5-5");
  assert.equal(c.thinking, undefined);
  assert.equal(c.tool_choice, undefined);
  assert.deepEqual(c.output_config, { effort: "medium" });
  assert.equal(c.fallbacks, "default");
  assert.equal(c.system[0].cache_control.type, "ephemeral");
  assert.ok(!c.system[0].text.includes("pos: POS"), "per-request data stays out of system");
  assert.match(c.messages[0].content, /<koleksi_tersedia>\n- pos: POS/);
  assert.match(c.messages[0].content, /<form_saat_ini>/);
  assert.ok(c.tools.every((t: any) => t.strict === true && t.eager_input_streaming === true));
  assert.deepEqual(c.tools.map((t: any) => t.name), ["list_collections", "search_documents", "read_document", "propose_document"]);
});

test("read-only tools run with the admin viewer and their results go back unchanged assistant turn first", async () => {
  const thinking = { type: "thinking", thinking: "..", signature: "sig" };
  const { client, calls } = fakeClient([
    { stop_reason: "tool_use", content: [thinking, { type: "tool_use", id: "s1", name: "search_documents", input: { query: "retur" } }] },
    propose(proposalInput),
  ]);
  const events = await collect(client);
  assert.equal(events.at(-1)?.type, "proposal");
  const second = (calls[1] as any).messages;
  assert.deepEqual(second[1].content[0], thinking);
  assert.equal(second[2].content[0].type, "tool_result");
  assert.match(second[2].content[0].content, /retur/);
});

test("a long document is cut with a visible marker", async () => {
  const { client, calls } = fakeClient([
    { stop_reason: "tool_use", content: [{ type: "tool_use", id: "r1", name: "read_document", input: { slug: "panjang" } }] },
    propose(proposalInput),
  ]);
  await collect(client);
  const result = (calls[1] as any).messages[2].content[0].content as string;
  assert.match(result, /dipotong: dokumen 40000 karakter/);
});

test("an invalid proposal is sent back to the model, not forwarded", async () => {
  const { client, calls } = fakeClient([propose({ ...proposalInput, slug: "Slug Salah!" }), propose(proposalInput)]);
  const events = await collect(client);
  assert.deepEqual(events.map((e) => e.type), ["proposal"]);
  const fed = (calls[1] as any).messages[2].content[0];
  assert.equal(fed.is_error, true);
});

test("sensitive content in a proposal is flagged", async () => {
  const { client } = fakeClient([propose({ ...proposalInput, content: "Hubungi Lala di a@b.id" })]);
  const events = await collect(client);
  const p = events[0] as Extract<AssistantEvent, { type: "proposal" }>;
  assert.ok(p.warnings.length >= 2);
});

test("refusal and truncation end the turn with a message", async () => {
  for (const stop_reason of ["refusal", "max_tokens"]) {
    const { client } = fakeClient([{ stop_reason, content: [{ type: "text", text: "x" }] }]);
    const events = await collect(client);
    assert.equal(events.at(-1)?.type, "error");
    assert.ok(!events.some((e) => e.type === "proposal"));
  }
});

test("a model that keeps calling tools is stopped", async () => {
  const loop: Msg = { stop_reason: "tool_use", content: [{ type: "tool_use", id: "l", name: "list_collections", input: {} }] };
  const { client, calls } = fakeClient([loop]);
  const events = await collect(client);
  assert.equal(calls.length, MAX_TOOL_ROUNDS);
  assert.equal(events.at(-1)?.type, "error");
});

// ---- the HTTP handler ----

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://kb.test/api/ai/document-assistant", {
    method: "POST",
    headers: { origin: "https://kb.test", host: "kb.test", "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

function handlerDeps(over: Partial<HandlerDeps> & { script?: Msg[] } = {}) {
  const fake = fakeClient(over.script ?? [propose(proposalInput)]);
  const deps_: HandlerDeps = {
    getUser: async () => ADMIN,
    createClient: () => fake.client,
    assistant: deps,
    rateLimit: createRateLimiter({ limit: 20, windowMs: 1000 }),
    ...over,
  };
  return { deps: deps_, calls: fake.calls };
}

test("handler: no session, non-admin, bad origin, wrong type never reach the model", async () => {
  const cases: [Partial<HandlerDeps>, Record<string, string>, number][] = [
    [{ getUser: async () => null }, {}, 401],
    [{ getUser: async () => ({ id: "e", role: Role.EDITOR }) }, {}, 403],
    [{ getUser: async () => ({ id: "v", role: Role.VIEWER }) }, {}, 403],
    [{}, { origin: "https://evil.test" }, 403],
    [{}, { "sec-fetch-site": "cross-site" }, 403],
    [{}, { "content-type": "text/plain" }, 415],
  ];
  for (const [over, headers, status] of cases) {
    const { deps: d, calls } = handlerDeps(over);
    const res = await handleAssistantRequest(post(request, headers), d);
    assert.equal(res.status, status);
    assert.equal(calls.length, 0);
  }
});

test("handler: missing key is a clear 503", async () => {
  const { deps: d } = handlerDeps({ createClient: () => undefined });
  const res = await handleAssistantRequest(post(request), d);
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /belum dikonfigurasi/);
});

test("handler: oversize input is refused with a message, not cut", async () => {
  const { deps: d, calls } = handlerDeps();
  const big = { ...request, messages: [{ role: "user", content: "x".repeat(20_001) }] };
  const res = await handleAssistantRequest(post(big), d);
  assert.equal(res.status, 413);
  assert.match((await res.json()).error, /Persingkat/);
  const total = {
    ...request,
    messages: Array.from({ length: 5 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "x".repeat(15_000) })),
  };
  assert.equal((await handleAssistantRequest(post(total), d)).status, 413);
  assert.equal(calls.length, 0);
});

test("handler: rate limit answers 429", async () => {
  const { deps: d } = handlerDeps({ rateLimit: createRateLimiter({ limit: 1, windowMs: 60_000 }) });
  assert.equal((await handleAssistantRequest(post(request), d)).status, 200);
  const res = await handleAssistantRequest(post(request), d);
  assert.equal(res.status, 429);
  assert.ok(res.headers.get("retry-after"));
});

test("handler: success streams SSE events ending with done, and provider errors are generic", async () => {
  const { deps: d } = handlerDeps({ script: [{ ...propose(proposalInput), text: "Halo" }] });
  const res = await handleAssistantRequest(post(request), d);
  assert.equal(res.headers.get("content-type"), "text/event-stream; charset=utf-8");
  assert.match(res.headers.get("cache-control") ?? "", /no-store/);
  const body = await res.text();
  assert.deepEqual([...body.matchAll(/^event: (\w+)/gm)].map((m) => m[1]), ["text", "proposal", "done"]);

  const failing: AssistantClient = {
    beta: { messages: { stream: () => { throw new Error("sk-ant-secret-key leaked in provider message"); } } },
  };
  const res2 = await handleAssistantRequest(post(request), handlerDeps({ createClient: () => failing }).deps);
  const body2 = await res2.text();
  assert.ok(!body2.includes("sk-ant"));
  assert.match(body2, /event: error/);
  assert.match(body2, /event: done/);
});
