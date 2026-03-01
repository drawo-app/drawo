import type { Dispatch, SetStateAction } from "react";
import type { NewElementType } from "../../core/scene";
import type { LocaleMessages } from "../../i18n";
import { MapArrowUp, Pen, Text } from "@solar-icons/react";
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
import { MarkerIcon, PenIcon } from "./Draw/icons";

interface ToolBarProps {
  interactionMode: "select" | "pan";
  drawingTool: NewElementType | "laser" | null;
  messages: LocaleMessages;
  setInteractionMode: Dispatch<SetStateAction<"select" | "pan">>;
  setDrawingTool: Dispatch<SetStateAction<NewElementType | "laser" | null>>;
}

export const ToolBar = ({
  interactionMode,
  drawingTool,
  messages,
  setInteractionMode,
  setDrawingTool,
}: ToolBarProps) => {
  const drawTools = ["draw", "marker"];
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
                }}
              >
                <PenIcon className="drawtool-icon" />
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
                className={`drawtool-elem tool-item${drawingTool === "marker" ? " active" : ""}`}
                onClick={() => {
                  setInteractionMode("select");
                  setDrawingTool("marker");
                }}
              >
                <MarkerIcon className="drawtool-icon" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{messages.toolNames.marker}</p>
            </TooltipContent>
          </Tooltip>
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
