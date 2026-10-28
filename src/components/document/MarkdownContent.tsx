import { Children, isValidElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { PROSE_CLASSNAME } from "@/lib/prose";
import { MermaidDiagram } from "@/components/document/MermaidDiagram";
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
          // A ```mermaid fence is a diagram; every other code block is left as it was.
          pre: ({ children }) => {
            const code = Children.toArray(children)[0];
            if (isValidElement<{ className?: string; children?: React.ReactNode }>(code) && /(^|\s)language-mermaid(\s|$)/.test(code.props.className ?? "")) {
              return <MermaidDiagram key={String(code.props.children ?? "")} chart={String(code.props.children ?? "").replace(/\n$/, "")} />;
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
