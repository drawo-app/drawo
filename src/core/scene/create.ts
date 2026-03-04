import type { LocaleMessages } from "../../i18n";
import type { DrawPoint, SceneElement } from "../elements";
import type {
  DrawElementStyle,
  ElementCreationBounds,
  NewElementType,
  Scene,
} from "./types";

const createElementId = (type: NewElementType): string => {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
};

const smoothDrawPoints = (points: DrawPoint[]): DrawPoint[] => {
  if (points.length <= 2) {
    return points;
  }

  const smoothed = points.map((point, index) => {
    if (index === 0 || index === points.length - 1) {
      return point;
    }

    const previous = points[index - 1];
    const next = points[index + 1];

    return {
      x: previous.x * 0.25 + point.x * 0.5 + next.x * 0.25,
      y: previous.y * 0.25 + point.y * 0.5 + next.y * 0.25,
    };
  });

  return smoothed;
};

const filterJitterPoints = (points: DrawPoint[]): DrawPoint[] => {
  if (points.length <= 2) {
    return points;
  }

  const filtered: DrawPoint[] = [points[0]];

  for (let index = 1; index < points.length; index++) {
    const current = points[index];
    const previous = filtered[filtered.length - 1];

    if (Math.hypot(current.x - previous.x, current.y - previous.y) >= 0.6) {
      filtered.push(current);
    }
  }

  if (filtered.length === 1) {
    filtered.push(points[points.length - 1]);
  }

  return filtered;
};

export const addElementToScene = (
  scene: Scene,
  type: NewElementType,
  x: number,
  y: number,
  messages: LocaleMessages,
  bounds?: ElementCreationBounds,
): Scene => {
  const normalizedBounds = bounds
    ? {
        x: Math.min(bounds.x, bounds.x + bounds.width),
        y: Math.min(bounds.y, bounds.y + bounds.height),
        width: Math.max(1, Math.abs(bounds.width)),
        height: Math.max(1, Math.abs(bounds.height)),
      }
    : null;

  let newElement: SceneElement;

  if (type === "rectangle") {
    const width = normalizedBounds ? Math.max(20, normalizedBounds.width) : 100;
    const height = normalizedBounds
      ? Math.max(20, normalizedBounds.height)
      : 100;

    newElement = {
      id: createElementId("rectangle"),
      type: "rectangle",
      rotation: 0,
      x: normalizedBounds ? normalizedBounds.x : x - 80,
      y: normalizedBounds ? normalizedBounds.y : y - 50,
      width,
      height,
      borderRadius: 12,
      fill: "#f5f5f5",
      stroke: "#cccccc",
      strokeWidth: 1,
      text: "",
      fontFamily: "Shantell Sans, sans-serif",
      fontSize: 20,
      fontWeight: "200",
      fontStyle: "normal",
      color: "#2f3b52",
      textAlign: "center",
    };
  } else if (type === "circle") {
    const width = normalizedBounds ? Math.max(20, normalizedBounds.width) : 100;
    const height = normalizedBounds
      ? Math.max(20, normalizedBounds.height)
      : 100;

    newElement = {
      id: createElementId("circle"),
      type: "circle",
      rotation: 0,
      x: normalizedBounds ? normalizedBounds.x : x - 50,
      y: normalizedBounds ? normalizedBounds.y : y - 50,
      width,
      height,
      fill: "#f5f5f5",
      stroke: "#cccccc",
      strokeWidth: 1,
      text: "",
      fontFamily: "Shantell Sans, sans-serif",
      fontSize: 20,
      fontWeight: "200",
      fontStyle: "normal",
      color: "#2f3b52",
      textAlign: "center",
    };
  } else if (type === "text") {
    const fontSize = normalizedBounds
      ? Math.max(10, Math.round(normalizedBounds.height))
      : 24;

    newElement = {
      id: createElementId("text"),
      type: "text",
      rotation: 0,
      x: normalizedBounds ? normalizedBounds.x : x,
      y: normalizedBounds ? normalizedBounds.y + fontSize : y + 20,
      text: messages.canvas.newText,
      fontFamily: "Shantell Sans, sans-serif",
      fontSize,
      fontWeight: "200",
      fontStyle: "normal",
      color: "#2f3b52",
      textAlign: "left",
    };
  } else {
    const drawMode = type === "marker" ? "marker" : "draw";
    newElement = {
      id: createElementId("draw"),
      type: "draw",
      drawMode,
      rotation: 0,
      x: normalizedBounds ? normalizedBounds.x : x,
      y: normalizedBounds ? normalizedBounds.y : y,
      width: normalizedBounds ? Math.max(1, normalizedBounds.width) : 1,
      height: normalizedBounds ? Math.max(1, normalizedBounds.height) : 1,
      points: [
        {
          x: 0,
          y: 0,
        },
      ],
      stroke: drawMode === "marker" ? "#f1e66d" : "#2f3b52",
      strokeWidth: drawMode === "marker" ? 10 : 2,
    };
  }

  return {
    ...scene,
    elements: [...scene.elements, newElement],
    selectedId: newElement.id,
    selectedIds: [newElement.id],
  };
};

export const addDrawElementToScene = (
  scene: Scene,
  points: DrawPoint[],
  style?: Partial<DrawElementStyle>,
): Scene => {
  if (points.length === 0) {
    return scene;
  }

  const filteredPoints = filterJitterPoints(points);
  const nextPoints = smoothDrawPoints(filteredPoints);

  const stroke =
    typeof style?.stroke === "string" && style.stroke.trim().length > 0
      ? style.stroke
      : style?.drawMode === "marker"
        ? scene.settings.drawDefaults.markerStroke
        : scene.settings.drawDefaults.drawStroke;
  const drawMode = style?.drawMode === "marker" ? "marker" : "draw";
  const strokeWidth =
    typeof style?.strokeWidth === "number" && Number.isFinite(style.strokeWidth)
      ? Math.max(1, style.strokeWidth)
      : drawMode === "marker"
        ? scene.settings.drawDefaults.markerStrokeWidth
        : scene.settings.drawDefaults.drawStrokeWidth;

  const minX = Math.min(...nextPoints.map((point) => point.x));
  const minY = Math.min(...nextPoints.map((point) => point.y));
  const maxX = Math.max(...nextPoints.map((point) => point.x));
  const maxY = Math.max(...nextPoints.map((point) => point.y));
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  const element: SceneElement = {
    id: createElementId("draw"),
    type: "draw",
    drawMode,
    createdAt: Date.now(),
    rotation: 0,
    x: minX,
    y: minY,
    width,
    height,
    points: nextPoints.map((point) => ({
      x: point.x - minX,
      y: point.y - minY,
    })),
    stroke,
    strokeWidth,
  };

  return {
    ...scene,
    elements: [...scene.elements, element],
  };
};
