import { Children, isValidElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { PROSE_CLASSNAME } from "@/lib/prose";
import { MermaidDiagram } from "@/components/document/MermaidDiagram";
import { CalloutBox, StepCards } from "@/components/document/StepCards";
import { parseCallout, parseSteps } from "@/components/document/step-blocks";
import { SectionHeading } from "@/components/document/SectionHeading";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={className ?? PROSE_CLASSNAME}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          h2: ({ id, children }) => (
            <SectionHeading level={2} id={id}>{children}</SectionHeading>
          ),
          h3: ({ id, children }) => (
            <SectionHeading level={3} id={id}>{children}</SectionHeading>
          ),
          // ```mermaid, ```langkah and ```peringatan fences are drawn; every other code block is left as it was.
          pre: ({ children }) => {
            const code = Children.toArray(children)[0];
            if (isValidElement<{ className?: string; children?: React.ReactNode }>(code)) {
              const language = /(?:^|\s)language-(mermaid|langkah|peringatan)(?:\s|$)/.exec(code.props.className ?? "")?.[1];
              const text = String(code.props.children ?? "").replace(/\n$/, "");
              if (language === "mermaid") return <MermaidDiagram key={text} chart={text} />;
              if (language === "langkah") {
                const steps = parseSteps(text);
                if (steps) return <StepCards steps={steps} />;
              }
              if (language === "peringatan") {
                const callout = parseCallout(text);
                if (callout) return <CalloutBox callout={callout} />;
              }
            }
            return <pre>{children}</pre>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
