/**
 * What the draft pipeline keeps out of documents (see draft-import.test.ts):
 * contact details, links, credentials and the names of colleagues. The
 * assistant is told the same, but a model can slip, so a proposal is scanned
 * and the admin sees the findings before applying it.
 */
const PERSON_NAMES = [
  "vera", "arika", "intan", "ronny", "erick", "marcel", "yulianta", "risma", "lala", "agil",
  "chelsy", "yohana", "eko", "hizban", "bayu", "shandy", "ilham", "ervin", "susan", "firman",
  "amel", "maulina", "clara", "desy", "firgi", "dorothea", "devita", "donna", "kadek", "arlene",
];

const CHECKS: { label: string; test: (text: string) => boolean }[] = [
  { label: "alamat email", test: (t) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(t) },
  { label: "tautan", test: (t) => /\bhttps?:\/\/|\bwww\./i.test(t) },
  { label: "nomor panjang (telepon, rekening, atau kunci)", test: (t) => /\d[\d\s-]{8,}\d/.test(t) },
  {
    label: "kata yang menyiratkan kredensial (password, kata sandi, token)",
    test: (t) => /\b(password|passwd|kata\s*sandi|token|api[\s_-]?key)\b/i.test(t),
  },
  {
    label: "nama orang (gunakan peran, bukan nama)",
    test: (t) => PERSON_NAMES.some((name) => new RegExp(`\\b${name}`, "i").test(t)),
  },
];

/** Human-readable findings for `text`; empty when nothing was flagged. */
export function findSensitive(text: string): string[] {
  return CHECKS.filter((check) => check.test(text)).map((check) => check.label);
}
