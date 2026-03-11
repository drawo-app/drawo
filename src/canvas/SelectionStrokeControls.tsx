import { type CSSProperties, type Dispatch, type RefObject, type SetStateAction } from "react";
import Chrome from "@uiw/react-color-chrome";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/tooltip";
import type { LineCap } from "../core/elements";
import type { NewElementType, Scene } from "../core/scene";
import type { LocaleMessages } from "../i18n";
import {
  DRAW_STROKE_OPTIONS,
  DRAW_STROKE_PREVIEWS,
  getClosestDrawStrokeOption,
  getClosestMarkerStrokeOption,
  LINE_STROKELINECAPS,
  LINE_STROKELINECAPS_PREVIEWS,
  MARKER_STROKE_OPTIONS,
  MARKER_STROKE_PREVIEWS,
  STROKE_COLORS,
} from "./constants";
import { parseColorForPicker } from "./color";
import {
  getSelectedDrawElements,
  getSelectedLineElements,
  getSharedValue,
} from "./selectionState";

interface SelectionStrokeControlsProps {
  scene: Scene;
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
}: SelectionStrokeControlsProps) => {
  const selectedDrawElements = getSelectedDrawElements(scene.elements, selectedIds);
  const selectedLineElements = getSelectedLineElements(scene.elements, selectedIds);
  const selectedDrawMode =
    getSharedValue(selectedDrawElements, (element) => element.drawMode ?? "draw") ??
    "draw";
  const strokeOptions =
    selectedDrawMode === "marker" ? MARKER_STROKE_OPTIONS : DRAW_STROKE_OPTIONS;
  const strokePreviews =
    selectedDrawMode === "marker" ? MARKER_STROKE_PREVIEWS : DRAW_STROKE_PREVIEWS;
  const selectedDrawStrokeWidth =
    selectedDrawMode === "marker"
      ? getClosestMarkerStrokeOption(
          getSharedValue(selectedDrawElements, (element) => element.strokeWidth) ??
            MARKER_STROKE_OPTIONS[0],
        )
      : getClosestDrawStrokeOption(
          getSharedValue(selectedDrawElements, (element) => element.strokeWidth) ??
            DRAW_STROKE_OPTIONS[1],
        );
  const defaultDrawStrokeColor =
    selectedDrawMode === "marker"
      ? scene.settings.drawDefaults.markerStroke
      : selectedDrawMode === "quill"
        ? scene.settings.drawDefaults.quillStroke
        : scene.settings.drawDefaults.drawStroke;
  const selectedDrawStrokeColor =
    selectedDrawElements[0]?.stroke || defaultDrawStrokeColor;
  const drawStrokeColorSelectValue = STROKE_COLORS.some(
    (color) =>
      color !== "multi" &&
      color.toLowerCase() === selectedDrawStrokeColor.toLowerCase(),
  )
    ? selectedDrawStrokeColor
    : "multi";

  const selectedLineStrokeColor =
    getSharedValue(selectedLineElements, (element) => element.stroke) ?? "multi";
  const selectedLineStrokePreviewColor =
    selectedLineStrokeColor === "multi"
      ? (selectedLineElements[0]?.stroke ?? "#2f3b52")
      : selectedLineStrokeColor;
  const lineStrokeColorSelectValue = STROKE_COLORS.some(
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
          open={isCustomDrawColorPickerOpen || undefined}
          value={String(drawStrokeColorSelectValue)}
          onValueChange={(value) => {
            if (value === "multi") {
              openCustomDrawColorPicker(selectedDrawStrokeColor);
              return;
            }

            setIsCustomDrawColorPickerOpen(false);

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
                  <SelectValue placeholder={localeMessages.selectionBar.strokeColor} />
                </span>
                <div
                  style={{
                    width: "20px",
                    borderRadius: "100%",
                    border: "1px solid #ffffff20",
                    height: "20px",
                    background: uniColor(selectedDrawStrokeColor || defaultDrawStrokeColor),
                  }}
                />
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>{localeMessages.selectionBar.strokeColor}</p>
            </TooltipContent>
          </Tooltip>
          <SelectContent position="popper" className="drawo-colorselect-content">
            {STROKE_COLORS.map((color) => (
              <SelectItem
                key={color}
                value={color}
                className="drawo-colorselect-item"
                check={false}
                onPointerDown={
                  color === "multi"
                    ? (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        openCustomDrawColorPicker(selectedDrawStrokeColor);
                      }
                    : undefined
                }
                onSelect={
                  color === "multi"
                    ? (event) => {
                        event.preventDefault();
                        openCustomDrawColorPicker(selectedDrawStrokeColor);
                      }
                    : undefined
                }
              >
                <div
                  style={{
                    border:
                      drawStrokeColorSelectValue === color
                        ? "2px solid var(--accent)"
                        : "2px solid transparent",
                    borderRadius: "100%",
                    padding: "2px",
                  }}
                >
                  <div
                    style={{
                      width: color === "multi" ? "22px" : "20px",
                      borderRadius: "100%",
                      border: color !== "multi" ? "1px solid #ffffff20" : "none",
                      height: color === "multi" ? "22px" : "20px",
                      background:
                        color === "multi"
                          ? `
                        radial-gradient(circle at center,
                          rgba(255,255,255,1) 0%,
                          rgba(255,255,255,0.85) 10%,
                          rgba(255,255,255,0.55) 22%,
                          rgba(255,255,255,0.15) 40%,
                          transparent 62%
                        ),
                        radial-gradient(circle at 36% 32%, rgba(255,255,255,0.35) 0%, transparent 35%),
                        radial-gradient(circle at 68% 70%, rgba(0,0,0,0.38) 0%, transparent 52%),
                        conic-gradient(
                          from 0deg,
                          hsl(0,   70%, 65%),
                          hsl(30,  72%, 63%),
                          hsl(55,  70%, 62%),
                          hsl(80,  60%, 60%),
                          hsl(120, 55%, 60%),
                          hsl(160, 60%, 58%),
                          hsl(185, 65%, 60%),
                          hsl(210, 68%, 63%),
                          hsl(240, 65%, 66%),
                          hsl(270, 65%, 65%),
                          hsl(300, 65%, 64%),
                          hsl(330, 68%, 64%),
                          hsl(360, 70%, 65%)`
                          : uniColor(color),
                    }}
                  />
                </div>
              </SelectItem>
            ))}
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
        value={String(selectedDrawStrokeWidth)}
        onValueChange={(value) => {
          onDrawStrokeWidthChange(
            selectedDrawElements.map((element) => element.id),
            Number(value),
          );
        }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <SelectTrigger className="draw-stroke-trigger" style={{ gap: "0px", width: "fit-content" }}>
              <span style={{ width: "0px", overflow: "hidden" }}>
                <SelectValue placeholder={localeMessages.selectionBar.strokeWidth} />
              </span>
              <span className="draw-stroke-option-line-wrap">
                {renderDrawStrokePreview(
                  strokePreviews,
                  Math.max(
                    0,
                    strokeOptions.findIndex((option) => option === selectedDrawStrokeWidth),
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
          open={isCustomDrawColorPickerOpen || undefined}
          value={String(lineStrokeColorSelectValue)}
          onValueChange={(value) => {
            if (value === "multi") {
              openCustomDrawColorPicker(selectedLineStrokePreviewColor);
              return;
            }

            setIsCustomDrawColorPickerOpen(false);
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
                  <SelectValue placeholder={localeMessages.selectionBar.strokeColor} />
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
          <SelectContent position="popper" className="drawo-colorselect-content">
            {STROKE_COLORS.map((color) => (
              <SelectItem
                key={color}
                value={color}
                className="drawo-colorselect-item"
                check={false}
                onPointerDown={
                  color === "multi"
                    ? (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        openCustomDrawColorPicker(selectedLineStrokePreviewColor);
                      }
                    : undefined
                }
                onSelect={
                  color === "multi"
                    ? (event) => {
                        event.preventDefault();
                        openCustomDrawColorPicker(selectedLineStrokePreviewColor);
                      }
                    : undefined
                }
              >
                <div
                  style={{
                    border:
                      lineStrokeColorSelectValue === color
                        ? "2px solid var(--accent)"
                        : "2px solid transparent",
                    borderRadius: "100%",
                    padding: "2px",
                  }}
                >
                  <div
                    style={{
                      width: color === "multi" ? "22px" : "20px",
                      borderRadius: "100%",
                      border: color !== "multi" ? "1px solid #ffffff20" : "none",
                      height: color === "multi" ? "22px" : "20px",
                      background:
                        color === "multi"
                          ? `
                        radial-gradient(circle at center,
                          rgba(255,255,255,1) 0%,
                          rgba(255,255,255,0.85) 10%,
                          rgba(255,255,255,0.55) 22%,
                          rgba(255,255,255,0.15) 40%,
                          transparent 62%
                        ),
                        radial-gradient(circle at 36% 32%, rgba(255,255,255,0.35) 0%, transparent 35%),
                        radial-gradient(circle at 68% 70%, rgba(0,0,0,0.38) 0%, transparent 52%),
                        conic-gradient(
                          from 0deg,
                          hsl(0,   70%, 65%),
                          hsl(30,  72%, 63%),
                          hsl(55,  70%, 62%),
                          hsl(80,  60%, 60%),
                          hsl(120, 55%, 60%),
                          hsl(160, 60%, 58%),
                          hsl(185, 65%, 60%),
                          hsl(210, 68%, 63%),
                          hsl(240, 65%, 66%),
                          hsl(270, 65%, 65%),
                          hsl(300, 65%, 64%),
                          hsl(330, 68%, 64%),
                          hsl(360, 70%, 65%)`
                          : uniColor(color),
                    }}
                  />
                </div>
              </SelectItem>
            ))}
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
          value={selectedStartCap || ""}
          onValueChange={(value) => {
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
          value={selectedEndCap || ""}
          onValueChange={(value) => {
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
      value={String(selectedLineStrokeWidth)}
      onValueChange={(value) => {
        onDrawStrokeWidthChange(
          selectedLineElements.map((element) => element.id),
          Number(value),
        );
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <SelectTrigger className="draw-stroke-trigger" style={{ gap: "0px", width: "fit-content" }}>
            <span style={{ width: "0px", overflow: "hidden" }}>
              <SelectValue placeholder={localeMessages.selectionBar.strokeWidth} />
            </span>
            <span className="draw-stroke-option-line-wrap">
              {renderDrawStrokePreview(
                DRAW_STROKE_PREVIEWS,
                Math.max(
                  0,
                  DRAW_STROKE_OPTIONS.findIndex((option) => option === selectedLineStrokeWidth),
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

  if (drawingTool === "draw" || drawingTool === "marker" || drawingTool === "quill") {
    return renderDrawStrokeSelector();
  }

  return <></>;
};
