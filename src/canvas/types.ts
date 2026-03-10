import type {
  DrawElementStyle,
  ElementCreationBounds,
  NewElementType,
  Scene,
} from "../core/scene";
import type {
  CircleElement,
  LineCap,
  RectangleElement,
  TextElement,
} from "../core/elements";
import type { LocaleMessages } from "../i18n";

export type ResizeHandle = "nw" | "ne" | "se" | "sw";
export type BoxDrawingType = Exclude<NewElementType, "draw" | "marker">;

export interface DrawingSelection {
  type: BoxDrawingType;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  fromCenter: boolean;
  lockAspect: boolean;
}

export interface DrawSelection {
  points: Array<{ x: number; y: number }>;
  stroke: string;
  strokeWidth: number;
  drawMode: "draw" | "marker";
  isLine?: boolean;
}

export interface LaserTrailPoint {
  x: number;
  y: number;
  t: number;
}

export interface LaserTrail {
  id: string;
  points: LaserTrailPoint[];
}

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasViewProps {
  scene: Scene;
  interactionMode: "select" | "pan";
  drawingTool: NewElementType | "laser" | null;
  localeMessages: LocaleMessages;
  onPointerDown: (
    x: number,
    y: number,
    altKey: boolean,
    shiftKey: boolean,
  ) => void;
  onPointerMove: (
    x: number,
    y: number,
    shiftKey: boolean,
    altKey: boolean,
  ) => void;
  onPointerUp: () => void;
  onWheelPan: (deltaX: number, deltaY: number) => void;
  onWheelZoom: (screenX: number, screenY: number, deltaY: number) => void;
  onCreateElement: (
    type: BoxDrawingType,
    x: number,
    y: number,
    messages: LocaleMessages,
    bounds?: ElementCreationBounds,
  ) => void;
  onCreateDrawElement: (
    points: Array<{ x: number; y: number }>,
    style?: Partial<DrawElementStyle>,
  ) => void;
  onDrawingToolComplete: () => void;
  onSelectElements: (ids: string[]) => void;
  onTextFontFamilyChange: (ids: string[], fontFamily: string) => void;
  onTextFontSizeChange: (ids: string[], fontSize: number) => void;
  onTextFontWeightChange: (ids: string[], fontWeight: string) => void;
  onTextFontStyleChange: (
    ids: string[],
    fontStyle: "normal" | "italic",
  ) => void;
  onTextAlignChange: (ids: string[], textAlign: CanvasTextAlign) => void;
  onDrawStrokeWidthChange: (ids: string[], strokeWidth: number) => void;
  onDrawStrokeColorChange: (ids: string[], strokeColor: string) => void;
  onDrawDefaultStrokeColorChange: (
    drawMode: "draw" | "marker",
    strokeColor: string,
  ) => void;
  onDrawDefaultStrokeWidthChange: (
    drawMode: "draw" | "marker",
    strokeWidth: number,
  ) => void;
  onLineStartCapChange: (ids: string[], startCap: LineCap) => void;
  onLineEndCapChange: (ids: string[], endCap: LineCap) => void;
  onLineEditStart: () => void;
  onLineGeometryChange: (
    id: string,
    nextGeometry: {
      x: number;
      y: number;
      width: number;
      height: number;
      controlPoint: { x: number; y: number } | null;
    },
  ) => void;
  onRectangleBorderRadiusChange: (ids: string[], borderRadius: number) => void;
  onGroupResizeStart: (
    handle: ResizeHandle,
    pointerX: number,
    pointerY: number,
    bounds: ElementBounds,
    ids: string[],
  ) => void;
  onGroupRotateStart: (
    centerX: number,
    centerY: number,
    pointerX: number,
    pointerY: number,
    ids: string[],
  ) => void;
  onResizeStart: (
    id: string,
    handle: ResizeHandle,
    pointerX: number,
    pointerY: number,
    startBounds?: ElementBounds,
  ) => void;
  onRotateStart: (
    id: string,
    centerX: number,
    centerY: number,
    pointerX: number,
    pointerY: number,
  ) => void;
  onTextCommit: (id: string, text: string) => void;
}

export interface EditingTextState {
  id: string;
  value: string;
  anchorX: number;
  anchorY: number;
  left: number;
  top: number;
  width: number;
  height: number;
  maxWidth?: number;
  style: Pick<
    TextElement,
    | "fontFamily"
    | "fontSize"
    | "fontWeight"
    | "fontStyle"
    | "color"
    | "textAlign"
  >;
}

export type EditableElement = TextElement | RectangleElement | CircleElement;

export interface MarqueeSelection {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export type RichTextLeaf = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
};

export type RichTextParagraph = {
  type: "paragraph";
  children: RichTextLeaf[];
};

export type RichTextDocument = RichTextParagraph[];
