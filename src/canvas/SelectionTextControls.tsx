import type { Dispatch, SetStateAction } from "react";
import {
  ElegantTypography,
  HandwrittenTypography,
  SimpleTypography,
  TechnicalTypography,
} from "../components/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../components/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/tooltip";
import type { Scene } from "../core/scene";
import type { LocaleMessages } from "../i18n";
import { Editor } from "slate";
import { ReactEditor, type ReactEditor as ReactEditorType } from "slate-react";
import {
  Bold,
  Italic,
  Strikethrough,
  TextAlignCenter,
  TextAlignLeft,
  TextAlignRight,
} from "@gravity-ui/icons";
import {
  getAlignedStartX,
  getShapeTextAnchorX,
  getTextAlignSelectValue,
} from "./geometry";
import {
  deserializeRichTextDocument,
  serializeRichTextDocument,
} from "./richTextDocument";
import { getSelectedTextElements, getSharedValue } from "./selectionState";
import type {
  EditableElement,
  EditingTextState,
  RichTextDocument,
} from "./types";
import { NumberInput } from "../components/input";

interface SelectionTextControlsProps {
  scene: Scene;
  selectedIds: string[];
  localeMessages: LocaleMessages;
  editor: ReactEditorType;
  editingText: EditingTextState | null;
  setEditingText: Dispatch<SetStateAction<EditingTextState | null>>;
  worldToScreen: (x: number, y: number) => { x: number; y: number };
  toggleEditorMark: (mark: "bold" | "italic" | "strikethrough") => void;
  onTextCommit: (id: string, text: string) => void;
  onTextFontFamilyChange: (ids: string[], fontFamily: string) => void;
  onTextFontSizeChange: (ids: string[], fontSize: number) => void;
  onTextFontWeightChange: (ids: string[], fontWeight: string) => void;
  onTextFontStyleChange: (
    ids: string[],
    fontStyle: "normal" | "italic",
  ) => void;
  onTextAlignChange: (ids: string[], textAlign: CanvasTextAlign) => void;
}

export const SelectionTextControls = ({
  scene,
  selectedIds,
  localeMessages,
  editor,
  editingText,
  setEditingText,
  worldToScreen,
  toggleEditorMark,
  onTextCommit,
  onTextFontFamilyChange,
  onTextFontSizeChange,
  onTextFontWeightChange,
  onTextFontStyleChange,
  onTextAlignChange,
}: SelectionTextControlsProps) => {
  const selectedTextElements = getSelectedTextElements(
    scene.elements,
    selectedIds,
  );
  const selectedTextAlign = getSharedValue(
    selectedTextElements,
    (element) => element.textAlign,
  );
  const selectedTextAlignValue = getTextAlignSelectValue(selectedTextAlign);
  const selectedFontFamily = getSharedValue(
    selectedTextElements,
    (element) => element.fontFamily,
  );
  const selectedFontSize = getSharedValue(
    selectedTextElements,
    (element) => element.fontSize,
  );
  const selectedFontWeight = getSharedValue(
    selectedTextElements,
    (element) => element.fontWeight,
  );
  const selectedFontStyle = getSharedValue(
    selectedTextElements,
    (element) => element.fontStyle,
  );
  const isBoldActive =
    selectedFontWeight === "bold" ||
    selectedFontWeight === "700" ||
    selectedFontWeight === "800" ||
    selectedFontWeight === "900";
  const isItalicActive = selectedFontStyle === "italic";
  const activeEditorMarks = editingText
    ? ((Editor.marks(editor) as Record<string, unknown> | null) ?? null)
    : null;

  const isEditingBaseBold =
    editingText &&
    (editingText.style.fontWeight === "bold" ||
      editingText.style.fontWeight === "700" ||
      editingText.style.fontWeight === "800" ||
      editingText.style.fontWeight === "900");
  const isEditingBaseItalic = editingText?.style.fontStyle === "italic";

  const isEditorBoldActive =
    activeEditorMarks?.bold === true ||
    (activeEditorMarks?.bold !== false && isEditingBaseBold);
  const isEditorItalicActive =
    activeEditorMarks?.italic === true ||
    (activeEditorMarks?.italic !== false && isEditingBaseItalic);

  const isElementFullyStrikethrough = (element: EditableElement): boolean => {
    const document = deserializeRichTextDocument(element.text);

    return document.every((paragraph) =>
      paragraph.children.every((leaf) => leaf.strikethrough === true),
    );
  };

  const areAllSelectedElementsStrikethrough =
    selectedTextElements.length > 0 &&
    selectedTextElements.every((element) =>
      isElementFullyStrikethrough(element),
    );

  const isBoldControlActive = editingText ? isEditorBoldActive : isBoldActive;
  const isItalicControlActive = editingText
    ? isEditorItalicActive
    : isItalicActive;
  const isStrikethroughControlActive = editingText
    ? activeEditorMarks?.strikethrough === true
    : areAllSelectedElementsStrikethrough;

  const toggleStrikethroughForSelectedElements = () => {
    const nextValue = !areAllSelectedElementsStrikethrough;

    for (const element of selectedTextElements) {
      const document = deserializeRichTextDocument(element.text);
      const nextDocument: RichTextDocument = document.map((paragraph) => ({
        ...paragraph,
        children: paragraph.children.map((leaf) => ({
          ...leaf,
          strikethrough: nextValue,
        })),
      }));

      onTextCommit(element.id, serializeRichTextDocument(nextDocument));
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      <Select
        value={selectedFontFamily}
        onValueChange={(value) => {
          onTextFontFamilyChange(
            selectedTextElements.map((element) => element.id),
            value,
          );
        }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <SelectTrigger style={{ gap: "0px" }}>
              <span style={{ width: "0px", overflow: "hidden" }}>
                <SelectValue
                  placeholder={localeMessages.selectionBar.fontFamily}
                />
              </span>
              {selectedFontFamily === "Shantell Sans" ? (
                <HandwrittenTypography />
              ) : selectedFontFamily === "Cascadia Code" ? (
                <TechnicalTypography />
              ) : selectedFontFamily === "Imbue" ? (
                <ElegantTypography />
              ) : (
                <SimpleTypography />
              )}
            </SelectTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{localeMessages.selectionBar.fontFamily}</p>
          </TooltipContent>
        </Tooltip>
        <SelectContent position="popper">
          <SelectItem check={false} value="Rubik">
            {localeMessages.fontFamilies.simple}
          </SelectItem>
          <SelectItem check={false} value="Shantell Sans">
            {localeMessages.fontFamilies.handwritten}
          </SelectItem>
          <SelectItem check={false} value="Imbue">
            {localeMessages.fontFamilies.elegant}
          </SelectItem>
          <SelectItem check={false} value="Cascadia Code">
            {localeMessages.fontFamilies.technical}
          </SelectItem>
        </SelectContent>
      </Select>
      <div className="selectionbar-separator" />
      <Select
        value={selectedFontSize + ""}
        onValueChange={(value) => {
          onTextFontSizeChange(
            selectedTextElements.map((element) => element.id),
            parseInt(value),
          );
        }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <SelectTrigger style={{ gap: "0px" }}>
              <span style={{ width: "0px", overflow: "hidden" }}>
                <SelectValue placeholder="" />
              </span>
              {selectedFontSize ?? ""}
            </SelectTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{localeMessages.selectionBar.fontSize}</p>
          </TooltipContent>
        </Tooltip>
        <SelectContent position="popper">
          <SelectItem check={false} className="fontSize-item" value="16">
            {localeMessages.fontSizes.small}
            <span style={{ opacity: 0.5, marginLeft: "auto", display: "flex" }}>
              16
            </span>
          </SelectItem>
          <SelectItem check={false} className="fontSize-item" value="24">
            {localeMessages.fontSizes.medium}
            <span style={{ opacity: 0.5, marginLeft: "auto", display: "flex" }}>
              24
            </span>
          </SelectItem>
          <SelectItem check={false} className="fontSize-item" value="40">
            {localeMessages.fontSizes.large}
            <span style={{ opacity: 0.5, marginLeft: "auto", display: "flex" }}>
              40
            </span>
          </SelectItem>
          <SelectItem check={false} className="fontSize-item" value="64">
            {localeMessages.fontSizes.extraLarge}
            <span style={{ opacity: 0.5, marginLeft: "auto", display: "flex" }}>
              64
            </span>
          </SelectItem>
          <SelectItem check={false} className="fontSize-item" value="96">
            {localeMessages.fontSizes.huge}
            <span style={{ opacity: 0.5, marginLeft: "auto", display: "flex" }}>
              96
            </span>
          </SelectItem>
          <SelectSeparator />
          <NumberInput
            value={selectedFontSize}
            onValueChange={(value) => {
              onTextFontSizeChange(
                selectedTextElements.map((element) => element.id),
                value,
              );
            }}
            placeholder={localeMessages.fontSizes.placeholder}
            type="number"
          />
        </SelectContent>
      </Select>
      <div className="selectionbar-separator" />
      <div style={{ display: "flex" }}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={() => {
                if (editingText) {
                  toggleEditorMark("bold");
                  ReactEditor.focus(editor);
                  return;
                }

                onTextFontWeightChange(
                  selectedTextElements.map((element) => element.id),
                  isBoldControlActive ? "200" : "700",
                );
              }}
              className={
                "toggle-selectionbar-button" +
                (isBoldControlActive ? " active" : "")
              }
            >
              <Bold />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{localeMessages.selectionBar.bold}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={() => {
                if (editingText) {
                  toggleEditorMark("italic");
                  ReactEditor.focus(editor);
                  return;
                }

                onTextFontStyleChange(
                  selectedTextElements.map((element) => element.id),
                  isItalicControlActive ? "normal" : "italic",
                );
              }}
              className={
                "toggle-selectionbar-button" +
                (isItalicControlActive ? " active" : "")
              }
            >
              <Italic />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{localeMessages.selectionBar.italic}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={() => {
                if (editingText) {
                  toggleEditorMark("strikethrough");
                  ReactEditor.focus(editor);
                  return;
                }

                toggleStrikethroughForSelectedElements();
              }}
              className={
                "toggle-selectionbar-button" +
                (isStrikethroughControlActive ? " active" : "")
              }
            >
              <Strikethrough />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {localeMessages.selectionBar.strikethrough ||
                "Strikethrough (Ctrl+S)"}
            </p>
          </TooltipContent>
        </Tooltip>
        <div className="selectionbar-separator" />
        <Select
          value={selectedTextAlignValue}
          onValueChange={(value) => {
            const nextTextAlign: CanvasTextAlign =
              value === "center" ? "center" : value === "end" ? "end" : "left";
            const targetIds = selectedTextElements.map((element) => element.id);

            onTextAlignChange(targetIds, nextTextAlign);

            if (!editingText || !targetIds.includes(editingText.id)) {
              return;
            }

            const editingElement = scene.elements.find(
              (element) => element.id === editingText.id,
            );

            setEditingText((current) => {
              if (!current) {
                return current;
              }

              const nextAnchorX =
                editingElement &&
                (editingElement.type === "rectangle" ||
                  editingElement.type === "circle")
                  ? getShapeTextAnchorX(editingElement, nextTextAlign)
                  : current.anchorX;
              const nextStartX = getAlignedStartX(
                nextAnchorX,
                current.width,
                nextTextAlign,
              );
              const nextScreen = worldToScreen(nextStartX, current.anchorY);

              return {
                ...current,
                anchorX: nextAnchorX,
                left: nextScreen.x,
                style: {
                  ...current.style,
                  textAlign: nextTextAlign,
                },
              };
            });
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger style={{ gap: "0px" }}>
                <span style={{ width: "0px", overflow: "hidden" }}>
                  <SelectValue placeholder="" />
                </span>
                {selectedTextAlignValue === "left" ? (
                  <TextAlignLeft />
                ) : selectedTextAlignValue === "center" ? (
                  <TextAlignCenter />
                ) : (
                  <TextAlignRight />
                )}
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>{localeMessages.selectionBar.textAlign}</p>
            </TooltipContent>
          </Tooltip>
          <SelectContent
            position="popper"
            className="drawo-colorselect-content"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <SelectItem
                  check={false}
                  className="drawo-textAlign-item"
                  value="left"
                >
                  <TextAlignLeft />
                </SelectItem>
              </TooltipTrigger>
              <TooltipContent>
                <p>{localeMessages.selectionBar.textAlignDirection.left}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <SelectItem
                  check={false}
                  className="drawo-textAlign-item"
                  value="center"
                >
                  <TextAlignCenter />
                </SelectItem>
              </TooltipTrigger>
              <TooltipContent>
                <p>{localeMessages.selectionBar.textAlignDirection.center}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <SelectItem
                  check={false}
                  className="drawo-textAlign-item"
                  value="end"
                >
                  <TextAlignRight />
                </SelectItem>
              </TooltipTrigger>
              <TooltipContent>
                <p>{localeMessages.selectionBar.textAlignDirection.right}</p>
              </TooltipContent>
            </Tooltip>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
