import { deflateRawSync } from "node:zlib";

/**
 * A small ZIP writer (deflate, no ZIP64) so an export needs no dependency and can be
 * produced a piece at a time: `add` returns the bytes of one entry, `finish` the
 * directory that closes the archive. Names are written as UTF-8.
 */
const MAX_ENTRIES = 65_535;
const MAX_BYTES = 0xffff_ffff;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(1980, date.getUTCFullYear());
  return {
    time: (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | (date.getUTCSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate(),
  };
}

interface Entry {
  name: Uint8Array;
  crc: number;
  compressed: number;
  size: number;
  offset: number;
  time: number;
  date: number;
}

export class ZipWriter {
  private offset = 0;
  private readonly entries: Entry[] = [];

  /** The bytes of one file entry (local header and compressed data), to be sent in order. */
  add(name: string, data: Uint8Array, modified: Date = new Date()): Uint8Array {
    if (this.entries.length >= MAX_ENTRIES) throw new Error("Terlalu banyak berkas untuk satu zip");
    const nameBytes = new TextEncoder().encode(name);
    const packed = deflateRawSync(data);
    const { time, date } = dosDateTime(modified);
    const entry: Entry = { name: nameBytes, crc: crc32(data), compressed: packed.length, size: data.length, offset: this.offset, time, date };

    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true); // version needed
    view.setUint16(6, 0x0800, true); // UTF-8 names
    view.setUint16(8, 8, true); // deflate
    view.setUint16(10, time, true);
    view.setUint16(12, date, true);
    view.setUint32(14, entry.crc, true);
    view.setUint32(18, entry.compressed, true);
    view.setUint32(22, entry.size, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);
    header.set(nameBytes, 30);

    const out = new Uint8Array(header.length + packed.length);
    out.set(header, 0);
    out.set(packed, header.length);
    this.offset += out.length;
    if (this.offset > MAX_BYTES) throw new Error("Zip terlalu besar");
    this.entries.push(entry);
    return out;
  }

  /** The central directory and end record; nothing may be added after this. */
  finish(): Uint8Array {
    const directorySize = this.entries.reduce((n, e) => n + 46 + e.name.length, 0);
    const out = new Uint8Array(directorySize + 22);
    const view = new DataView(out.buffer);
    let p = 0;
    for (const e of this.entries) {
      view.setUint32(p, 0x02014b50, true);
      view.setUint16(p + 4, 20, true); // made by
      view.setUint16(p + 6, 20, true); // needed
      view.setUint16(p + 8, 0x0800, true);
      view.setUint16(p + 10, 8, true);
      view.setUint16(p + 12, e.time, true);
      view.setUint16(p + 14, e.date, true);
      view.setUint32(p + 16, e.crc, true);
      view.setUint32(p + 20, e.compressed, true);
      view.setUint32(p + 24, e.size, true);
      view.setUint16(p + 28, e.name.length, true);
      view.setUint32(p + 42, e.offset, true);
      out.set(e.name, p + 46);
      p += 46 + e.name.length;
    }
    view.setUint32(p, 0x06054b50, true);
    view.setUint16(p + 8, this.entries.length, true);
    view.setUint16(p + 10, this.entries.length, true);
    view.setUint32(p + 12, directorySize, true);
    view.setUint32(p + 16, this.offset, true);
    return out;
  }
}
