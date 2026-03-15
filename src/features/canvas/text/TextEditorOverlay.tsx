import {
  useCallback,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import {
  Editable,
  Slate,
  type ReactEditor as ReactEditorType,
  type RenderLeafProps,
} from "slate-react";
import type { Descendant } from "slate";
import { deserializeRichTextDocument } from "./richTextDocument";
import type {
  EditingTextState,
  RichTextDocument,
  RichTextLeaf,
} from "@features/canvas/types";

interface TextEditorOverlayProps {
  editorWrapRef: RefObject<HTMLDivElement | null>;
  editor: ReactEditorType;
  editingText: EditingTextState | null;
  editingDocument: RichTextDocument | null;
  cameraZoom: number;
  setEditingDocument: Dispatch<SetStateAction<RichTextDocument | null>>;
  setEditingText: Dispatch<SetStateAction<EditingTextState | null>>;
  toThemeColor: (color: string | null | undefined) => string;
  getTextLineHeight: (fontSize: number) => number;
  onEditorChange: (value: Descendant[]) => void;
  onCommitEditingText: () => void;
  onToggleEditorMark: (mark: "bold" | "italic" | "strikethrough") => void;
}

export const TextEditorOverlay = ({
  editorWrapRef,
  editor,
  editingText,
  editingDocument,
  cameraZoom,
  setEditingDocument,
  setEditingText,
  toThemeColor,
  getTextLineHeight,
  onEditorChange,
  onCommitEditingText,
  onToggleEditorMark,
}: TextEditorOverlayProps) => {
  const handleInputBlur = () => {
    requestAnimationFrame(() => {
      const activeElement = document.activeElement;
      if (editorWrapRef.current?.contains(activeElement)) {
        return;
      }

      onCommitEditingText();
    });
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      onCommitEditingText();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
      event.preventDefault();
      onToggleEditorMark("bold");
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "i") {
      event.preventDefault();
      onToggleEditorMark("italic");
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      onToggleEditorMark("strikethrough");
      return;
    }

    if (event.key === "Escape") {
      setEditingDocument(null);
      setEditingText(null);
    }
  };

  const renderLeaf = useCallback(
    ({ attributes, children, leaf }: RenderLeafProps) => {
      const richLeaf = leaf as RichTextLeaf;

      return (
        <span
          {...attributes}
          style={{
            fontWeight:
              richLeaf.bold === true
                ? 700
                : richLeaf.bold === false
                  ? 400
                  : undefined,
            fontStyle:
              richLeaf.italic === true
                ? "italic"
                : richLeaf.italic === false
                  ? "normal"
                  : undefined,
            textDecorationLine:
              richLeaf.strikethrough === true ? "line-through" : "none",
            textDecorationColor:
              richLeaf.strikethrough === true ? "currentColor" : undefined,
            textDecorationThickness:
              richLeaf.strikethrough === true ? "0.05em" : undefined,
          }}
        >
          {children}
        </span>
      );
    },
    [],
  );

  if (!editingText) {
    return null;
  }

  return (
    <div
      ref={editorWrapRef}
      style={{
        position: "absolute",
        left: editingText.left,
        top: editingText.top,
        width: editingText.width,
        height: editingText.height,
        maxWidth: editingText.maxWidth,
        margin: 0,
        padding: 0,
        border: "none",
        outline: "none",
        cursor: 'url("/cursors/text.svg") 12 12, auto',
        background: "transparent",
        boxShadow: "none",
        color: toThemeColor(editingText.style.color),
        fontFamily: editingText.style.fontFamily,
        fontSize: editingText.style.fontSize * cameraZoom,
        fontWeight: editingText.style.fontWeight,
        fontStyle: editingText.style.fontStyle,
        textAlign: editingText.style.textAlign,
        lineHeight: `${getTextLineHeight(editingText.style.fontSize) * cameraZoom}px`,
      }}
    >
      <Slate
        editor={editor}
        initialValue={
          (editingDocument ??
            deserializeRichTextDocument(editingText.value)) as Descendant[]
        }
        onChange={onEditorChange}
      >
        <Editable
          renderLeaf={renderLeaf}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          spellCheck={false}
          style={{
            width: "100%",
            height: "100%",
            minHeight: `${editingText.style.fontSize * cameraZoom}px`,
            outline: "none",
            whiteSpace: "pre",
            wordBreak: "normal",
            background: "transparent",
          }}
        />
      </Slate>
    </div>
  );
};
