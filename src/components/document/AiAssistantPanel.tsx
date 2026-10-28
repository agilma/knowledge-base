"use client";

import { useEffect, useRef, useState } from "react";
import { History, MessageSquarePlus, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useOnlineStatus } from "@/lib/use-online-status";
import { LIMITS, TOO_LONG_MESSAGE, type FormContext, type Proposal } from "@/lib/ai/request";
import { RETENTION_DAYS } from "@/lib/ai/retention";
import { formatDate } from "@/lib/format";

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
  /** The document being edited, if any; kept only as context in the history list. */
  documentId?: string;
  /** The form as it is now, read when a message is sent. */
  getForm: () => FormContext;
  /** True when applying would overwrite something the author wrote. */
  formHasContent: () => boolean;
  /** Puts the proposal into the form; returns notes about what was left alone. */
  onApply: (proposal: Proposal) => string[];
}

interface HistoryItem {
  id: string;
  title: string;
  updatedAt: string;
}

const API = "/api/ai/conversations";

async function readError(res: Response, fallback: string): Promise<string> {
  return ((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? fallback;
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

export function AiAssistantPanel({ open, onOpenChange, documentId, getForm, formHasContent, onApply }: AiAssistantPanelProps) {
  const isOnline = useOnlineStatus();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [history, setHistory] = useState<{ items: HistoryItem[] | null; error?: string }>({ items: null });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Only the newest "open this chat" may show: a slow answer for an earlier click must not win.
  const openSeq = useRef(0);
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
    if (text.length > LIMITS.messageChars || (form.content?.length ?? 0) > LIMITS.formContentChars) {
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
        body: JSON.stringify({ conversationId: conversationId ?? undefined, documentId, message: text, form }),
        signal: controller.signal,
      });
      if (res.status === 404 && conversationId) {
        // The chat was deleted elsewhere or has expired: carry on as a new one instead of failing every send.
        setConversationId(null);
        patchLast((m) => ({ ...m, error: "Percakapan ini sudah tidak ada. Pesan Anda belum terkirim; kirim lagi untuk memulai percakapan baru." }));
        return;
      }
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
        if (event === "conversation") setConversationId(String(data.id));
        else if (event === "text") patchLast((m) => ({ ...m, text: m.text + String(data.text) }));
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

  function startNew() {
    openSeq.current++;
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setConfirming(null);
    setNotice(null);
    setView("chat");
  }

  async function showHistory() {
    setView("history");
    setHistory({ items: null });
    try {
      const res = await fetch(`${API}?assistant=document`);
      if (!res.ok) return setHistory({ items: [], error: await readError(res, "Riwayat tidak bisa dimuat.") });
      setHistory({ items: ((await res.json()) as { conversations: HistoryItem[] }).conversations });
    } catch {
      setHistory({ items: [], error: "Riwayat tidak bisa dimuat. Periksa koneksi Anda." });
    }
  }

  async function openConversation(id: string) {
    abortRef.current?.abort();
    setNotice(null);
    const mine = ++openSeq.current;
    try {
      const res = await fetch(`${API}/${encodeURIComponent(id)}`);
      if (mine !== openSeq.current) return;
      if (!res.ok) return setNotice(await readError(res, "Percakapan tidak bisa dibuka."));
      const { conversation } = (await res.json()) as {
        conversation: { id: string; messages: { role: "user" | "assistant"; content: string; proposal?: Proposal; warnings?: string[]; error?: string }[] };
      };
      if (mine !== openSeq.current) return;
      setMessages(
        conversation.messages.map((m) => ({
          role: m.role,
          text: m.content,
          proposal: m.proposal ?? undefined,
          warnings: m.warnings,
          applied: m.proposal ? null : undefined,
          error: m.error,
        })),
      );
      setConversationId(conversation.id);
      setConfirming(null);
      setView("chat");
    } catch {
      setNotice("Percakapan tidak bisa dibuka. Periksa koneksi Anda.");
    }
  }

  async function removeConversation(id: string) {
    setNotice(null);
    try {
      const res = await fetch(`${API}/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) return setNotice(await readError(res, "Percakapan tidak bisa dihapus."));
      setHistory((h) => ({ ...h, items: h.items?.filter((x) => x.id !== id) ?? null }));
      if (id === conversationId) {
        abortRef.current?.abort();
        setMessages([]);
        setConversationId(null);
      }
    } catch {
      setNotice("Percakapan tidak bisa dihapus. Periksa koneksi Anda.");
    } finally {
      setDeleting(null);
    }
  }

  function ignoreProposal(index: number) {
    setMessages((prev) => prev.map((x, j) => (j === index ? { ...x, proposal: undefined, warnings: undefined, ignored: true } : x)));
    // Remembered on the server too, so the model is not sent it again and it does not come back from Riwayat.
    if (conversationId) {
      void fetch(`${API}/${encodeURIComponent(conversationId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dropProposal: true }),
      }).catch(() => undefined);
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

        <div className="flex items-center gap-2 border-b px-4 py-2">
          <Button type="button" variant={view === "history" ? "default" : "outline"} size="sm" aria-pressed={view === "history"} onClick={() => (view === "history" ? setView("chat") : showHistory())}>
            <History className="mr-1.5 size-3.5" />
            Riwayat
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={startNew} disabled={messages.length === 0 && view === "chat"}>
            <MessageSquarePlus className="mr-1.5 size-3.5" />
            Percakapan baru
          </Button>
        </div>
        {notice && (
          <p role="alert" className="px-4 pt-2 text-sm text-destructive">
            {notice}
          </p>
        )}

        {view === "history" ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-2" aria-live="polite">
            <p className="text-xs text-muted-foreground">
              Riwayat disimpan {RETENTION_DAYS} hari sejak pesan terakhir dan hanya terlihat oleh Anda.
            </p>
            {history.items === null && <p className="text-sm text-muted-foreground">Memuat…</p>}
            {history.error && (
              <p role="alert" className="text-sm text-destructive">
                {history.error}
              </p>
            )}
            {history.items?.length === 0 && !history.error && <p className="text-sm text-muted-foreground">Belum ada riwayat percakapan.</p>}
            {history.items?.map((item) => (
              <div key={item.id} className="flex items-stretch gap-2 rounded-lg border">
                <button type="button" onClick={() => openConversation(item.id)} className="min-w-0 flex-1 rounded-l-lg p-3 text-left hover:bg-muted">
                  <span className="block truncate text-sm font-medium">{item.title}</span>
                  <span className="block text-xs text-muted-foreground">{formatDate(item.updatedAt)}</span>
                </button>
                {deleting === item.id ? (
                  <div className="flex items-center gap-1 pr-2">
                    <Button type="button" size="sm" variant="destructive" aria-label={`Hapus percakapan ${item.title} sekarang`} onClick={() => removeConversation(item.id)}>
                      Hapus
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setDeleting(null)}>
                      Batal
                    </Button>
                  </div>
                ) : (
                  <Button type="button" size="icon-sm" variant="ghost" className="my-auto mr-2" aria-label={`Hapus percakapan ${item.title}`} onClick={() => setDeleting(item.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4" aria-live="polite">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Contoh: &ldquo;Buat panduan dari catatan ini&rdquo; lalu tempel catatannya. Teks yang dikirim diproses oleh Anthropic API.
              Percakapan disimpan {RETENTION_DAYS} hari dan hanya terlihat oleh Anda; lihat lagi lewat Riwayat.
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
                            onClick={() => ignoreProposal(i)}
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
        )}

        {view === "chat" && (
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
        )}
      </SheetContent>
    </Sheet>
  );
}
