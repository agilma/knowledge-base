import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionProps, type SuggestionKeyDownProps } from "@tiptap/suggestion";
import { filterSlashItems, type SlashItem } from "./slash-items";

export interface SlashState {
  items: SlashItem[];
  clientRect: (() => DOMRect | null) | null;
  command: (item: SlashItem) => void;
}

export interface SlashHandlers {
  onUpdate: (state: SlashState | null) => void;
  onKeyDown: (event: KeyboardEvent) => boolean;
}

/** Typing "/" at the start of a block opens a menu of blocks to insert. */
export function createSlashExtension(handlers: SlashHandlers) {
  const toState = (props: SuggestionProps<SlashItem, SlashItem>): SlashState => ({
    items: props.items,
    clientRect: props.clientRect ?? null,
    command: props.command,
  });

  return Extension.create({
    name: "slashCommand",
    addProseMirrorPlugins() {
      return [
        Suggestion<SlashItem, SlashItem>({
          editor: this.editor,
          char: "/",
          startOfLine: false,
          allowSpaces: false,
          items: ({ query }) => filterSlashItems(query),
          command: ({ editor, range, props }) => props.run(editor, range),
          render: () => ({
            onStart: (props) => handlers.onUpdate(toState(props)),
            onUpdate: (props) => handlers.onUpdate(toState(props)),
            onKeyDown: ({ event }: SuggestionKeyDownProps) => handlers.onKeyDown(event),
            onExit: () => handlers.onUpdate(null),
          }),
        }),
      ];
    },
  });
}
