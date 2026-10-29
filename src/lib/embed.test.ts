import { test } from "node:test";
import assert from "node:assert/strict";
import { EMBED_FRAME_HOSTS, parseEmbed } from "./embed";

const YT = "dQw4w9WgXcQ";
const SLIDES = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";

test("YouTube links in every common form become a no-cookie frame, with the start time kept", () => {
  for (const url of [`https://www.youtube.com/watch?v=${YT}`, `https://youtu.be/${YT}`, `https://m.youtube.com/watch?v=${YT}&feature=share`, `https://www.youtube.com/embed/${YT}`, `https://www.youtube.com/shorts/${YT}`, `https://youtube.com/live/${YT}`]) {
    const e = parseEmbed(url);
    assert.equal(e?.provider, "youtube", url);
    assert.equal(e?.src, `https://www.youtube-nocookie.com/embed/${YT}?rel=0`, url);
    assert.equal(e?.openUrl, `https://www.youtube.com/watch?v=${YT}`, url);
  }
  assert.equal(parseEmbed(`https://youtu.be/${YT}?t=1m30s`)?.src, `https://www.youtube-nocookie.com/embed/${YT}?rel=0&start=90`);
  assert.equal(parseEmbed(`https://youtu.be/${YT}?t=abc`)?.src, `https://www.youtube-nocookie.com/embed/${YT}?rel=0`);
});

test("Google Slides, plain and published", () => {
  const plain = parseEmbed(`https://docs.google.com/presentation/d/${SLIDES}/edit?usp=sharing`);
  assert.equal(plain?.src, `https://docs.google.com/presentation/d/${SLIDES}/embed?start=false&loop=false&delayms=3000`);
  assert.equal(plain?.openUrl, `https://docs.google.com/presentation/d/${SLIDES}/edit`);
  const pub = parseEmbed(`https://docs.google.com/presentation/d/e/2PACX-1vAbCdEfGhIjKlMnOpQrS/pub?start=true`);
  assert.equal(pub?.src, "https://docs.google.com/presentation/d/e/2PACX-1vAbCdEfGhIjKlMnOpQrS/embed?start=false&loop=false&delayms=3000");
  assert.equal(parseEmbed("https://docs.google.com/document/d/" + SLIDES + "/edit"), null, "a Google Doc is not a presentation");
  assert.equal(parseEmbed("https://docs.google.com/presentation/d/short/edit"), null);
});

test("Canva designs, with or without the trailing word", () => {
  const e = parseEmbed("https://www.canva.com/design/DAGabc12345/xYz_-AbCdEf1234/view?utm_content=x&utm_source=link");
  assert.equal(e?.src, "https://www.canva.com/design/DAGabc12345/xYz_-AbCdEf1234/view?embed");
  assert.equal(e?.openUrl, "https://www.canva.com/design/DAGabc12345/xYz_-AbCdEf1234/view");
  assert.equal(parseEmbed("https://canva.com/design/DAGabc12345/xYz_-AbCdEf1234/edit")?.provider, "canva");
  assert.equal(parseEmbed("https://www.canva.com/design/DAGabc12345/xYz_-AbCdEf1234")?.provider, "canva");
  assert.equal(parseEmbed("https://www.canva.com/design/DAGabc12345/xYz_-AbCdEf1234/delete"), null);
  assert.equal(parseEmbed("https://www.canva.com/login"), null);
});

test("Figma files and prototypes, the node kept, the address rebuilt", () => {
  const e = parseEmbed("https://www.figma.com/design/AbC123xyz/Nama-File?node-id=12-34&t=zzz");
  assert.equal(e?.openUrl, "https://www.figma.com/design/AbC123xyz/Nama-File?node-id=12-34");
  assert.equal(e?.src, `https://www.figma.com/embed?embed_host=kb&url=${encodeURIComponent("https://www.figma.com/design/AbC123xyz/Nama-File?node-id=12-34")}`);
  assert.equal(parseEmbed("https://figma.com/proto/AbC123/Nama")?.provider, "figma");
  assert.equal(parseEmbed("https://www.figma.com/community/file/1"), null);
  assert.equal(parseEmbed("https://www.figma.com/design/AbC/x?node-id=%3Cscript%3E")?.openUrl, "https://www.figma.com/design/AbC/x", "a odd node id is dropped");
});

test("anything else is refused: other hosts, lookalikes, other schemes, credentials, ports, junk", () => {
  const bad = [
    "https://evil.example/watch?v=" + YT,
    `https://youtube.com.evil.example/watch?v=${YT}`,
    `https://notyoutube.com/watch?v=${YT}`,
    `https://www.youtube.com@evil.example/watch?v=${YT}`,
    `https://user:pass@www.youtube.com/watch?v=${YT}`,
    `https://www.youtube.com:8443/watch?v=${YT}`,
    `http://www.youtube.com/watch?v=${YT}`,
    `javascript:alert(1)//www.youtube.com/watch?v=${YT}`,
    `data:text/html,<script>alert(1)</script>`,
    `//www.youtube.com/watch?v=${YT}`,
    `www.youtube.com/watch?v=${YT}`,
    `https://www.youtube.com/watch?v=short`,
    `https://www.youtube.com/watch?v=${YT}x`,
    `https://www.youtube.com/watch?v=${YT} onload=alert(1)`,
    "https://" + "a".repeat(700) + ".com/",
    "",
    "   \n  ",
    "Tempel tautan di sini",
  ];
  for (const text of bad) assert.equal(parseEmbed(text), null, JSON.stringify(text).slice(0, 80));
});

test("the frame and the link are always built, never copied: they start with a known address", () => {
  const samples = [`https://youtu.be/${YT}`, `https://docs.google.com/presentation/d/${SLIDES}/edit`, "https://www.canva.com/design/DAGabc12345/xYz_-AbCdEf1234/view", "https://www.figma.com/design/AbC123xyz/Nama"];
  for (const text of samples) {
    const e = parseEmbed(text)!;
    assert.ok(EMBED_FRAME_HOSTS.some((host) => e.src.startsWith(host + "/")), e.src);
    assert.ok(/^https:\/\/(www\.youtube\.com|docs\.google\.com|www\.canva\.com|www\.figma\.com)\//.test(e.openUrl), e.openUrl);
    assert.ok(!/["'<>\s]/.test(e.src + e.openUrl), "no characters that could leave an attribute");
  }
});

test("the caption is the next line, plain text, cleaned and bounded", () => {
  assert.equal(parseEmbed(`https://youtu.be/${YT}\n  Cara closing kasir  `)?.caption, "Cara closing kasir");
  assert.equal(parseEmbed(`\n\nhttps://youtu.be/${YT}\n   \n`)?.caption, "", "a blank second line is no caption");
  assert.equal(parseEmbed(`https://youtu.be/${YT}\nbalik\u202E\u200Bteks`)?.caption, "balikteks");
  assert.equal(parseEmbed(`https://youtu.be/${YT}\n${"x".repeat(500)}`)?.caption.length, 120);
  assert.equal(parseEmbed(`https://youtu.be/${YT}`)?.caption, "");
});
