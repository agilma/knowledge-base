/**
 * Words that mean the same thing to the people who search here (staff mix Indonesian and the
 * English names that show up in the POS screens). A search for any word of a group also finds
 * documents written with the others. Edit the list; everything is lower-case, one word each.
 */
const GROUPS: string[][] = [
  ["kasir", "cashier"],
  ["retur", "return", "refund"],
  ["struk", "receipt", "nota"],
  ["diskon", "discount", "potongan"],
  ["harga", "price"],
  ["laporan", "report"],
  ["pembayaran", "payment", "bayar"],
  ["stok", "stock", "persediaan"],
  ["pelanggan", "customer", "konsumen"],
  ["cetak", "print"],
  ["hapus", "delete"],
  ["gagal", "error"],
  ["lambat", "lemot", "slow"],
  ["toko", "store", "outlet", "cabang"],
  ["pesanan", "order"],
  ["pembelian", "purchase"],
  ["penjualan", "sales"],
];

const BY_WORD = new Map<string, string[]>();
for (const group of GROUPS) {
  for (const word of group) BY_WORD.set(word, group);
}

/** The word itself first, then its synonyms. A word with none comes back alone. */
export function synonymsOf(word: string): string[] {
  const group = BY_WORD.get(word.toLowerCase());
  if (!group) return [word];
  return [word, ...group.filter((other) => other !== word.toLowerCase())];
}
