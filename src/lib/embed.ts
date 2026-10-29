/**
 * "Sematan": a Canva, YouTube, Google Slides or Figma link shown inside a document as a frame. The
 * author writes the link as the text of a fenced block, so it stays plain Markdown:
 *
 *   ```sematan
 *   https://www.canva.com/design/DAF.../abc123/view
 *   Lembar SOP kasir (baris kedua, boleh kosong)
 *   ```
 *
 * Only these four providers are accepted, and nothing the author typed is put in the page as it is:
 * the frame address and the link under it are built again from the parts that passed a check (an id
 * of the right shape on the right host), so a lookalike host, a script address or a stray
 * parameter cannot reach `src` or `href`. Pure, so every rule below is tested without a browser.
 */
export type EmbedProvider = "youtube" | "slides" | "canva" | "figma";

export interface Embed {
  provider: EmbedProvider;
  /** "YouTube", "Google Slides", ... for the label and the link text. */
  label: string;
  /** What the frame loads: built here, never the author's text. */
  src: string;
  /** The page itself, for "Buka di ...": built here too. */
  openUrl: string;
  /** The author's caption (second line), plain text, or "". */
  caption: string;
  /** Width over height of the frame. */
  ratio: number;
}

export const EMBED_LABELS: Record<EmbedProvider, string> = {
  youtube: "YouTube",
  slides: "Google Slides",
  canva: "Canva",
  figma: "Figma",
};

/** Hosts the frames come from; `next.config.ts` allows exactly these in `frame-src`. */
export const EMBED_FRAME_HOSTS = ["https://www.youtube-nocookie.com", "https://docs.google.com", "https://www.canva.com", "https://www.figma.com"] as const;

const MAX_URL = 600;
const MAX_CAPTION = 120;
/** Control characters, zero-width and direction-changing marks, line separators: they only hide or reorder text. */
const CONTROL_OR_HIDDEN = new RegExp("[\\u0000-\\u001F\\u007F\\u200B-\\u200F\\u2028-\\u202E\\u2066-\\u2069\\uFEFF]", "g");

function parseUrl(text: string): URL | null {
  if (text.length === 0 || text.length > MAX_URL || /\s/.test(text)) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  // https only, and no user, password or port: they are how a link is made to look like another host
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  return url;
}

const hostIs = (url: URL, ...hosts: string[]) => hosts.includes(url.hostname.toLowerCase());
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** Seconds from `t=90`, `t=90s`, `t=1m30s` or `start=90`; 0 when absent or odd. */
function startSeconds(url: URL): number {
  const raw = url.searchParams.get("t") ?? url.searchParams.get("start") ?? "";
  const m = /^(?:(\d{1,2})h)?(?:(\d{1,2})m)?(?:(\d{1,5})s?)?$/.exec(raw);
  if (!m || raw === "") return 0;
  const seconds = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return seconds > 0 && seconds < 86400 ? seconds : 0;
}

function youtube(url: URL): Pick<Embed, "provider" | "src" | "openUrl" | "ratio"> | null {
  let id: string | null = null;
  if (hostIs(url, "youtu.be")) {
    id = url.pathname.split("/")[1] ?? null;
  } else if (hostIs(url, "youtube.com", "www.youtube.com", "m.youtube.com")) {
    const [, kind, second] = url.pathname.split("/");
    if (kind === "watch") id = url.searchParams.get("v");
    else if (kind === "embed" || kind === "shorts" || kind === "live") id = second ?? null;
  }
  // "videoseries" and "live_stream" have the shape of an id but are playlist and channel players that need
  // parameters this does not carry: a broken frame, so they are refused
  if (!id || !YOUTUBE_ID.test(id) || id === "videoseries" || id === "live_stream") return null;
  const start = startSeconds(url);
  const startParam = start ? `&start=${start}` : "";
  return {
    provider: "youtube",
    src: `https://www.youtube-nocookie.com/embed/${id}?rel=0${startParam}`,
    openUrl: `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}` : ""}`,
    ratio: 16 / 9,
  };
}

function slides(url: URL): Pick<Embed, "provider" | "src" | "openUrl" | "ratio"> | null {
  if (!hostIs(url, "docs.google.com")) return null;
  // /presentation/d/<id>/... or, for a published one, /presentation/d/e/<id>/...
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "presentation" || parts[1] !== "d") return null;
  const published = parts[2] === "e";
  const id = published ? parts[3] : parts[2];
  if (!id || !/^[A-Za-z0-9_-]{20,120}$/.test(id)) return null;
  const base = `https://docs.google.com/presentation/d/${published ? "e/" : ""}${id}`;
  return { provider: "slides", src: `${base}/embed?start=false&loop=false&delayms=3000`, openUrl: published ? `${base}/pub` : `${base}/edit`, ratio: 16 / 9 };
}

function canva(url: URL): Pick<Embed, "provider" | "src" | "openUrl" | "ratio"> | null {
  if (!hostIs(url, "www.canva.com", "canva.com")) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "design") return null;
  const [, id, token, tail] = parts;
  if (!id || !token || !/^[A-Za-z0-9_-]{8,24}$/.test(id) || !/^[A-Za-z0-9_-]{8,48}$/.test(token)) return null;
  if (tail !== undefined && !["view", "edit", "watch"].includes(tail)) return null;
  const base = `https://www.canva.com/design/${id}/${token}`;
  return { provider: "canva", src: `${base}/view?embed`, openUrl: `${base}/view`, ratio: 16 / 9 };
}

function figma(url: URL): Pick<Embed, "provider" | "src" | "openUrl" | "ratio"> | null {
  if (!hostIs(url, "www.figma.com", "figma.com")) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (!["file", "design", "proto", "board", "slides"].includes(parts[0] ?? "") || parts.length < 2 || parts.length > 4) return null;
  if (!parts.slice(1).every((part) => /^[A-Za-z0-9_%.~-]{1,120}$/.test(part))) return null;
  const node = url.searchParams.get("node-id");
  const nodeParam = node && /^[0-9A-Za-z%:_-]{1,40}$/.test(node) ? `?node-id=${encodeURIComponent(node)}` : "";
  const canonical = `https://www.figma.com/${parts.join("/")}${nodeParam}`;
  return { provider: "figma", src: `https://www.figma.com/embed?embed_host=kb&url=${encodeURIComponent(canonical)}`, openUrl: canonical, ratio: 16 / 10 };
}

/** The embed for the text of a ```sematan block, or null when it is not a link to one of the four. */
export function parseEmbed(text: string): Embed | null {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").map((line) => line.trim());
  const first = lines.findIndex((line) => line !== "");
  if (first === -1) return null;
  const url = parseUrl(lines[first]);
  if (!url) return null;
  const found = youtube(url) ?? slides(url) ?? canva(url) ?? figma(url);
  if (!found) return null;
  // the caption: the next line, as plain text without control characters
  const caption = (lines[first + 1] ?? "").replace(CONTROL_OR_HIDDEN, "").slice(0, MAX_CAPTION).trim();
  return { ...found, label: EMBED_LABELS[found.provider], caption };
}
