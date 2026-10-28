import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";
import { crc32, ZipWriter } from "./zip";

function build(files: [string, string][]): Uint8Array {
  const zip = new ZipWriter();
  const parts = files.map(([name, text]) => zip.add(name, new TextEncoder().encode(text), new Date("2026-10-28T10:20:30Z")));
  parts.push(zip.finish());
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** A minimal reader: finds the end record, walks the central directory, inflates each entry and checks its checksum. */
function read(zip: Uint8Array): Map<string, string> {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const end = zip.length - 22;
  assert.equal(view.getUint32(end, true), 0x06054b50, "end of central directory");
  const count = view.getUint16(end + 10, true);
  let p = view.getUint32(end + 16, true);
  const files = new Map<string, string>();
  for (let i = 0; i < count; i++) {
    assert.equal(view.getUint32(p, true), 0x02014b50);
    const crc = view.getUint32(p + 16, true);
    const compressed = view.getUint32(p + 20, true);
    const size = view.getUint32(p + 24, true);
    const nameLength = view.getUint16(p + 28, true);
    const local = view.getUint32(p + 42, true);
    const name = new TextDecoder().decode(zip.subarray(p + 46, p + 46 + nameLength));
    const localNameLength = view.getUint16(local + 26, true);
    const start = local + 30 + localNameLength + view.getUint16(local + 28, true);
    const data = inflateRawSync(zip.subarray(start, start + compressed));
    assert.equal(data.length, size, `${name}: size`);
    assert.equal(crc32(data), crc, `${name}: crc`);
    files.set(name, new TextDecoder().decode(data));
    p += 46 + nameLength + view.getUint16(p + 30, true) + view.getUint16(p + 32, true);
  }
  return files;
}

test("crc32 matches the standard check value", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  assert.equal(crc32(new Uint8Array()), 0);
});

test("entries come back intact, including empty files and non-ASCII names", () => {
  const input: [string, string][] = [
    ["README.txt", "Halo"],
    ["koleksi-satu/panduan-retur.md", "## Langkah\n\n1. Buka nota.\n"],
    ["koleksi-satu/üñï-日本語.md", "isi dengan emoji 😀 dan 日本語"],
    ["kosong.md", ""],
    ["besar.md", "baris yang diulang\n".repeat(50_000)],
  ];
  const files = read(build(input));
  assert.deepEqual([...files.keys()], input.map(([n]) => n));
  for (const [name, text] of input) assert.equal(files.get(name), text, name);
});

test("an archive with no entries is still a valid archive", () => {
  assert.equal(read(build([])).size, 0);
});

test("the system unzip accepts the archive (when it is installed)", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "kbzip-"));
  try {
    const file = join(dir, "t.zip");
    writeFileSync(file, build([["a/b.md", "isi"], ["c.md", "x".repeat(1000)]]));
    try {
      execFileSync("unzip", ["-tq", file], { stdio: "pipe" });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return t.skip("unzip is not installed");
      throw err;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
