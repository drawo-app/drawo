import {
  useRef,
  useState,
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
import { parseColorForPicker } from "@features/canvas/rendering/color";
import {
  getSelectedShapeElements,
  getSharedValue,
} from "@features/canvas/selection/selectionState";
import {
  DashedLine01Icon,
  HachureIcon,
  OctagonXIcon,
  SolidLine01Icon,
  SquareFilledIcon,
  SquareUnfilledIcon,
} from "@shared/ui/icons";

interface SelectionShapeControlsProps {
  scene: Scene;
  shapeColors: readonly [readonly string[], readonly string[]];
  selectedIds: string[];
  localeMessages: LocaleMessages;
  customDrawColorPickerWrapRef: RefObject<HTMLDivElement | null>;
  customDrawColorPickerContentRef: RefObject<HTMLDivElement | null>;
  customDrawColorPickerColor: string;
  setCustomDrawColorPickerColor: Dispatch<SetStateAction<string>>;
  onShapeFillColorChange: (ids: string[], fillColor: string) => void;
  onShapeFillStyleChange: (ids: string[], fillStyle: string) => void;
  onShapeStrokeColorChange: (ids: string[], strokeColor: string) => void;
  onShapeStrokeWidthChange: (ids: string[], strokeWidth: number) => void;
  onShapeStrokeStyleChange: (
    ids: string[],
    strokeStyle: "solid" | "dashed" | "none",
  ) => void;
  uniColor: (color: string) => string;
  activeSelectId: string | null;
  setActiveSelectId: (id: string | null) => void;
}

type PickerMode = "fill" | "stroke" | null;

export const SelectionShapeControls = ({
  scene,
  shapeColors,
  selectedIds,
  localeMessages,
  customDrawColorPickerWrapRef,
  customDrawColorPickerContentRef,
  customDrawColorPickerColor,
  setCustomDrawColorPickerColor,
  onShapeFillColorChange,
  onShapeFillStyleChange,
  onShapeStrokeColorChange,
  onShapeStrokeWidthChange: _onShapeStrokeWidthChange,
  onShapeStrokeStyleChange,
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
  const selectedFillPreviewColor =
    sharedFillColor === "multi"
      ? (selectedShapeElements[0]?.fill ?? scene.settings.shapeDefaults.fill)
      : sharedFillColor;
  const fillStyleSelectValue =
    getSharedValue(selectedShapeElements, (element) => element.fillStyle) ??
    "solid";
  const fillPalette = [...shapeColors[0], ...shapeColors[1]];
  const fillColorSelectValue = fillPalette.some(
    (color) =>
      color !== "multi" &&
      color.toLowerCase() === selectedFillPreviewColor.toLowerCase(),
  )
    ? selectedFillPreviewColor
    : "multi";
  const isSharedFillPresetColor = fillPalette.some(
    (color) =>
      color !== "multi" &&
      color.toLowerCase() === selectedFillPreviewColor.toLowerCase(),
  );

  const sharedStrokeColor =
    getSharedValue(selectedShapeElements, (element) => element.stroke) ??
    "multi";
  const selectedStrokePreviewColor =
    sharedStrokeColor === "multi"
      ? (selectedShapeElements[0]?.stroke ??
        scene.settings.shapeDefaults.stroke)
      : sharedStrokeColor;
  const strokeColorSelectValue = fillPalette.some(
    (color) =>
      color !== "multi" &&
      color.toLowerCase() === selectedStrokePreviewColor.toLowerCase(),
  )
    ? selectedStrokePreviewColor
    : "multi";
  const sharedStrokeStyle = getSharedValue(
    selectedShapeElements,
    (element) => element.strokeStyle,
  );
  const strokeStyleSelectValue =
    sharedStrokeStyle === "solid" ||
    sharedStrokeStyle === "dashed" ||
    sharedStrokeStyle === "none"
      ? sharedStrokeStyle
      : "solid";
  const isSharedStrokePresetColor = fillPalette.some(
    (color) =>
      color !== "multi" &&
      color.toLowerCase() === selectedStrokePreviewColor.toLowerCase(),
  );

  const keepFillSelectOpenOnNextCloseRef = useRef(false);
  const keepStrokeSelectOpenOnNextCloseRef = useRef(false);
  const [forcedCustomPickerMode, setForcedCustomPickerMode] =
    useState<PickerMode>(null);

  const openCustomColorPicker = (mode: Exclude<PickerMode, null>) => {
    const initialColor =
      mode === "fill" ? selectedFillPreviewColor : selectedStrokePreviewColor;

    setForcedCustomPickerMode(mode);
    setActiveSelectId(
      mode === "fill" ? "shape-fill-color" : "shape-stroke-color",
    );
    setCustomDrawColorPickerColor(parseColorForPicker(initialColor));
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      <div
        ref={customDrawColorPickerWrapRef}
        style={{ position: "relative", display: "inline-flex" }}
      >
        <Select
          open={activeSelectId === "shape-fill-color"}
          onOpenChange={(isOpen) => {
            if (isOpen) {
              setForcedCustomPickerMode(null);
              setActiveSelectId("shape-fill-color");
              return;
            }

            if (keepFillSelectOpenOnNextCloseRef.current) {
              keepFillSelectOpenOnNextCloseRef.current = false;
              return;
            }

            if (forcedCustomPickerMode === "fill") {
              setForcedCustomPickerMode(null);
            }

            setActiveSelectId(null);
          }}
          value={String(fillColorSelectValue)}
          onValueChange={(value) => {
            if (["solid", "hachure", "none"].includes(value)) {
              onShapeFillStyleChange(selectedShapeIds, value);
              return;
            }

            if (value === "multi") {
              openCustomColorPicker("fill");
              return;
            }

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
                  openCustomColorPicker("fill");
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
                  colors={shapeColors[0]}
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
                              keepFillSelectOpenOnNextCloseRef.current = true;
                              openCustomColorPicker("fill");
                            }
                          : undefined
                      }
                      onSelect={
                        isMulti
                          ? (event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              keepFillSelectOpenOnNextCloseRef.current = true;
                              openCustomColorPicker("fill");
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
                  realTotalColors={fillPalette}
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
                              keepFillSelectOpenOnNextCloseRef.current = true;
                              openCustomColorPicker("fill");
                            }
                          : undefined
                      }
                      onSelect={
                        isMulti
                          ? (event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              keepFillSelectOpenOnNextCloseRef.current = true;
                              openCustomColorPicker("fill");
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

      <Tooltip
        open={
          activeSelectId === "shape-fill-color" &&
          (forcedCustomPickerMode === "fill" || !isSharedFillPresetColor)
        }
      >
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
                onShapeFillColorChange(selectedShapeIds, next);
              }}
            />
          </div>
        </TooltipContent>
      </Tooltip>

      <Select
        open={activeSelectId === "shape-stroke-color"}
        onOpenChange={(isOpen) => {
          if (isOpen) {
            setForcedCustomPickerMode(null);
            setActiveSelectId("shape-stroke-color");
            return;
          }

          if (keepStrokeSelectOpenOnNextCloseRef.current) {
            keepStrokeSelectOpenOnNextCloseRef.current = false;
            return;
          }

          if (forcedCustomPickerMode === "stroke") {
            setForcedCustomPickerMode(null);
          }

          setActiveSelectId(null);
        }}
        value={String(strokeColorSelectValue)}
        onValueChange={(value) => {
          if (["solid", "dashed", "none"].includes(value)) {
            onShapeStrokeStyleChange(
              selectedShapeIds,
              value as "solid" | "dashed" | "none",
            );
            return;
          }

          if (value === "multi") {
            openCustomColorPicker("stroke");
            return;
          }

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
                openCustomColorPicker("stroke");
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
          <div className="drawo-colorstyle-container">
            <SelectItem
              className={
                "drawo-colorstyle-optionitem" +
                (strokeStyleSelectValue === "solid" ? " active" : "")
              }
              value="solid"
            >
              <SolidLine01Icon /> Sólido
            </SelectItem>
            <SelectItem
              className={
                "drawo-colorstyle-optionitem" +
                (strokeStyleSelectValue === "dashed" ? " active" : "")
              }
              value="dashed"
            >
              <DashedLine01Icon /> Discontinuo
            </SelectItem>
            <SelectItem
              className={
                "drawo-colorstyle-optionitem" +
                (strokeStyleSelectValue === "none" ? " active" : "")
              }
              value="none"
            >
              <OctagonXIcon /> Ninguno
            </SelectItem>
          </div>
          <hr className="drawo-colorstyle-separator" />
          <div>
            <ColorSwatchPicker
              colors={shapeColors[0]}
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
                          keepStrokeSelectOpenOnNextCloseRef.current = true;
                          openCustomColorPicker("stroke");
                        }
                      : undefined
                  }
                  onSelect={
                    isMulti
                      ? (event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          keepStrokeSelectOpenOnNextCloseRef.current = true;
                          openCustomColorPicker("stroke");
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
              realTotalColors={fillPalette}
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
                          keepStrokeSelectOpenOnNextCloseRef.current = true;
                          openCustomColorPicker("stroke");
                        }
                      : undefined
                  }
                  onSelect={
                    isMulti
                      ? (event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          keepStrokeSelectOpenOnNextCloseRef.current = true;
                          openCustomColorPicker("stroke");
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

      <Tooltip
        open={
          activeSelectId === "shape-stroke-color" &&
          (forcedCustomPickerMode === "stroke" || !isSharedStrokePresetColor)
        }
      >
        <TooltipTrigger asChild>
          <div />
        </TooltipTrigger>
        <TooltipContent
          className="drawo-content-color drawo-ultrainferior-colorcontent2"
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
                onShapeStrokeColorChange(selectedShapeIds, next);
              }}
            />
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
