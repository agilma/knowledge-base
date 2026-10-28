/**
 * What the editor inserts for the three drawn block types. They are the text of a
 * fenced block, so they are plain Markdown once inserted; a test keeps each one
 * valid for the code that draws it.
 */
export type DrawnBlockLanguage = "langkah" | "peringatan" | "mermaid";

export const BLOCK_TEMPLATES: Record<DrawnBlockLanguage, string> = {
  langkah: "Langkah pertama | Satu kalimat penjelasan\nLangkah kedua | Satu kalimat penjelasan\nLangkah ketiga | Satu kalimat penjelasan",
  peringatan: "Apa yang tidak boleh keliru?\nTulis tindakan yang harus dilakukan.",
  mermaid:
    'flowchart TD\n  A(["Mulai"]):::start --> B["Langkah pertama"]\n  B --> C("Sudah benar?"):::decision\n  C -- Belum --> X["Perbaiki dulu"]:::stop\n  X --> B\n  C -- Sudah --> Z(["Selesai"]):::done',
};

export const DRAWN_BLOCK_LANGUAGES = Object.keys(BLOCK_TEMPLATES) as DrawnBlockLanguage[];

export function isDrawnBlockLanguage(language: unknown): language is DrawnBlockLanguage {
  return typeof language === "string" && (DRAWN_BLOCK_LANGUAGES as string[]).includes(language);
}

/** The node an editor inserts: a code block in that language holding the template. */
export function drawnBlockNode(language: DrawnBlockLanguage) {
  return { type: "codeBlock", attrs: { language }, content: [{ type: "text", text: BLOCK_TEMPLATES[language] }] };
}
