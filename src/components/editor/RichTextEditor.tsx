"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { Markdown } from "@tiptap/markdown";
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
  Route,
  TriangleAlert,
  Workflow,
  Frame,
  Undo2,
  Redo2,
} from "lucide-react";

import { drawnBlockNode } from "@/lib/block-templates";
import { PROSE_CLASSNAME } from "@/lib/prose";
import { dropEmptyParagraphs, isLosslessRoundTrip } from "@/lib/editor-content";
import { createContentExtensions } from "@/lib/editor-extensions";
import { CodeBlockWithPreview } from "./code-block-preview";
import { createSlashExtension, type SlashState } from "./slash-extension";
import { createSlashStore } from "./slash-store";
import { useKeyboardInset } from "./use-keyboard-inset";
import "./rich-text-editor.css";

export interface RichTextEditorProps {
  markdown: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  /**
   * The document uses markdown this editor would change or drop when saving it
   * again. Called before anything is edited; the caller switches to markdown.
   */
  onUnsupported?: () => void;
}

const SLASH_MENU_ID = "kb-slash-menu";
const slashOptionId = (i: number) => `kb-slash-option-${i}`;

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
      <span className="kb-tool-sep" />
      <ToolButton label="Langkah bergambar" onPress={() => chain().insertContent(drawnBlockNode("langkah")).run()}>
        <Route />
      </ToolButton>
      <ToolButton label="Kotak peringatan" onPress={() => chain().insertContent(drawnBlockNode("peringatan")).run()}>
        <TriangleAlert />
      </ToolButton>
      <ToolButton label="Diagram alur" onPress={() => chain().insertContent(drawnBlockNode("mermaid")).run()}>
        <Workflow />
      </ToolButton>
      <ToolButton label="Sematan Canva atau video" onPress={() => chain().insertContent(drawnBlockNode("sematan")).run()}>
        <Frame />
      </ToolButton>
    </div>
  );
}

function SlashMenu({ state, selected, bottomReserved }: { state: SlashState; selected: number; bottomReserved: number }) {
  const rect = state.clientRect?.();
  if (!rect) return null;
  const vv = window.visualViewport;
  const viewTop = vv?.offsetTop ?? 0;
  const viewBottom = (vv ? vv.offsetTop + vv.height : window.innerHeight) - bottomReserved;
  const gap = 8;
  const below = viewBottom - rect.bottom - gap;
  const above = rect.top - viewTop - gap;
  // open on the side with more room, so it never lands under the keyboard
  const openAbove = below < 200 && above > below;
  const maxHeight = Math.max(96, Math.min(256, openAbove ? above : below));
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - 232));
  const style = openAbove
    ? { bottom: window.innerHeight - rect.top + gap, left, maxHeight }
    : { top: rect.bottom + gap, left, maxHeight };
  return (
    <div id={SLASH_MENU_ID} role="listbox" aria-label="Sisipkan blok" className="kb-slash" style={style}>
      {state.items.length === 0 ? (
        <div className="kb-slash-empty">Tidak ada yang cocok</div>
      ) : (
        state.items.map((item, i) => (
          <button
            key={item.title}
            id={slashOptionId(i)}
            type="button"
            role="option"
            aria-selected={i === selected}
            tabIndex={-1}
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

export default function RichTextEditor({ markdown, onChange, placeholder, onUnsupported }: RichTextEditorProps) {
  const [focused, setFocused] = useState(false);
  const keyboardInset = useKeyboardInset();
  // built once per mounted editor: both the extension and the menu use it
  const [store] = useState(createSlashStore);
  const { state: slash, selected } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [extensions] = useState(() => [
    ...createContentExtensions(CodeBlockWithPreview),
    Markdown,
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
    onBlur: () => {
      setFocused(false);
      // the menu belongs to the caret; with no caret Escape could not close it
      store.handlers.onUpdate(null);
    },
  });

  // Saving writes the whole document back out, so a document the editor cannot
  // reproduce must not be opened here: hand it to the markdown editor instead.
  const onUnsupportedRef = useRef(onUnsupported);
  useEffect(() => {
    onUnsupportedRef.current = onUnsupported;
  });
  // the menu is placed once, so it would be left behind by a scrolling page
  const slashOpen = !!slash;
  useEffect(() => {
    if (!slashOpen) return;
    const close = () => store.handlers.onUpdate(null);
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, [slashOpen, store]);

  // let assistive technology know the menu is open and which option is chosen
  useEffect(() => {
    const dom = editor?.view.dom;
    if (!dom) return;
    dom.setAttribute("aria-haspopup", "listbox");
    dom.setAttribute("aria-expanded", String(!!slash));
    if (slash) {
      dom.setAttribute("aria-controls", SLASH_MENU_ID);
      if (slash.items.length > 0) dom.setAttribute("aria-activedescendant", slashOptionId(selected));
      else dom.removeAttribute("aria-activedescendant");
    } else {
      dom.removeAttribute("aria-controls");
      dom.removeAttribute("aria-activedescendant");
    }
  }, [editor, slash, selected]);

  // The form replaces the content from outside when a draft is restored or
  // the document type swaps the template. Whatever comes in is checked once,
  // before anyone edits it; ordinary typing comes back as `lastEmitted`.
  const loaded = useRef(false);
  useEffect(() => {
    if (!editor) return;
    const external = markdown !== lastEmitted.current;
    if (!external && loaded.current) return;
    loaded.current = true;
    if (external) {
      lastEmitted.current = markdown;
      editor.commands.setContent(markdown, { contentType: "markdown", emitUpdate: false });
    }
    const written = editor.markdown?.serialize(dropEmptyParagraphs(editor.getJSON())) ?? "";
    if (!isLosslessRoundTrip(markdown, written)) onUnsupportedRef.current?.();
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
      {slash && <SlashMenu state={slash} selected={selected} bottomReserved={keyboardInset > 0 && focused ? 56 : 0} />}
    </div>
  );
}
