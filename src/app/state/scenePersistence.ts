import type { SceneElement } from "../../core/elements";
import {
  initScene,
  type Scene,
  type SceneSettings,
  updateSceneSettings,
} from "../../core/scene";
import { SCENE_STORAGE_KEY, SETTINGS_STORAGE_KEY } from "./constants";

const normalizeGroupId = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const normalizeElement = (element: SceneElement): SceneElement => {
  if (element.type === "image") {
    return {
      ...element,
      groupId: normalizeGroupId(element.groupId),
      flipX: element.flipX === true,
      flipY: element.flipY === true,
      src: typeof element.src === "string" ? element.src : "",
      naturalWidth:
        typeof element.naturalWidth === "number" &&
        Number.isFinite(element.naturalWidth)
          ? Math.max(1, element.naturalWidth)
          : Math.max(1, element.width),
      naturalHeight:
        typeof element.naturalHeight === "number" &&
        Number.isFinite(element.naturalHeight)
          ? Math.max(1, element.naturalHeight)
          : Math.max(1, element.height),
    };
  }

  if (element.type === "rectangle" || element.type === "circle") {
    return {
      ...element,
      groupId: normalizeGroupId(element.groupId),
      text: typeof element.text === "string" ? element.text : "",
      fontFamily:
        typeof element.fontFamily === "string"
          ? element.fontFamily
          : "Shantell Sans, sans-serif",
      fontSize:
        typeof element.fontSize === "number" &&
        Number.isFinite(element.fontSize)
          ? element.fontSize
          : 20,
      fontWeight:
        typeof element.fontWeight === "string" ? element.fontWeight : "200",
      fontStyle: element.fontStyle === "italic" ? "italic" : "normal",
      color: typeof element.color === "string" ? element.color : "#2f3b52",
      textAlign:
        element.textAlign === "left" ||
        element.textAlign === "center" ||
        element.textAlign === "right" ||
        element.textAlign === "start" ||
        element.textAlign === "end"
          ? element.textAlign
          : "center",
    };
  }

  if (element.type === "draw") {
    return {
      ...element,
      groupId: normalizeGroupId(element.groupId),
      drawMode:
        element.drawMode === "marker"
          ? "marker"
          : element.drawMode === "quill"
            ? "quill"
            : "draw",
      createdAt:
        typeof element.createdAt === "number" &&
        Number.isFinite(element.createdAt)
          ? element.createdAt
          : undefined,
      width:
        typeof element.width === "number" && Number.isFinite(element.width)
          ? Math.max(1, element.width)
          : 1,
      height:
        typeof element.height === "number" && Number.isFinite(element.height)
          ? Math.max(1, element.height)
          : 1,
      points: Array.isArray(element.points)
        ? element.points
            .filter(
              (point): point is { x: number; y: number; t?: number } =>
                typeof point?.x === "number" && typeof point?.y === "number",
            )
            .map((point) => ({
              x: point.x,
              y: point.y,
              t: typeof point.t === "number" ? point.t : undefined,
            }))
        : [],
      stroke: typeof element.stroke === "string" ? element.stroke : "#2f3b52",
      strokeWidth:
        typeof element.strokeWidth === "number" &&
        Number.isFinite(element.strokeWidth)
          ? Math.max(1, element.strokeWidth)
          : 2,
    };
  }

  if (element.type === "line") {
    const normalizedStartCap =
      element.startCap === "line arrow" ||
      element.startCap === "triangle arrow" ||
      element.startCap === "inverted triangle" ||
      element.startCap === "circular arrow" ||
      element.startCap === "diamond arrow"
        ? element.startCap
        : "none";
    const normalizedEndCap =
      element.endCap === "line arrow" ||
      element.endCap === "triangle arrow" ||
      element.endCap === "inverted triangle" ||
      element.endCap === "circular arrow" ||
      element.endCap === "diamond arrow"
        ? element.endCap
        : "none";

    return {
      ...element,
      groupId: normalizeGroupId(element.groupId),
      stroke: typeof element.stroke === "string" ? element.stroke : "#2f3b52",
      strokeWidth:
        typeof element.strokeWidth === "number" &&
        Number.isFinite(element.strokeWidth)
          ? Math.max(1, element.strokeWidth)
          : 2,
      startCap: normalizedStartCap,
      endCap: normalizedEndCap,
      controlPoint:
        element.controlPoint &&
        typeof element.controlPoint.x === "number" &&
        typeof element.controlPoint.y === "number"
          ? {
              x: element.controlPoint.x,
              y: element.controlPoint.y,
            }
          : null,
    };
  }

  return {
    ...element,
    groupId: normalizeGroupId(element.groupId),
  };
};

const isValidTheme = (value: unknown): value is SceneSettings["theme"] => {
  return value === "light" || value === "dark";
};

const isValidGridStyle = (
  value: unknown,
): value is SceneSettings["gridStyle"] => {
  return value === "dots" || value === "squares";
};

const isValidDrawDefaults = (
  value: unknown,
): value is SceneSettings["drawDefaults"] => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const drawDefaults = value as SceneSettings["drawDefaults"];
  return (
    typeof drawDefaults.drawStroke === "string" &&
    drawDefaults.drawStroke.trim().length > 0 &&
    typeof drawDefaults.markerStroke === "string" &&
    drawDefaults.markerStroke.trim().length > 0 &&
    ((typeof drawDefaults.quillStroke === "string" &&
      drawDefaults.quillStroke.trim().length > 0) ||
      typeof drawDefaults.quillStroke === "undefined") &&
    (typeof drawDefaults.drawStrokeWidth === "number" ||
      typeof drawDefaults.drawStrokeWidth === "undefined") &&
    (typeof drawDefaults.quillStrokeWidth === "number" ||
      typeof drawDefaults.quillStrokeWidth === "undefined") &&
    (typeof drawDefaults.markerStrokeWidth === "number" ||
      typeof drawDefaults.markerStrokeWidth === "undefined")
  );
};

export const loadInitialScene = (): Scene => {
  const baseScene = initScene();

  try {
    const rawScene = localStorage.getItem(SCENE_STORAGE_KEY);
    if (rawScene) {
      const parsed = JSON.parse(rawScene) as Partial<Scene>;
      const camera = parsed.camera;
      const parsedSettings = parsed.settings;
      const nextSettings: Partial<SceneSettings> = {};

      if (parsedSettings && typeof parsedSettings.showGrid === "boolean") {
        nextSettings.showGrid = parsedSettings.showGrid;
      }
      if (parsedSettings && isValidGridStyle(parsedSettings.gridStyle)) {
        nextSettings.gridStyle = parsedSettings.gridStyle;
      }
      if (parsedSettings && typeof parsedSettings.snapToGrid === "boolean") {
        nextSettings.snapToGrid = parsedSettings.snapToGrid;
      }
      if (parsedSettings && typeof parsedSettings.smartGuides === "boolean") {
        nextSettings.smartGuides = parsedSettings.smartGuides;
      }
      if (
        parsedSettings &&
        typeof parsedSettings.quillDrawOptimizations === "boolean"
      ) {
        nextSettings.quillDrawOptimizations =
          parsedSettings.quillDrawOptimizations;
      }
      if (
        parsedSettings &&
        typeof parsedSettings.gridSize === "number" &&
        Number.isFinite(parsedSettings.gridSize)
      ) {
        nextSettings.gridSize = parsedSettings.gridSize;
      }
      if (parsedSettings && isValidTheme(parsedSettings.theme)) {
        nextSettings.theme = parsedSettings.theme;
      }
      if (parsedSettings && isValidDrawDefaults(parsedSettings.drawDefaults)) {
        nextSettings.drawDefaults = {
          drawStroke: parsedSettings.drawDefaults.drawStroke,
          markerStroke: parsedSettings.drawDefaults.markerStroke,
          quillStroke:
            typeof parsedSettings.drawDefaults.quillStroke === "string" &&
            parsedSettings.drawDefaults.quillStroke.trim().length > 0
              ? parsedSettings.drawDefaults.quillStroke
              : "#2f3b52",
          drawStrokeWidth:
            typeof parsedSettings.drawDefaults.drawStrokeWidth === "number"
              ? parsedSettings.drawDefaults.drawStrokeWidth
              : 2,
          quillStrokeWidth:
            typeof parsedSettings.drawDefaults.quillStrokeWidth === "number"
              ? parsedSettings.drawDefaults.quillStrokeWidth
              : 2,
          markerStrokeWidth:
            typeof parsedSettings.drawDefaults.markerStrokeWidth === "number"
              ? parsedSettings.drawDefaults.markerStrokeWidth
              : 18,
        };
      }

      const nextScene: Scene = {
        ...baseScene,
        elements: Array.isArray(parsed.elements)
          ? (parsed.elements as SceneElement[]).map(normalizeElement)
          : baseScene.elements,
        selectedId:
          typeof parsed.selectedId === "string" ? parsed.selectedId : null,
        selectedIds: Array.isArray(parsed.selectedIds)
          ? parsed.selectedIds.filter(
              (id): id is string => typeof id === "string",
            )
          : [],
        camera:
          camera &&
          typeof camera.x === "number" &&
          typeof camera.y === "number" &&
          typeof camera.zoom === "number"
            ? camera
            : baseScene.camera,
        settings: {
          ...baseScene.settings,
          ...nextSettings,
        },
      };

      if (nextScene.selectedIds.length === 0 && nextScene.selectedId) {
        nextScene.selectedIds = [nextScene.selectedId];
      }

      return nextScene;
    }

    const rawSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!rawSettings) {
      return baseScene;
    }

    const parsed = JSON.parse(rawSettings) as Partial<SceneSettings>;
    const nextSettings: Partial<SceneSettings> = {};

    if (typeof parsed.showGrid === "boolean") {
      nextSettings.showGrid = parsed.showGrid;
    }
    if (isValidGridStyle(parsed.gridStyle)) {
      nextSettings.gridStyle = parsed.gridStyle;
    }
    if (typeof parsed.snapToGrid === "boolean") {
      nextSettings.snapToGrid = parsed.snapToGrid;
    }
    if (typeof parsed.smartGuides === "boolean") {
      nextSettings.smartGuides = parsed.smartGuides;
    }
    if (typeof parsed.quillDrawOptimizations === "boolean") {
      nextSettings.quillDrawOptimizations = parsed.quillDrawOptimizations;
    }
    if (
      typeof parsed.gridSize === "number" &&
      Number.isFinite(parsed.gridSize)
    ) {
      nextSettings.gridSize = parsed.gridSize;
    }
    if (isValidTheme(parsed.theme)) {
      nextSettings.theme = parsed.theme;
    }
    if (isValidDrawDefaults(parsed.drawDefaults)) {
      nextSettings.drawDefaults = {
        drawStroke: parsed.drawDefaults.drawStroke,
        markerStroke: parsed.drawDefaults.markerStroke,
        quillStroke:
          typeof parsed.drawDefaults.quillStroke === "string" &&
          parsed.drawDefaults.quillStroke.trim().length > 0
            ? parsed.drawDefaults.quillStroke
            : "#2f3b52",
        drawStrokeWidth:
          typeof parsed.drawDefaults.drawStrokeWidth === "number"
            ? parsed.drawDefaults.drawStrokeWidth
            : 2,
        quillStrokeWidth:
          typeof parsed.drawDefaults.quillStrokeWidth === "number"
            ? parsed.drawDefaults.quillStrokeWidth
            : 2,
        markerStrokeWidth:
          typeof parsed.drawDefaults.markerStrokeWidth === "number"
            ? parsed.drawDefaults.markerStrokeWidth
            : 18,
      };
    }

    return updateSceneSettings(baseScene, nextSettings);
  } catch {
    return baseScene;
  }
};
