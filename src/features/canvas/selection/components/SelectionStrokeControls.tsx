import {
  type CSSProperties,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import Chrome from "@uiw/react-color-chrome";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/select";
import { ColorSwatchPicker } from "@shared/ui/ColorSwatchPicker";
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/ui/tooltip";
import type { LineCap } from "@core/elements";
import type { NewElementType, Scene } from "@core/scene";
import type { LocaleMessages } from "@shared/i18n";
import {
  DRAW_STROKE_OPTIONS,
  DRAW_STROKE_PREVIEWS,
  getClosestDrawStrokeOption,
  getClosestMarkerStrokeOption,
  LINE_STROKELINECAPS,
  LINE_STROKELINECAPS_PREVIEWS,
  MARKER_STROKE_OPTIONS,
  MARKER_STROKE_PREVIEWS,
} from "@features/canvas/rendering/constants";
import { parseColorForPicker } from "@features/canvas/rendering/color";
import {
  getSelectedDrawElements,
  getSelectedLineElements,
  getSharedValue,
} from "@features/canvas/selection/selectionState";

interface SelectionStrokeControlsProps {
  scene: Scene;
  strokeColors: readonly string[];
  selectedIds: string[];
  drawingTool: NewElementType | "laser" | null;
  localeMessages: LocaleMessages;
  customDrawColorPickerWrapRef: RefObject<HTMLDivElement | null>;
  customDrawColorPickerContentRef: RefObject<HTMLDivElement | null>;
  isCustomDrawColorPickerOpen: boolean;
  setIsCustomDrawColorPickerOpen: Dispatch<SetStateAction<boolean>>;
  customDrawColorPickerColor: string;
  setCustomDrawColorPickerColor: Dispatch<SetStateAction<string>>;
  onDrawStrokeWidthChange: (ids: string[], strokeWidth: number) => void;
  onDrawStrokeColorChange: (ids: string[], strokeColor: string) => void;
  onDrawDefaultStrokeColorChange: (
    drawMode: "draw" | "marker" | "quill",
    strokeColor: string,
  ) => void;
  onLineStartCapChange: (ids: string[], startCap: LineCap) => void;
  onLineEndCapChange: (ids: string[], endCap: LineCap) => void;
  uniColor: (color: string) => string;
  activeSelectId: string | null;
  setActiveSelectId: (id: string | null) => void;
}

const renderDrawStrokePreview = (
  previews: typeof DRAW_STROKE_PREVIEWS,
  index: number,
) => {
  const preview = previews[index] ?? previews[0];
  if (!preview) {
    return null;
  }

  return (
    <svg
      width={preview.width}
      height={preview.height}
      viewBox={preview.viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={preview.path}
        stroke={preview.strokeWidth ? "currentColor" : undefined}
        strokeWidth={preview.strokeWidth}
        strokeLinecap={preview.strokeWidth ? "round" : undefined}
        fill={preview.fill}
      />
    </svg>
  );
};

export const SelectionStrokeControls = ({
  scene,
  strokeColors,
  selectedIds,
  drawingTool,
  localeMessages,
  customDrawColorPickerWrapRef,
  customDrawColorPickerContentRef,
  isCustomDrawColorPickerOpen,
  setIsCustomDrawColorPickerOpen,
  customDrawColorPickerColor,
  setCustomDrawColorPickerColor,
  onDrawStrokeWidthChange,
  onDrawStrokeColorChange,
  onDrawDefaultStrokeColorChange,
  onLineStartCapChange,
  onLineEndCapChange,
  uniColor,
  activeSelectId,
  setActiveSelectId,
}: SelectionStrokeControlsProps) => {
  const selectedDrawElements = getSelectedDrawElements(
    scene.elements,
    selectedIds,
  );
  const selectedLineElements = getSelectedLineElements(
    scene.elements,
    selectedIds,
  );
  const selectedDrawMode =
    getSharedValue(
      selectedDrawElements,
      (element) => element.drawMode ?? "draw",
    ) ?? "draw";
  const strokeOptions =
    selectedDrawMode === "marker" ? MARKER_STROKE_OPTIONS : DRAW_STROKE_OPTIONS;
  const strokePreviews =
    selectedDrawMode === "marker"
      ? MARKER_STROKE_PREVIEWS
      : DRAW_STROKE_PREVIEWS;
  const selectedDrawStrokeWidth =
    selectedDrawMode === "marker"
      ? getClosestMarkerStrokeOption(
          getSharedValue(
            selectedDrawElements,
            (element) => element.strokeWidth,
          ) ?? MARKER_STROKE_OPTIONS[0],
        )
      : getClosestDrawStrokeOption(
          getSharedValue(
            selectedDrawElements,
            (element) => element.strokeWidth,
          ) ?? DRAW_STROKE_OPTIONS[1],
        );
  const defaultDrawStrokeColor =
    selectedDrawMode === "marker"
      ? scene.settings.drawDefaults.markerStroke
      : selectedDrawMode === "quill"
        ? scene.settings.drawDefaults.quillStroke
        : scene.settings.drawDefaults.drawStroke;
  const selectedDrawStrokeColor =
    selectedDrawElements[0]?.stroke || defaultDrawStrokeColor;
  const drawStrokeColorSelectValue = strokeColors.some(
    (color) =>
      color !== "multi" &&
      color.toLowerCase() === selectedDrawStrokeColor.toLowerCase(),
  )
    ? selectedDrawStrokeColor
    : "multi";

  const selectedLineStrokeColor =
    getSharedValue(selectedLineElements, (element) => element.stroke) ??
    "multi";
  const selectedLineStrokePreviewColor =
    selectedLineStrokeColor === "multi"
      ? (selectedLineElements[0]?.stroke ?? scene.settings.shapeDefaults.lineStroke)
      : selectedLineStrokeColor;
  const lineStrokeColorSelectValue = strokeColors.some(
    (color) =>
      color !== "multi" &&
      color.toLowerCase() === selectedLineStrokeColor.toLowerCase(),
  )
    ? selectedLineStrokeColor
    : "multi";
  const selectedLineStrokeWidth = getClosestDrawStrokeOption(
    getSharedValue(selectedLineElements, (element) => element.strokeWidth) ??
      DRAW_STROKE_OPTIONS[1],
  );

  const openCustomDrawColorPicker = (initialColor: string) => {
    setCustomDrawColorPickerColor(parseColorForPicker(initialColor));
    setIsCustomDrawColorPickerOpen(true);
  };

  const renderDrawStrokeSelector = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      <div
        ref={customDrawColorPickerWrapRef}
        style={{ position: "relative", display: "inline-flex" }}
      >
        <Select
          open={
            activeSelectId === "draw-stroke-color" ||
            isCustomDrawColorPickerOpen ||
            undefined
          }
          onOpenChange={(isOpen) => {
            if (isOpen) {
              setActiveSelectId("draw-stroke-color");
            } else if (activeSelectId === "draw-stroke-color") {
              setActiveSelectId(null);
            }
          }}
          value={String(drawStrokeColorSelectValue)}
          onValueChange={(value) => {
            if (value === "multi") {
              openCustomDrawColorPicker(selectedDrawStrokeColor);
              return;
            }

            setIsCustomDrawColorPickerOpen(false);
            setActiveSelectId(null);

            if (selectedDrawElements.length === 0) {
              onDrawDefaultStrokeColorChange(selectedDrawMode, value);
              return;
            }

            onDrawStrokeColorChange(
              selectedDrawElements.map((element) => element.id),
              value,
            );
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger
                onPointerDown={(event) => {
                  if (drawStrokeColorSelectValue !== "multi") {
                    return;
                  }

                  event.preventDefault();
                  event.stopPropagation();
                  openCustomDrawColorPicker(selectedDrawStrokeColor);
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
                    borderRadius: "100%",
                    border: "1px solid #ffffff20",
                    height: "20px",
                    background: uniColor(
                      selectedDrawStrokeColor || defaultDrawStrokeColor,
                    ),
                  }}
                />
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>{localeMessages.selectionBar.strokeColor}</p>
            </TooltipContent>
          </Tooltip>
          <SelectContent
            position="popper"
            className="drawo-colorselect-content"
          >
            <ColorSwatchPicker
              colors={strokeColors}
              currentColor={selectedDrawStrokeColor}
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
                          openCustomDrawColorPicker(selectedDrawStrokeColor);
                        }
                      : undefined
                  }
                  onSelect={
                    isMulti
                      ? (event) => {
                          event.preventDefault();
                          openCustomDrawColorPicker(selectedDrawStrokeColor);
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
      </div>

      <Tooltip open={isCustomDrawColorPickerOpen}>
        <TooltipTrigger asChild>
          <div className="selectionbar-separator" />
        </TooltipTrigger>
        <TooltipContent
          className="drawo-content-color"
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
                if (next) {
                  setCustomDrawColorPickerColor(next);

                  if (selectedDrawElements.length === 0) {
                    onDrawDefaultStrokeColorChange(selectedDrawMode, next);
                    return;
                  }

                  onDrawStrokeColorChange(
                    selectedDrawElements.map((element) => element.id),
                    next,
                  );
                }
              }}
            />
          </div>
        </TooltipContent>
      </Tooltip>
      <Select
        open={activeSelectId === "draw-stroke-width"}
        onOpenChange={(isOpen) => {
          if (isOpen) {
            setActiveSelectId("draw-stroke-width");
          } else if (activeSelectId === "draw-stroke-width") {
            setActiveSelectId(null);
          }
        }}
        value={String(selectedDrawStrokeWidth)}
        onValueChange={(value) => {
          setActiveSelectId(null);
          onDrawStrokeWidthChange(
            selectedDrawElements.map((element) => element.id),
            Number(value),
          );
        }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <SelectTrigger
              className="draw-stroke-trigger"
              style={{ gap: "0px", width: "fit-content" }}
            >
              <span style={{ width: "0px", overflow: "hidden" }}>
                <SelectValue
                  placeholder={localeMessages.selectionBar.strokeWidth}
                />
              </span>
              <span className="draw-stroke-option-line-wrap">
                {renderDrawStrokePreview(
                  strokePreviews,
                  Math.max(
                    0,
                    strokeOptions.findIndex(
                      (option) => option === selectedDrawStrokeWidth,
                    ),
                  ),
                )}
              </span>
            </SelectTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{localeMessages.selectionBar.strokeWidth}</p>
          </TooltipContent>
        </Tooltip>
        <SelectContent position="popper">
          {strokeOptions.map((strokeWidth, index) => (
            <SelectItem
              key={strokeWidth}
              check={false}
              value={String(strokeWidth)}
              className="draw-stroke-select-item"
            >
              <span className="draw-stroke-option-line-wrap">
                {renderDrawStrokePreview(strokePreviews, index)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const renderLineStrokeColorSelector = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      <div
        ref={customDrawColorPickerWrapRef}
        style={{ position: "relative", display: "inline-flex" }}
      >
        <Select
          open={
            activeSelectId === "line-stroke-color" ||
            isCustomDrawColorPickerOpen
          }
          onOpenChange={(isOpen) => {
            if (isOpen) {
              setActiveSelectId("line-stroke-color");
            } else if (activeSelectId === "line-stroke-color") {
              setActiveSelectId(null);
            }
          }}
          value={String(lineStrokeColorSelectValue)}
          onValueChange={(value) => {
            if (value === "multi") {
              openCustomDrawColorPicker(selectedLineStrokePreviewColor);
              return;
            }

            setIsCustomDrawColorPickerOpen(false);
            setActiveSelectId(null);
            onDrawStrokeColorChange(
              selectedLineElements.map((element) => element.id),
              value,
            );
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger
                onPointerDown={(event) => {
                  if (lineStrokeColorSelectValue !== "multi") {
                    return;
                  }

                  event.preventDefault();
                  event.stopPropagation();
                  openCustomDrawColorPicker(selectedLineStrokePreviewColor);
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
                    borderRadius: "100%",
                    border: "1px solid #ffffff20",
                    height: "20px",
                    background: uniColor(selectedLineStrokePreviewColor),
                  }}
                />
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>{localeMessages.selectionBar.strokeColor}</p>
            </TooltipContent>
          </Tooltip>
          <SelectContent
            position="popper"
            className="drawo-colorselect-content"
          >
            <ColorSwatchPicker
              colors={strokeColors}
              currentColor={selectedLineStrokePreviewColor}
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
                          openCustomDrawColorPicker(
                            selectedLineStrokePreviewColor,
                          );
                        }
                      : undefined
                  }
                  onSelect={
                    isMulti
                      ? (event) => {
                          event.preventDefault();
                          openCustomDrawColorPicker(
                            selectedLineStrokePreviewColor,
                          );
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
      </div>

      <Tooltip open={isCustomDrawColorPickerOpen}>
        <TooltipTrigger asChild>
          <div className="selectionbar-separator" />
        </TooltipTrigger>
        <TooltipContent
          className="drawo-content-color"
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
                if (next) {
                  setCustomDrawColorPickerColor(next);
                  onDrawStrokeColorChange(
                    selectedLineElements.map((element) => element.id),
                    next,
                  );
                }
              }}
            />
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );

  const renderLineCapSelector = () => {
    const selectedStartCap = getSharedValue(
      selectedLineElements,
      (element) => element.startCap,
    );
    const selectedEndCap = getSharedValue(
      selectedLineElements,
      (element) => element.endCap,
    );

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Select
          open={activeSelectId === "line-start-cap"}
          onOpenChange={(isOpen) => {
            if (isOpen) {
              setActiveSelectId("line-start-cap");
            } else if (activeSelectId === "line-start-cap") {
              setActiveSelectId(null);
            }
          }}
          value={selectedStartCap || ""}
          onValueChange={(value) => {
            setActiveSelectId(null);
            onLineStartCapChange(
              selectedLineElements.map((element) => element.id),
              value as LineCap,
            );
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger>
                <SelectValue placeholder="Start cap" />
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Line start cap</p>
            </TooltipContent>
          </Tooltip>
          <SelectContent position="popper">
            {LINE_STROKELINECAPS.map((name, i) => {
              const prev = LINE_STROKELINECAPS_PREVIEWS[i];
              return (
                <SelectItem
                  key={`${name}-${i}-start`}
                  className="arrowlinecap-selectitem"
                  check={false}
                  style={
                    {
                      cssText: `
align-items: center!important;
justify-content: center!important;
width: fit-content!important
display: flex;
padding: 8px 0px!important;
                      `,
                    } as CSSProperties
                  }
                  value={name}
                >
                  <svg
                    width={prev.width / 2}
                    viewBox={prev.viewBox}
                    fill="none"
                    style={
                      {
                        cssText: `
                          scale: 0.8;
                          transform: scaleX(-1)!important;
                        `,
                      } as CSSProperties
                    }
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d={prev.path}
                      strokeWidth={prev.strokeWidth}
                      strokeLinecap={prev.strokeLinecap}
                      fill={prev.fill}
                      stroke={prev.stroke}
                    />
                  </svg>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <div className="selectionbar-separator" />

        <Select
          open={activeSelectId === "line-end-cap"}
          onOpenChange={(isOpen) => {
            if (isOpen) {
              setActiveSelectId("line-end-cap");
            } else if (activeSelectId === "line-end-cap") {
              setActiveSelectId(null);
            }
          }}
          value={selectedEndCap || ""}
          onValueChange={(value) => {
            setActiveSelectId(null);
            onLineEndCapChange(
              selectedLineElements.map((element) => element.id),
              value as LineCap,
            );
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger>
                <SelectValue placeholder="End cap" />
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Line end cap</p>
            </TooltipContent>
          </Tooltip>
          <SelectContent position="popper">
            {LINE_STROKELINECAPS.map((name, i) => {
              const prev = LINE_STROKELINECAPS_PREVIEWS[i];
              return (
                <SelectItem
                  key={`${name}-${i}-end`}
                  className="arrowlinecap-selectitem"
                  check={false}
                  style={
                    {
                      cssText: `
align-items: center!important;
justify-content: center!important;
width: fit-content!important
display: flex;
padding: 8px 0px!important;
                      `,
                    } as CSSProperties
                  }
                  value={name}
                >
                  <svg
                    width={prev.width / 2}
                    viewBox={prev.viewBox}
                    fill="none"
                    style={
                      {
                        cssText: `
                          scale: 0.8;
                        `,
                      } as CSSProperties
                    }
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d={prev.path}
                      strokeWidth={prev.strokeWidth}
                      strokeLinecap={prev.strokeLinecap}
                      fill={prev.fill}
                      stroke={prev.stroke}
                    />
                  </svg>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const renderLineStrokeWidthSelector = () => (
    <Select
      open={activeSelectId === "line-stroke-width"}
      onOpenChange={(isOpen) => {
        if (isOpen) {
          setActiveSelectId("line-stroke-width");
        } else if (activeSelectId === "line-stroke-width") {
          setActiveSelectId(null);
        }
      }}
      value={String(selectedLineStrokeWidth)}
      onValueChange={(value) => {
        setActiveSelectId(null);
        onDrawStrokeWidthChange(
          selectedLineElements.map((element) => element.id),
          Number(value),
        );
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <SelectTrigger
            className="draw-stroke-trigger"
            style={{ gap: "0px", width: "fit-content" }}
          >
            <span style={{ width: "0px", overflow: "hidden" }}>
              <SelectValue
                placeholder={localeMessages.selectionBar.strokeWidth}
              />
            </span>
            <span className="draw-stroke-option-line-wrap">
              {renderDrawStrokePreview(
                DRAW_STROKE_PREVIEWS,
                Math.max(
                  0,
                  DRAW_STROKE_OPTIONS.findIndex(
                    (option) => option === selectedLineStrokeWidth,
                  ),
                ),
              )}
            </span>
          </SelectTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>{localeMessages.selectionBar.strokeWidth}</p>
        </TooltipContent>
      </Tooltip>
      <SelectContent position="popper">
        {DRAW_STROKE_OPTIONS.map((strokeWidth, index) => (
          <SelectItem
            key={strokeWidth}
            check={false}
            value={String(strokeWidth)}
            className="draw-stroke-select-item"
          >
            <span className="draw-stroke-option-line-wrap">
              {renderDrawStrokePreview(DRAW_STROKE_PREVIEWS, index)}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (selectedIds.length > 1) {
    if (selectedDrawElements.length === selectedIds.length) {
      return renderDrawStrokeSelector();
    }

    return <></>;
  }

  if (selectedDrawElements.length > 0) {
    return renderDrawStrokeSelector();
  }

  if (selectedLineElements.length > 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {renderLineStrokeColorSelector()}
        {renderLineStrokeWidthSelector()}
        <div className="selectionbar-separator" />
        {renderLineCapSelector()}
      </div>
    );
  }

  if (
    drawingTool === "draw" ||
    drawingTool === "marker" ||
    drawingTool === "quill"
  ) {
    return renderDrawStrokeSelector();
  }

  return <></>;
};
