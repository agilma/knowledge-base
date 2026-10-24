"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { TableKit } from "@tiptap/extension-table";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Link2,
  Code,
  SquareCode,
  Table2,
  Undo2,
  Redo2,
} from "lucide-react";

import { PROSE_CLASSNAME } from "@/lib/prose";
import { dropEmptyParagraphs } from "@/lib/editor-content";
import { createSlashExtension, type SlashState } from "./slash-extension";
import { createSlashStore } from "./slash-store";
import { useKeyboardInset } from "./use-keyboard-inset";
import "./rich-text-editor.css";

export interface RichTextEditorProps {
  markdown: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}

function ToolButton({
  label,
  active,
  disabled,
  onPress,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active ?? false}
      disabled={disabled}
      // keep the selection and the on-screen keyboard where they are
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
      className="kb-tool"
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const chain = () => editor.chain().focus();

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Alamat tautan (kosongkan untuk menghapus)", previous ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      chain().extendMarkRange("link").unsetLink().run();
      return;
    }
    chain().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  return (
    <div role="toolbar" aria-label="Pemformatan teks" className="kb-toolbar">
      <ToolButton label="Urungkan" disabled={!editor.can().undo()} onPress={() => chain().undo().run()}>
        <Undo2 />
      </ToolButton>
      <ToolButton label="Ulangi" disabled={!editor.can().redo()} onPress={() => chain().redo().run()}>
        <Redo2 />
      </ToolButton>
      <span className="kb-tool-sep" />
      <ToolButton label="Judul besar" active={editor.isActive("heading", { level: 2 })} onPress={() => chain().toggleHeading({ level: 2 }).run()}>
        <Heading2 />
      </ToolButton>
      <ToolButton label="Sub judul" active={editor.isActive("heading", { level: 3 })} onPress={() => chain().toggleHeading({ level: 3 }).run()}>
        <Heading3 />
      </ToolButton>
      <ToolButton label="Tebal" active={editor.isActive("bold")} onPress={() => chain().toggleBold().run()}>
        <Bold />
      </ToolButton>
      <ToolButton label="Miring" active={editor.isActive("italic")} onPress={() => chain().toggleItalic().run()}>
        <Italic />
      </ToolButton>
      <ToolButton label="Coret" active={editor.isActive("strike")} onPress={() => chain().toggleStrike().run()}>
        <Strikethrough />
      </ToolButton>
      <span className="kb-tool-sep" />
      <ToolButton label="Daftar poin" active={editor.isActive("bulletList")} onPress={() => chain().toggleBulletList().run()}>
        <List />
      </ToolButton>
      <ToolButton label="Daftar nomor" active={editor.isActive("orderedList")} onPress={() => chain().toggleOrderedList().run()}>
        <ListOrdered />
      </ToolButton>
      <ToolButton label="Daftar centang" active={editor.isActive("taskList")} onPress={() => chain().toggleTaskList().run()}>
        <ListChecks />
      </ToolButton>
      <ToolButton label="Kutipan" active={editor.isActive("blockquote")} onPress={() => chain().toggleBlockquote().run()}>
        <Quote />
      </ToolButton>
      <span className="kb-tool-sep" />
      <ToolButton label="Tautan" active={editor.isActive("link")} onPress={setLink}>
        <Link2 />
      </ToolButton>
      <ToolButton label="Kode" active={editor.isActive("code")} onPress={() => chain().toggleCode().run()}>
        <Code />
      </ToolButton>
      <ToolButton label="Blok kode" active={editor.isActive("codeBlock")} onPress={() => chain().toggleCodeBlock().run()}>
        <SquareCode />
      </ToolButton>
      <ToolButton label="Tabel" onPress={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
        <Table2 />
      </ToolButton>
    </div>
  );
}

function SlashMenu({ state, selected }: { state: SlashState; selected: number }) {
  const rect = state.clientRect?.();
  if (!rect) return null;
  const below = rect.bottom + 8;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - 232));
  return (
    <div
      role="listbox"
      aria-label="Sisipkan blok"
      className="kb-slash"
      style={{ top: below, left }}
    >
      {state.items.length === 0 ? (
        <div className="kb-slash-empty">Tidak ada yang cocok</div>
      ) : (
        state.items.map((item, i) => (
          <button
            key={item.title}
            type="button"
            role="option"
            aria-selected={i === selected}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => state.command(item)}
            className="kb-slash-item"
          >
            <span>{item.title}</span>
            <span className="kb-slash-hint">{item.hint}</span>
          </button>
        ))
      )}
    </div>
  );
}

export default function RichTextEditor({ markdown, onChange, placeholder }: RichTextEditorProps) {
  const [focused, setFocused] = useState(false);
  const keyboardInset = useKeyboardInset();
  // built once per mounted editor: both the extension and the menu use it
  const [store] = useState(createSlashStore);
  const { state: slash, selected } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [extensions] = useState(() => [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      link: { openOnClick: false, autolink: true },
    }),
    Markdown,
    TableKit,
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder: placeholder ?? "Tulis di sini. Ketik / untuk menyisipkan blok." }),
    createSlashExtension(store.handlers),
  ]);

  const lastEmitted = useRef(markdown);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const editor = useEditor({
    extensions,
    content: markdown,
    contentType: "markdown",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `${PROSE_CLASSNAME} kb-editor-content`,
        "aria-label": "Isi dokumen",
        autocapitalize: "sentences",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const next = ed.markdown?.serialize(dropEmptyParagraphs(ed.getJSON())) ?? ed.getMarkdown();
      lastEmitted.current = next;
      onChangeRef.current(next);
    },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  });

  // The form replaces the content from outside when a draft is restored or
  // the document type swaps the template.
  useEffect(() => {
    if (!editor || markdown === lastEmitted.current) return;
    lastEmitted.current = markdown;
    editor.commands.setContent(markdown, { contentType: "markdown", emitUpdate: false });
  }, [editor, markdown]);

  if (!editor) {
    return <div className="kb-editor-loading">Memuat editor…</div>;
  }

  return (
    <div className="kb-editor" data-focused={focused}>
      <div
        className="kb-toolbar-wrap"
        // above the on-screen keyboard on a phone, stuck to the top elsewhere
        style={{ ["--kb-inset" as string]: `${keyboardInset}px` }}
        data-keyboard={keyboardInset > 0 || undefined}
      >
        <Toolbar editor={editor} />
      </div>
      <EditorContent editor={editor} />
      {slash && <SlashMenu state={slash} selected={selected} />}
    </div>
  );
}
