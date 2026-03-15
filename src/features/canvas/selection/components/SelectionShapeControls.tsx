import {
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import Chrome from "@uiw/react-color-chrome";
import { ColorSwatchPicker } from "@shared/ui/ColorSwatchPicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/ui/tooltip";
import type { CircleElement, RectangleElement } from "@core/elements";
import type { Scene } from "@core/scene";
import type { LocaleMessages } from "@shared/i18n";
import {
  SHAPE_COLORS,
  STROKE_COLORS,
  DRAW_STROKE_OPTIONS,
  getClosestDrawStrokeOption,
} from "@features/canvas/rendering/constants";
import { parseColorForPicker } from "@features/canvas/rendering/color";
import {
  getSelectedShapeElements,
  getSharedValue,
} from "@features/canvas/selection/selectionState";
import {
  HachureIcon,
  SquareFilledIcon,
  SquareUnfilledIcon,
} from "@shared/ui/icons";

interface SelectionShapeControlsProps {
  scene: Scene;
  selectedIds: string[];
  localeMessages: LocaleMessages;
  customDrawColorPickerWrapRef: RefObject<HTMLDivElement | null>;
  customDrawColorPickerContentRef: RefObject<HTMLDivElement | null>;
  isCustomDrawColorPickerOpen1: boolean;
  setIsCustomDrawColorPickerOpen1: Dispatch<SetStateAction<boolean>>;
  isCustomDrawColorPickerOpen2: boolean;
  setIsCustomDrawColorPickerOpen2: Dispatch<SetStateAction<boolean>>;
  customDrawColorPickerColor: string;
  setCustomDrawColorPickerColor: Dispatch<SetStateAction<string>>;
  onShapeFillColorChange: (ids: string[], fillColor: string) => void;
  onShapeFillStyleChange: (ids: string[], fillStyle: string) => void;
  onShapeStrokeColorChange: (ids: string[], strokeColor: string) => void;
  onShapeStrokeWidthChange: (ids: string[], strokeWidth: number) => void;
  uniColor: (color: string) => string;
  activeSelectId: string | null;
  setActiveSelectId: (id: string | null) => void;
}

export const SelectionShapeControls = ({
  scene,
  selectedIds,
  localeMessages,
  customDrawColorPickerWrapRef,
  customDrawColorPickerContentRef,
  isCustomDrawColorPickerOpen1,
  setIsCustomDrawColorPickerOpen1,
  isCustomDrawColorPickerOpen2,
  setIsCustomDrawColorPickerOpen2,
  customDrawColorPickerColor,
  setCustomDrawColorPickerColor,
  onShapeFillColorChange,
  onShapeFillStyleChange,
  onShapeStrokeColorChange,
  onShapeStrokeWidthChange,
  uniColor,
  activeSelectId,
  setActiveSelectId,
}: SelectionShapeControlsProps) => {
  const selectedShapeElements = getSelectedShapeElements(
    scene.elements,
    selectedIds,
  ).filter(
    (element): element is RectangleElement | CircleElement =>
      element.type === "rectangle" || element.type === "circle",
  );
  const selectedShapeIds = selectedShapeElements.map((element) => element.id);

  const sharedFillColor =
    getSharedValue(selectedShapeElements, (element) => element.fill) ?? "multi";
  const sharedFillStyle = getSharedValue(
    selectedShapeElements,
    (element) => element.fillStyle,
  );

  const selectedFillPreviewColor =
    sharedFillColor === "multi"
      ? (selectedShapeElements[0]?.fill ?? "#f5f5f5")
      : sharedFillColor;

  const fillColorSelectValue = [...SHAPE_COLORS[0], ...SHAPE_COLORS[1]].some(
    (color) =>
      color !== "multi" &&
      color.toLowerCase() === sharedFillColor.toLowerCase(),
  )
    ? sharedFillColor
    : "multi";

  const fillStyleSelectValue =
    ["solid", "hachure", "none"].some(
      (fillStyle) => fillStyle === sharedFillStyle,
    ) && sharedFillStyle;

  // Track whether the open custom color picker is for "fill" or "stroke"
  const colorPickerModeRef = useRef<"fill" | "stroke">("fill");

  const sharedStrokeColor =
    getSharedValue(selectedShapeElements, (element) => element.stroke) ??
    "multi";
  const selectedStrokePreviewColor =
    sharedStrokeColor === "multi"
      ? (selectedShapeElements[0]?.stroke ?? "#2f3b52")
      : sharedStrokeColor;
  const strokeColorSelectValue = STROKE_COLORS.some(
    (color) =>
      color !== "multi" &&
      color.toLowerCase() === sharedStrokeColor.toLowerCase(),
  )
    ? sharedStrokeColor
    : "multi";

  const sharedStrokeWidth = getSharedValue(
    selectedShapeElements,
    (element) => element.strokeWidth,
  );
  const selectedStrokeWidth = getClosestDrawStrokeOption(
    sharedStrokeWidth ?? DRAW_STROKE_OPTIONS[0],
  );

  const openCustomFillColorPicker = (initialColor: string) => {
    colorPickerModeRef.current = "fill";
    setCustomDrawColorPickerColor(parseColorForPicker(initialColor));
    setIsCustomDrawColorPickerOpen1(true);
  };

  const openCustomStrokeColorPicker = (initialColor: string) => {
    colorPickerModeRef.current = "stroke";
    setCustomDrawColorPickerColor(parseColorForPicker(initialColor));
    setIsCustomDrawColorPickerOpen2(true);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      <div
        ref={customDrawColorPickerWrapRef}
        style={{ position: "relative", display: "inline-flex" }}
      >
        <Select
          open={
            activeSelectId === "shape-fill-color" ||
            isCustomDrawColorPickerOpen1 ||
            undefined
          }
          onOpenChange={(isOpen) => {
            if (isOpen) {
              setActiveSelectId("shape-fill-color");
            } else if (activeSelectId === "shape-fill-color") {
              setActiveSelectId(null);
            }
          }}
          value={String(fillColorSelectValue)}
          onValueChange={(value) => {
            if (["solid", "hachure", "none"].includes(value)) {
              onShapeFillStyleChange(selectedShapeIds, value);
              setIsCustomDrawColorPickerOpen1(false);
              return;
            }
            if (value === "multi") {
              openCustomFillColorPicker(selectedFillPreviewColor);
              return;
            }

            setIsCustomDrawColorPickerOpen1(false);
            setActiveSelectId(null);
            onShapeFillColorChange(selectedShapeIds, value);
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger
                onPointerDown={(event) => {
                  if (fillColorSelectValue !== "multi") {
                    return;
                  }

                  event.preventDefault();
                  event.stopPropagation();
                  openCustomFillColorPicker(selectedFillPreviewColor);
                }}
                style={{ gap: "0px", width: "fit-content" }}
              >
                <span style={{ width: "0px", overflow: "hidden" }}>
                  <SelectValue
                    placeholder={localeMessages.selectionBar.fillColor}
                  />
                </span>
                <div
                  style={{
                    width: "20px",
                    borderRadius: "100%",
                    border: "1px solid #ffffff20",
                    height: "20px",
                    background: uniColor(selectedFillPreviewColor),
                  }}
                />
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>{localeMessages.selectionBar.fillColor}</p>
            </TooltipContent>
          </Tooltip>
          <SelectContent
            position="popper"
            className="drawo-colorselect-content"
          >
            <div className="drawo-colorstyle-container">
              <SelectItem
                className={
                  "drawo-colorstyle-optionitem" +
                  (fillStyleSelectValue === "solid" ? " active" : "")
                }
                value="solid"
              >
                <SquareFilledIcon /> Relleno
              </SelectItem>
              <SelectItem
                className={
                  "drawo-colorstyle-optionitem" +
                  (fillStyleSelectValue === "hachure" ? " active" : "")
                }
                value="hachure"
              >
                <HachureIcon /> Hachure
              </SelectItem>
              <SelectItem
                className={
                  "drawo-colorstyle-optionitem" +
                  (fillStyleSelectValue === "none" ? " active" : "")
                }
                value="none"
              >
                <SquareUnfilledIcon /> Sin relleno
              </SelectItem>
            </div>
            <hr className="drawo-colorstyle-separator" />
            <div
              className={
                "drawo-bigcolorpicker " +
                (fillStyleSelectValue === "none" ? "disabled" : "")
              }
            >
              <div>
                <ColorSwatchPicker
                  colors={SHAPE_COLORS[0]}
                  currentColor={selectedFillPreviewColor}
                  uniColor={uniColor}
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
                              openCustomFillColorPicker(
                                selectedFillPreviewColor,
                              );
                            }
                          : undefined
                      }
                      onSelect={
                        isMulti
                          ? (event) => {
                              event.preventDefault();
                              openCustomFillColorPicker(
                                selectedFillPreviewColor,
                              );
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
                  colors={SHAPE_COLORS[1]}
                  realTotalColors={[...SHAPE_COLORS[0], ...SHAPE_COLORS[1]]}
                  currentColor={selectedFillPreviewColor}
                  uniColor={uniColor}
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
                              openCustomFillColorPicker(
                                selectedFillPreviewColor,
                              );
                            }
                          : undefined
                      }
                      onSelect={
                        isMulti
                          ? (event) => {
                              event.preventDefault();
                              openCustomFillColorPicker(
                                selectedFillPreviewColor,
                              );
                            }
                          : undefined
                      }
                    >
                      {swatch}
                    </SelectItem>
                  )}
                />
              </div>
            </div>
          </SelectContent>
        </Select>
      </div>

      <Tooltip open={isCustomDrawColorPickerOpen1}>
        <TooltipTrigger asChild>
          <div className="selectionbar-separator" />
        </TooltipTrigger>
        <TooltipContent
          className="drawo-content-color drawo-ultrainferior-colorcontent"
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
                if (colorPickerModeRef.current === "stroke") {
                  onShapeStrokeColorChange(selectedShapeIds, next);
                } else {
                  onShapeFillColorChange(selectedShapeIds, next);
                }
              }}
            />
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Stroke color */}
      <Select
        open={
          activeSelectId === "shape-stroke-color" ||
          isCustomDrawColorPickerOpen2 ||
          undefined
        }
        onOpenChange={(isOpen) => {
          if (isOpen) {
            setActiveSelectId("shape-stroke-color");
          } else if (activeSelectId === "shape-stroke-color") {
            setActiveSelectId(null);
          }
        }}
        value={String(strokeColorSelectValue)}
        onValueChange={(value) => {
          if (value === "multi") {
            openCustomStrokeColorPicker(selectedStrokePreviewColor);
            return;
          }
          setIsCustomDrawColorPickerOpen2(false);
          setActiveSelectId(null);
          onShapeStrokeColorChange(selectedShapeIds, value);
        }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <SelectTrigger
              onPointerDown={(event) => {
                if (strokeColorSelectValue !== "multi") {
                  return;
                }
                event.preventDefault();
                event.stopPropagation();
                openCustomStrokeColorPicker(selectedStrokePreviewColor);
              }}
              style={{ gap: "0px", width: "fit-content" }}
            >
              <span style={{ width: "0px", overflow: "hidden" }}>
                <SelectValue
                  placeholder={localeMessages.selectionBar.strokeColor}
                />
              </span>
              <div
                style={{
                  width: "20px",
                  borderRadius: "3px",
                  border: "2px solid " + uniColor(selectedStrokePreviewColor),
                  height: "20px",
                  background: "transparent",
                }}
              />
            </SelectTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{localeMessages.selectionBar.strokeColor}</p>
          </TooltipContent>
        </Tooltip>
        <SelectContent position="popper" className="drawo-colorselect-content">
          <ColorSwatchPicker
            colors={STROKE_COLORS}
            currentColor={selectedStrokePreviewColor}
            uniColor={uniColor}
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
                        openCustomStrokeColorPicker(selectedStrokePreviewColor);
                      }
                    : undefined
                }
                onSelect={
                  isMulti
                    ? (event) => {
                        event.preventDefault();
                        openCustomStrokeColorPicker(selectedStrokePreviewColor);
                      }
                    : undefined
                }
              >
                {swatch}
              </SelectItem>
            )}
          />
        </SelectContent>
      </Select>

      {/* Stroke width */}
      {/*
        <Select
          open={activeSelectId === "shape-stroke-width" || undefined}
          onOpenChange={(isOpen) => {
            if (isOpen) {
              setActiveSelectId("shape-stroke-width");
            } else if (activeSelectId === "shape-stroke-width") {
              setActiveSelectId(null);
            }
          }}
          value={String(selectedStrokeWidth)}
          onValueChange={(value) => {
            setActiveSelectId(null);
            onShapeStrokeWidthChange(selectedShapeIds, Number(value));
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger className="draw-stroke-trigger">
                <SelectValue
                  placeholder={localeMessages.selectionBar.strokeWidth}
                />
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>{localeMessages.selectionBar.strokeWidth}</p>
            </TooltipContent>
          </Tooltip>
          <SelectContent position="popper">
            {DRAW_STROKE_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}px
              </SelectItem>
            ))}
          </SelectContent>
        </Select> */}

      <div className="selectionbar-separator" />
    </div>
  );
};
