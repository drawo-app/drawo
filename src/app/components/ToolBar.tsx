import { useState, type Dispatch, type SetStateAction } from "react";
import type { NewElementType } from "../../core/scene";
import type { LocaleMessages } from "../../i18n";
import { ArrowUp, MapArrowUp, Pen, Text } from "@solar-icons/react";
import {
  GrabHandLinear,
  LaserIcon,
  SquareLinear,
} from "../../components/icons";
import { Circle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../components/tooltip";
import { MarkerIcon, PenIcon, QuillIcon } from "./Draw/icons";
import { invertLightnessPreservingHue } from "../../canvas/color";
import Chrome from "@uiw/react-color-chrome";
import {
  DRAW_STROKE_OPTIONS,
  DRAW_STROKE_PREVIEWS,
  MARKER_STROKE_OPTIONS,
  MARKER_STROKE_PREVIEWS,
  STROKE_COLORS,
} from "../../canvas/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/select";

interface ToolBarProps {
  interactionMode: "select" | "pan";
  drawingTool: NewElementType | "laser" | null;
  messages: LocaleMessages;
  setInteractionMode: Dispatch<SetStateAction<"select" | "pan">>;
  setDrawingTool: Dispatch<SetStateAction<NewElementType | "laser" | null>>;
  drawDefaults: {
    drawStroke: string;
    markerStroke: string;
    quillStroke: string;
    drawStrokeWidth: number;
    markerStrokeWidth: number;
    quillStrokeWidth: number;
  };
  onDrawDefaultStrokeColorChange: (
    drawMode: "draw" | "marker" | "quill",
    strokeColor: string,
  ) => void;
  onDrawDefaultStrokeWidthChange: (
    drawMode: "draw" | "marker" | "quill",
    strokeWidth: number,
  ) => void;
}

export const ToolBar = ({
  interactionMode,
  drawingTool,
  messages,
  setInteractionMode,
  setDrawingTool,
  drawDefaults,
  onDrawDefaultStrokeColorChange,
  onDrawDefaultStrokeWidthChange,
}: ToolBarProps) => {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const getActiveDrawMode = () =>
    drawingTool === "marker"
      ? "marker"
      : drawingTool === "quill"
        ? "quill"
        : "draw";

  const [colorPickerColor, setColorPickerColor] = useState(
    drawingTool === "marker"
      ? drawDefaults.markerStroke
      : drawingTool === "quill"
        ? drawDefaults.quillStroke
        : drawDefaults.drawStroke,
  );

  const strokeOptions =
    drawingTool === "marker" ? MARKER_STROKE_OPTIONS : DRAW_STROKE_OPTIONS;
  const strokePreviews =
    drawingTool === "marker" ? MARKER_STROKE_PREVIEWS : DRAW_STROKE_PREVIEWS;

  const uniColor = (color: string) =>
    document.documentElement.classList.contains("dark")
      ? invertLightnessPreservingHue(color)
      : color;

  const currentColor =
    drawingTool === "marker"
      ? drawDefaults.markerStroke
      : drawingTool === "quill"
        ? drawDefaults.quillStroke
        : drawDefaults.drawStroke;

  const handleColorChange = (color: { hexa?: string; hex?: string }) => {
    const next = color.hexa || color.hex;
    if (next) {
      setColorPickerColor(next);
      const drawMode = getActiveDrawMode();
      onDrawDefaultStrokeColorChange(drawMode, next);
    }
  };

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

  const drawTools = ["draw", "marker", "quill"];
  return (
    <div className="tool-bar">
      {drawTools.includes(drawingTool) ? (
        <div className="top-toolbar">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={`drawtool-elem tool-item${drawingTool === "draw" ? " active" : ""}`}
                onClick={() => {
                  setInteractionMode("select");
                  setDrawingTool("draw");
                  setIsColorPickerOpen(false);
                }}
              >
                <PenIcon
                  color={uniColor(drawDefaults.drawStroke)}
                  className="drawtool-icon"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{messages.toolNames.pen}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={`drawtool-elem tool-item${drawingTool === "quill" ? " active" : ""}`}
                onClick={() => {
                  setInteractionMode("select");
                  setDrawingTool("quill");
                  setIsColorPickerOpen(false);
                }}
              >
                <QuillIcon
                  color={uniColor(drawDefaults.quillStroke)}
                  className="drawtool-icon "
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{messages.toolNames.quill}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={`drawtool-elem tool-item${drawingTool === "marker" ? " active" : ""}`}
                onClick={() => {
                  setInteractionMode("select");
                  setDrawingTool("marker");
                  setIsColorPickerOpen(false);
                }}
              >
                <MarkerIcon
                  color={uniColor(drawDefaults.markerStroke)}
                  className="drawtool-icon"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{messages.toolNames.marker}</p>
            </TooltipContent>
          </Tooltip>
          <div className="tool-separator" />
          {STROKE_COLORS.map((color) => (
            <div
              key={color}
              className="drawo-colorselect-item"
              onClick={() => {
                color === "multi"
                  ? setIsColorPickerOpen(!isColorPickerOpen)
                  : (() => {
                      setIsColorPickerOpen(false);
                      handleColorChange({
                        hex: color,
                      });
                    })();
              }}
            >
              {/* onPointerDown={
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
              } */}
              <div
                style={{
                  border:
                    currentColor === color ||
                    (color === "multi" &&
                      !STROKE_COLORS.includes(currentColor as any))
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
            </div>
          ))}

          <Tooltip open={isColorPickerOpen}>
            <TooltipTrigger asChild>
              <span style={{ opacity: 0 }}>.</span>
            </TooltipTrigger>
            <TooltipContent
              className="drawo-content-color inferior"
              side="bottom"
              style={{ background: "transparent", padding: 0 }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <Chrome color={colorPickerColor} onChange={handleColorChange} />
            </TooltipContent>
          </Tooltip>

          <div className="tool-separator" />

          <Select
            value={String(
              drawingTool === "marker"
                ? drawDefaults.markerStrokeWidth
                : drawingTool === "quill"
                  ? drawDefaults.quillStrokeWidth
                  : drawDefaults.drawStrokeWidth,
            )}
            onValueChange={(value) => {
              const drawMode = getActiveDrawMode();
              onDrawDefaultStrokeWidthChange(drawMode, Number(value));
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <SelectTrigger
                  noArrow
                  className="draw-stroke-trigger"
                  style={{
                    gap: "0px",
                    width: "fit-content",
                  }}
                >
                  <span className="draw-stroke-option-line-wrap">
                    {(() => {
                      const currentWidth =
                        drawingTool === "marker"
                          ? drawDefaults.markerStrokeWidth
                          : drawingTool === "quill"
                            ? drawDefaults.quillStrokeWidth
                            : drawDefaults.drawStrokeWidth;
                      const index = Math.max(
                        0,
                        strokeOptions.findIndex(
                          (option) => option === currentWidth,
                        ),
                      );
                      return renderDrawStrokePreview(strokePreviews, index);
                    })()}
                  </span>
                </SelectTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>{messages.selectionBar?.strokeWidth || "Stroke Width"}</p>
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
      ) : (
        <></>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`tool-item${interactionMode === "select" && !drawingTool ? " active" : ""}`}
            onClick={() => {
              setInteractionMode("select");
              setDrawingTool(null);
            }}
          >
            <MapArrowUp
              style={{
                transform: "translateY(-2px) translateX(-3px) rotate(-46deg)",
              }}
              strokeWidth={0.1}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{messages.toolNames.selection}</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`tool-item${interactionMode === "pan" ? " active" : ""}`}
            onClick={() => {
              setInteractionMode("pan");
              setDrawingTool(null);
            }}
          >
            <GrabHandLinear />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{messages.toolNames.pan}</p>
        </TooltipContent>
      </Tooltip>

      <div className="tool-separator" />

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`tool-item${drawingTool === "text" ? " active" : ""}`}
            onClick={() => {
              setInteractionMode("select");
              setDrawingTool("text");
            }}
          >
            <Text strokeWidth={0.1} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{messages.toolNames.text}</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`tool-item${drawingTool === "rectangle" ? " active" : ""}`}
            onClick={() => {
              setInteractionMode("select");
              setDrawingTool("rectangle");
            }}
          >
            <SquareLinear />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{messages.toolNames.rectangle}</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`tool-item${drawingTool === "circle" ? " active" : ""}`}
            onClick={() => {
              setInteractionMode("select");
              setDrawingTool("circle");
            }}
          >
            <Circle strokeWidth={1.5} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{messages.toolNames.ellipse}</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`tool-item${drawingTool === "line" ? " active" : ""}`}
            onClick={() => {
              setInteractionMode("select");
              setDrawingTool("line");
            }}
          >
            <ArrowUp style={{ scale: "1.2" }} strokeWidth={1.1} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{messages.toolNames.line}</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`tool-item${drawTools.includes(drawingTool) ? " active" : ""}`}
            onClick={() => {
              setInteractionMode("select");
              setDrawingTool("draw");
            }}
          >
            <Pen strokeWidth={1.5} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{messages.toolNames.draw}</p>
        </TooltipContent>
      </Tooltip>

      <div className="tool-separator" />

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`tool-item${drawingTool === "laser" ? " active" : ""}`}
            onClick={() => {
              setInteractionMode("select");
              setDrawingTool("laser");
            }}
          >
            <LaserIcon strokeWidth={1.5} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{messages.toolNames.laser}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
