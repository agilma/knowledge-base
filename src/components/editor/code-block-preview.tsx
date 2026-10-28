"use client";

import { useEffect, useState } from "react";
import CodeBlock from "@tiptap/extension-code-block";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { MermaidDiagram } from "@/components/document/MermaidDiagram";
import { CalloutBox, StepCards } from "@/components/document/StepCards";
import { parseCallout, parseSteps } from "@/components/document/step-blocks";
import { isDrawnBlockLanguage, type DrawnBlockLanguage } from "@/lib/block-templates";

/** The text a moment ago: a diagram is redrawn when typing pauses, not on every keystroke. */
function useSettled(value: string, ms: number): string {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

const HINTS: Record<DrawnBlockLanguage, string> = {
  langkah: "Satu langkah per baris: Judul | penjelasan singkat (maksimal 12).",
  peringatan: "Baris pertama judul, baris berikutnya tindakannya.",
  mermaid: "Tulis diagram Mermaid, misalnya flowchart TD.",
};

function Preview({ language, text }: { language: DrawnBlockLanguage; text: string }) {
  const settled = useSettled(text, 400);
  if (language === "mermaid") {
    return settled.trim() ? <MermaidDiagram chart={settled} /> : <p className="kb-preview-hint">{HINTS.mermaid}</p>;
  }
  if (language === "langkah") {
    const steps = parseSteps(text);
    return steps ? <StepCards steps={steps} /> : <p className="kb-preview-hint">{HINTS.langkah}</p>;
  }
  const callout = parseCallout(text);
  return callout ? <CalloutBox callout={callout} /> : <p className="kb-preview-hint">{HINTS.peringatan}</p>;
}

/**
 * A code block that, for the drawn kinds (```langkah, ```peringatan, ```mermaid), also
 * shows what the page will look like, so the author does not have to save to find out.
 * The stored text is unchanged: this only adds a read-only view under the editable code.
 */
function CodeBlockView({ node }: NodeViewProps) {
  const language = node.attrs.language as string | null;
  return (
    <NodeViewWrapper className="kb-codeblock">
      <pre spellCheck={false}>
        <NodeViewContent />
      </pre>
      {isDrawnBlockLanguage(language) && (
        <div contentEditable={false} className="kb-preview" data-kb-preview={language}>
          <span className="kb-preview-label">Pratinjau</span>
          <Preview language={language} text={node.textContent} />
        </div>
      )}
    </NodeViewWrapper>
  );
}

export const CodeBlockWithPreview = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
});
