import StarterKit from "@tiptap/starter-kit";
import CodeBlock from "@tiptap/extension-code-block";
import { TableKit } from "@tiptap/extension-table";
import { TaskList, TaskItem } from "@tiptap/extension-list";

/**
 * The document model of the rich editor, apart from its interface. The editor
 * and the round-trip tests build from the same list, so what is tested is what runs.
 */
export function createContentExtensions(codeBlock: typeof CodeBlock = CodeBlock) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      link: { openOnClick: false, autolink: true },
      // supplied separately so the editor can draw a preview under some blocks;
      // the schema and the Markdown it reads and writes are the same either way
      codeBlock: false,
    }),
    codeBlock,
    TableKit,
    TaskList,
    TaskItem.configure({ nested: true }),
  ];
}
