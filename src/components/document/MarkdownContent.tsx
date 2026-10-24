import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { PROSE_CLASSNAME } from "@/lib/prose";
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
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
