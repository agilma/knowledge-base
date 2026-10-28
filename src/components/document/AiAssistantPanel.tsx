"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useOnlineStatus } from "@/lib/use-online-status";
import { LIMITS, TOO_LONG_MESSAGE, type FormContext, type Proposal } from "@/lib/ai/request";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  proposal?: Proposal;
  warnings?: string[];
  /** What happened when the proposal was applied, or null while it has not been. */
  applied?: string[] | null;
  error?: string;
  ignored?: boolean;
}

interface AiAssistantPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The form as it is now, read when a message is sent. */
  getForm: () => FormContext;
  /** True when applying would overwrite something the author wrote. */
  formHasContent: () => boolean;
  /** Puts the proposal into the form; returns notes about what was left alone. */
  onApply: (proposal: Proposal) => string[];
}

/** What the model sees of an earlier turn: its words plus the proposal it made, so "perpendek" has something to work on. */
function historyText(m: ChatMessage, withProposal: boolean): string {
  if (!m.proposal || !withProposal) return m.text;
  return `${m.text}\n\n[Usulan dokumen yang sudah dikirim]\n${JSON.stringify(m.proposal)}`.trim();
}

async function* readEvents(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let end: number;
    while ((end = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const event = /^event: (.+)$/m.exec(block)?.[1];
      const data = /^data: (.+)$/m.exec(block)?.[1];
      if (event && data) yield { event, data: JSON.parse(data) as Record<string, unknown> };
    }
  }
}

export function AiAssistantPanel({ open, onOpenChange, getForm, formHasContent, onApply }: AiAssistantPanelProps) {
  const isOnline = useOnlineStatus();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  // Closing the panel stops the request: nobody is reading the answer, and it costs money.
  useEffect(() => {
    if (!open) abortRef.current?.abort();
  }, [open]);

  // A newer proposal replaces older ones: applying a stale one by mistake would undo the revision.
  const lastProposalIndex = messages.map((m) => !!m.proposal || !!m.ignored).lastIndexOf(true);

  const patchLast = (patch: (m: ChatMessage) => ChatMessage) =>
    setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? patch(m) : m)));

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const form = getForm();
    // Only the newest proposal goes back: older ones are superseded and would eat the size budget.
    const history = messages
      .map((m, i) => ({ m, withProposal: i === lastProposalIndex && !m.ignored }))
      .filter(({ m, withProposal }) => m.role === "user" || m.text || (m.proposal && withProposal))
      .map(({ m, withProposal }) => ({ role: m.role, content: historyText(m, withProposal) }));
    const outgoing = [...history, { role: "user" as const, content: text }];
    const total = outgoing.reduce((n, m) => n + m.content.length, 0);
    if (
      text.length > LIMITS.messageChars ||
      total > LIMITS.totalChars ||
      outgoing.length > LIMITS.turns ||
      (form.content?.length ?? 0) > LIMITS.formContentChars
    ) {
      setMessages((prev) => [...prev, { role: "assistant", text: "", error: TOO_LONG_MESSAGE }]);
      return;
    }

    setInput("");
    setBusy(true);
    setMessages((prev) => [...prev, { role: "user", text }, { role: "assistant", text: "" }]);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/ai/document-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: outgoing, form }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const message = ((await res.json().catch(() => null)) as { error?: string } | null)?.error;
        patchLast((m) => ({ ...m, error: message ?? "Asisten AI tidak bisa dihubungi." }));
        return;
      }
      // An expired session is redirected to the login page, which arrives as a 200 HTML page.
      if (!res.headers.get("content-type")?.includes("text/event-stream")) {
        patchLast((m) => ({ ...m, error: "Sesi Anda mungkin sudah berakhir. Muat ulang halaman dan masuk lagi." }));
        return;
      }
      let finished = false;
      for await (const { event, data } of readEvents(res.body)) {
        if (event === "text") patchLast((m) => ({ ...m, text: m.text + String(data.text) }));
        else if (event === "proposal")
          patchLast((m) => ({ ...m, proposal: data.proposal as Proposal, warnings: data.warnings as string[], applied: null }));
        else if (event === "error") patchLast((m) => ({ ...m, error: String(data.message) }));
        else if (event === "done") finished = true;
      }
      if (!finished && !controller.signal.aborted) {
        patchLast((m) => ({ ...m, error: "Jawaban terputus sebelum selesai. Coba kirim lagi." }));
      }
    } catch {
      if (!controller.signal.aborted) {
        patchLast((m) => ({ ...m, error: "Koneksi terputus sebelum jawaban selesai. Coba kirim lagi." }));
      }
    } finally {
      setBusy(false);
    }
  }

  function apply(index: number) {
    const proposal = messages[index].proposal;
    if (!proposal) return;
    const notes = onApply(proposal);
    setConfirming(null);
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, applied: notes } : m)));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="data-[side=right]:w-full data-[side=right]:sm:max-w-lg gap-0 p-0">
        <SheetHeader className="border-b p-4 pr-12">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-4" /> Asisten AI
          </SheetTitle>
          <SheetDescription>
            Tempel bahan atau tulis perintah. Hasilnya hanya usulan: Anda yang memeriksa, menerapkan ke form, lalu menyimpan.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4" aria-live="polite">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Contoh: &ldquo;Buat panduan dari catatan ini&rdquo; lalu tempel catatannya. Teks yang dikirim diproses oleh Anthropic API.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "space-y-2"}>
              {m.role === "user" ? (
                <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm">
                  {m.text}
                </div>
              ) : (
                <>
                  {m.text && <div className="whitespace-pre-wrap break-words text-sm">{m.text}</div>}
                  {busy && i === messages.length - 1 && !m.text && !m.proposal && !m.error && (
                    <p className="text-sm text-muted-foreground">Sedang berpikir…</p>
                  )}
                  {m.error && (
                    <p role="alert" className="text-sm text-destructive">
                      {m.error}
                    </p>
                  )}
                  {m.ignored && <p className="text-xs text-muted-foreground">Usulan diabaikan.</p>}
                  {m.proposal && (
                    <div className="rounded-lg border p-3 space-y-2 text-sm">
                      <p className="font-medium break-words">{m.proposal.title}</p>
                      <p className="text-xs text-muted-foreground break-words">
                        {m.proposal.collection_slug} · {m.proposal.type} · {m.proposal.slug}
                      </p>
                      {m.proposal.excerpt && <p className="break-words">{m.proposal.excerpt}</p>}
                      <details>
                        <summary className="cursor-pointer text-xs text-muted-foreground">Lihat isi ({m.proposal.content.length} karakter)</summary>
                        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2 text-xs">{m.proposal.content}</pre>
                      </details>
                      {m.warnings && m.warnings.length > 0 && (
                        <div className="flex gap-2 rounded bg-amber-500/10 p-2 text-xs text-amber-900 dark:text-amber-200">
                          <TriangleAlert className="size-4 shrink-0" />
                          <span>Periksa sebelum diterapkan, usulan memuat: {m.warnings.join("; ")}.</span>
                        </div>
                      )}
                      {m.applied ? (
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Sudah diterapkan ke form. Periksa lalu simpan seperti biasa.</p>
                          {m.applied.map((n) => (
                            <p key={n}>{n}</p>
                          ))}
                        </div>
                      ) : i !== lastProposalIndex ? (
                        <p className="text-xs text-muted-foreground">Digantikan usulan yang lebih baru.</p>
                      ) : confirming === i ? (
                        <div className="space-y-2">
                          <p className="text-xs">Isi form saat ini akan diganti. Lanjutkan?</p>
                          <div className="flex gap-2">
                            <Button type="button" size="sm" onClick={() => apply(i)}>
                              Ya, ganti
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(null)}>
                              Batal
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button type="button" size="sm" onClick={() => (formHasContent() ? setConfirming(i) : apply(i))}>
                            Terapkan ke form
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setMessages((prev) => prev.map((x, j) => (j === i ? { ...x, proposal: undefined, warnings: undefined, ignored: true } : x)))}
                          >
                            Abaikan
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="border-t p-3 space-y-2">
          {!isOnline && <p className="text-xs text-destructive">Anda sedang offline. Asisten AI butuh koneksi.</p>}
          <Textarea
            aria-label="Pesan untuk asisten AI"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tempel bahan atau tulis perintah…"
            className="min-h-[88px] max-h-48"
          />
          <div className="flex justify-end gap-2">
            {!busy && messages.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => { setMessages([]); setConfirming(null); }}>
                Percakapan baru
              </Button>
            )}
            {busy && (
              <Button type="button" variant="outline" size="sm" onClick={() => abortRef.current?.abort()}>
                Berhenti
              </Button>
            )}
            <Button type="button" size="sm" onClick={send} disabled={busy || !input.trim() || !isOnline}>
              Kirim
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
