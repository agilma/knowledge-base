"use client";

import type { ForwardedRef } from "react";
import {
  MDXEditor,
  MDXEditorMethods,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  linkPlugin,
  linkDialogPlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  tablePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  diffSourcePlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  ListsToggle,
  CreateLink,
  InsertTable,
  InsertCodeBlock,
  CodeToggle,
  DiffSourceToggleWrapper,
} from "@mdxeditor/editor";

import "./markdown-editor.css";

export interface InitializedMDXEditorProps {
  markdown: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
  editorRef?: ForwardedRef<MDXEditorMethods>;
  onError?: (error: { error: string; source: string }) => void;
}

export default function InitializedMDXEditor({
  markdown,
  onChange,
  placeholder = "Tulis dokumen di sini menggunakan Markdown...",
  className = "",
  editorRef,
  onError,
}: InitializedMDXEditorProps) {
  return (
    <div className={`mdxeditor-container ${className}`}>
      <MDXEditor
        ref={editorRef}
        markdown={markdown}
        onChange={onChange}
        placeholder={placeholder}
        contentEditableClassName="prose prose-neutral dark:prose-invert max-w-none min-h-[280px] p-4 focus:outline-none"
        onError={(err) => {
          if (onError) {
            onError(err);
          } else {
            console.warn("MDXEditor parse error:", err);
          }
        }}
        plugins={[
          headingsPlugin({ allowedHeadingLevels: [1, 2, 3, 4, 5, 6] }),
          listsPlugin(),
          quotePlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: "txt" }),
          codeMirrorPlugin({
            codeBlockLanguages: {
              js: "JavaScript",
              ts: "TypeScript",
              css: "CSS",
              html: "HTML",
              txt: "Plain Text",
              bash: "Bash",
              json: "JSON",
              python: "Python",
              sql: "SQL",
            },
          }),
          tablePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
          diffSourcePlugin({ viewMode: "rich-text", diffMarkdown: "" }),
          toolbarPlugin({
            toolbarContents: () => (
              <DiffSourceToggleWrapper options={["rich-text", "source"]}>
                <UndoRedo />
                <BoldItalicUnderlineToggles options={["Bold", "Italic"]} />
                <BlockTypeSelect />
                <ListsToggle options={["bullet", "number", "check"]} />
                <CreateLink />
                <CodeToggle />
                <InsertCodeBlock />
                <InsertTable />
              </DiffSourceToggleWrapper>
            ),
          }),
        ]}
      />
    </div>
  );
}
