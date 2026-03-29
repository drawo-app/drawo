import {
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import Chrome from "@uiw/react-color-chrome";
import {
  ElegantTypography,
  HandwrittenTypography,
  SimpleTypography,
  TechnicalTypography,
} from "@shared/ui/icons";
import { ColorSwatchPicker } from "@shared/ui/ColorSwatchPicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/ui/tooltip";
import type { Scene } from "@core/scene";
import type { LocaleMessages } from "@shared/i18n";
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
} from "@features/canvas/geometry/geometry";
import {
  deserializeRichTextDocument,
  serializeRichTextDocument,
} from "@features/canvas/text/richTextDocument";
import {
  getSelectedTextElements,
  getSharedValue,
} from "@features/canvas/selection/selectionState";
import { parseColorForPicker } from "@features/canvas/rendering/color";
import type {
  EditableElement,
  EditingTextState,
  RichTextDocument,
} from "@features/canvas/types";
import { NumberInput } from "@shared/ui/input";

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
  onTextColorChange: (ids: string[], color: string) => void;
  shapeColors: readonly [readonly string[], readonly string[]];
  customDrawColorPickerWrapRef: RefObject<HTMLDivElement | null>;
  customDrawColorPickerContentRef: RefObject<HTMLDivElement | null>;
  customDrawColorPickerColor: string;
  setCustomDrawColorPickerColor: Dispatch<SetStateAction<string>>;
  activeSelectId: string | null;
  setActiveSelectId: (id: string | null) => void;
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
  onTextColorChange,
  shapeColors,
  customDrawColorPickerWrapRef,
  customDrawColorPickerContentRef,
  customDrawColorPickerColor,
  setCustomDrawColorPickerColor,
  activeSelectId,
  setActiveSelectId,
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
  const hasSharedFontSize =
    typeof selectedFontSize === "number" && Number.isFinite(selectedFontSize);
  const selectedFontWeight = getSharedValue(
    selectedTextElements,
    (element) => element.fontWeight,
  );
  const selectedFontStyle = getSharedValue(
    selectedTextElements,
    (element) => element.fontStyle,
  );
  const sharedTextColor =
    getSharedValue(selectedTextElements, (element) => element.color) ?? "multi";
  const selectedTextPreviewColor =
    sharedTextColor === "multi"
      ? (selectedTextElements[0]?.color ?? scene.settings.shapeDefaults.textColor)
      : sharedTextColor;
  const textColorPalette = [...shapeColors[0], ...shapeColors[1]];
  const textColorSelectValue = textColorPalette.some(
    (color) =>
      color !== "multi" &&
      color.toLowerCase() === selectedTextPreviewColor.toLowerCase(),
  )
    ? selectedTextPreviewColor
    : "multi";
  const isSharedTextPresetColor = textColorPalette.some(
    (color) =>
      color !== "multi" &&
      color.toLowerCase() === selectedTextPreviewColor.toLowerCase(),
  );
  const keepTextColorSelectOpenOnNextCloseRef = useRef(false);
  const [forcedCustomTextColorPicker, setForcedCustomTextColorPicker] =
    useState(false);
  const isBoldActive =
    selectedFontWeight === "bold" ||
    selectedFontWeight === "700" ||
    selectedFontWeight === "800" ||
    selectedFontWeight === "900";
  const isItalicActive = selectedFontStyle === "italic";
  const activeEditorMarks = (() => {
    if (!editingText) {
      return null;
    }

    try {
      return (Editor.marks(editor) as Record<string, unknown> | null) ?? null;
    } catch {
      return null;
    }
  })();

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

  const focusEditorIfEditing = () => {
    if (!editingText) {
      return;
    }

    requestAnimationFrame(() => {
      try {
        ReactEditor.focus(editor);
      } catch {
        return;
      }
    });
  };

  const openCustomTextColorPicker = (initialColor: string) => {
    setForcedCustomTextColorPicker(true);
    setActiveSelectId("text-color");
    setCustomDrawColorPickerColor(parseColorForPicker(initialColor));
  };

  const applyTextColorChange = (color: string) => {
    const targetIds = selectedTextElements.map((element) => element.id);

    onTextColorChange(targetIds, color);

    if (editingText && targetIds.includes(editingText.id)) {
      setEditingText((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          style: {
            ...current.style,
            color,
          },
        };
      });
    }

    focusEditorIfEditing();
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      <div
        ref={customDrawColorPickerWrapRef}
        style={{ position: "relative", display: "inline-flex" }}
      >
        <Select
          open={activeSelectId === "text-color"}
          onOpenChange={(isOpen) => {
            if (isOpen) {
              setForcedCustomTextColorPicker(false);
              setActiveSelectId("text-color");
              return;
            }

            if (keepTextColorSelectOpenOnNextCloseRef.current) {
              keepTextColorSelectOpenOnNextCloseRef.current = false;
              return;
            }

            if (forcedCustomTextColorPicker) {
              setForcedCustomTextColorPicker(false);
            }

            setActiveSelectId(null);
          }}
          value={String(textColorSelectValue)}
          onValueChange={(value) => {
            if (value === "multi") {
              openCustomTextColorPicker(selectedTextPreviewColor);
              return;
            }

            setActiveSelectId(null);
            applyTextColorChange(value);
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger
                onPointerDown={(event) => {
                  if (textColorSelectValue !== "multi") {
                    return;
                  }

                  event.preventDefault();
                  event.stopPropagation();
                  openCustomTextColorPicker(selectedTextPreviewColor);
                }}
                style={{ gap: "0px", width: "fit-content" }}
              >
                <span style={{ width: "0px", overflow: "hidden" }}>
                  <SelectValue placeholder={localeMessages.selectionBar.textColor} />
                </span>
                <div
                  style={{
                    width: "20px",
                    borderRadius: "100%",
                    border: "1px solid #ffffff20",
                    height: "20px",
                    background: selectedTextPreviewColor,
                  }}
                />
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>{localeMessages.selectionBar.textColor}</p>
            </TooltipContent>
          </Tooltip>
          <SelectContent
            position="popper"
            className="drawo-colorselect-content"
          >
            <div>
              <ColorSwatchPicker
                colors={shapeColors[0]}
                currentColor={selectedTextPreviewColor}
                uniColor={(color) => color}
                renderItem={({ color, isMulti, swatch }) => (
                  <SelectItem
                    key={color}
                    value={color}
                    className="drawo-colorselect-item"
                    check={false}
                    onPointerDown={
                      isMulti
                        ? (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            keepTextColorSelectOpenOnNextCloseRef.current = true;
                            openCustomTextColorPicker(selectedTextPreviewColor);
                          }
                        : undefined
                    }
                    onSelect={
                      isMulti
                        ? (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            keepTextColorSelectOpenOnNextCloseRef.current = true;
                            openCustomTextColorPicker(selectedTextPreviewColor);
                          }
                        : undefined
                    }
                  >
                    {swatch}
                  </SelectItem>
                )}
              />
            </div>
            <div>
              <ColorSwatchPicker
                colors={shapeColors[1]}
                realTotalColors={textColorPalette}
                currentColor={selectedTextPreviewColor}
                uniColor={(color) => color}
                renderItem={({ color, isMulti, swatch }) => (
                  <SelectItem
                    key={color}
                    value={color}
                    className="drawo-colorselect-item"
                    check={false}
                    onPointerDown={
                      isMulti
                        ? (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            keepTextColorSelectOpenOnNextCloseRef.current = true;
                            openCustomTextColorPicker(selectedTextPreviewColor);
                          }
                        : undefined
                    }
                    onSelect={
                      isMulti
                        ? (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            keepTextColorSelectOpenOnNextCloseRef.current = true;
                            openCustomTextColorPicker(selectedTextPreviewColor);
                          }
                        : undefined
                    }
                  >
                    {swatch}
                  </SelectItem>
                )}
              />
            </div>
          </SelectContent>
        </Select>
      </div>
      <Tooltip
        open={
          activeSelectId === "text-color" &&
          (forcedCustomTextColorPicker || !isSharedTextPresetColor)
        }
      >
        <TooltipTrigger asChild>
          <div className="selectionbar-separator" />
        </TooltipTrigger>
        <TooltipContent
          className="drawo-content-color drawo-ultrainferior-colorcontent3"
          side="bottom"
          style={{ background: "transparent" }}
        >
          <div
            ref={customDrawColorPickerContentRef}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Chrome
              color={customDrawColorPickerColor}
              onChange={(color) => {
                const next = color.hexa || color.hex;
                if (!next) {
                  return;
                }

                setCustomDrawColorPickerColor(next);
                applyTextColorChange(next);
              }}
            />
          </div>
        </TooltipContent>
      </Tooltip>
      <Select
        open={activeSelectId === "text-font-family" || undefined}
        onOpenChange={(isOpen) => {
          if (isOpen) {
            setActiveSelectId("text-font-family");
          } else if (activeSelectId === "text-font-family") {
            setActiveSelectId(null);
          }
        }}
        value={selectedFontFamily}
        onValueChange={(value) => {
          setActiveSelectId(null);
          onTextFontFamilyChange(
            selectedTextElements.map((element) => element.id),
            value,
          );
          focusEditorIfEditing();
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
        open={activeSelectId === "text-font-size" || undefined}
        onOpenChange={(isOpen) => {
          if (isOpen) {
            setActiveSelectId("text-font-size");
          } else if (activeSelectId === "text-font-size") {
            setActiveSelectId(null);
          }
        }}
        value={hasSharedFontSize ? String(selectedFontSize) : undefined}
        onValueChange={(value) => {
          setActiveSelectId(null);
          const parsedValue = Number.parseInt(value, 10);

          if (!Number.isFinite(parsedValue)) {
            return;
          }

          onTextFontSizeChange(
            selectedTextElements.map((element) => element.id),
            parsedValue,
          );
          focusEditorIfEditing();
        }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <SelectTrigger style={{ gap: "0px" }}>
              <span style={{ width: "0px", overflow: "hidden" }}>
                <SelectValue placeholder="" />
              </span>
              {hasSharedFontSize ? selectedFontSize : "-"}
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
              if (!Number.isFinite(value)) {
                return;
              }

              onTextFontSizeChange(
                selectedTextElements.map((element) => element.id),
                value,
              );
              focusEditorIfEditing();
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
          open={activeSelectId === "text-align" || undefined}
          onOpenChange={(isOpen) => {
            if (isOpen) {
              setActiveSelectId("text-align");
            } else if (activeSelectId === "text-align") {
              setActiveSelectId(null);
            }
          }}
          value={selectedTextAlignValue}
          onValueChange={(value) => {
            setActiveSelectId(null);
            const nextTextAlign: CanvasTextAlign =
              value === "center" ? "center" : value === "end" ? "end" : "left";
            const targetIds = selectedTextElements.map((element) => element.id);

            onTextAlignChange(targetIds, nextTextAlign);

            if (!editingText || !targetIds.includes(editingText.id)) {
              focusEditorIfEditing();
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

            focusEditorIfEditing();
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
