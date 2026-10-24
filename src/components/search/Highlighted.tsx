import { splitHighlights } from "@/lib/search-query";

/** Renders a `ts_headline` result with the matched words marked. Built from
 * text segments, never from HTML, so document content cannot inject markup. */
export function Highlighted({ text }: { text: string }) {
  return (
    <>
      {splitHighlights(text).map((segment, index) =>
        segment.match ? (
          <mark
            key={index}
            className="rounded-sm bg-primary/15 px-0.5 font-medium text-foreground"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </>
  );
}
