import type { SceneElement } from "../../core/elements";
import {
  initScene,
  type Scene,
  type SceneSettings,
  updateSceneSettings,
} from "../../core/scene";
import { SCENE_STORAGE_KEY, SETTINGS_STORAGE_KEY } from "./constants";

const normalizeElement = (element: SceneElement): SceneElement => {
  if (element.type === "rectangle" || element.type === "circle") {
    return {
      ...element,
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
      drawMode: element.drawMode === "marker" ? "marker" : "draw",
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
              (point): point is { x: number; y: number } =>
                typeof point?.x === "number" && typeof point?.y === "number",
            )
            .map((point) => ({ x: point.x, y: point.y }))
        : [],
      stroke: typeof element.stroke === "string" ? element.stroke : "#2f3b52",
      strokeWidth:
        typeof element.strokeWidth === "number" &&
        Number.isFinite(element.strokeWidth)
          ? Math.max(1, element.strokeWidth)
          : 2,
    };
  }

  return element;
};

const isValidTheme = (value: unknown): value is SceneSettings["theme"] => {
  return value === "light" || value === "dark";
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
    (typeof drawDefaults.drawStrokeWidth === "number" ||
      typeof drawDefaults.drawStrokeWidth === "undefined") &&
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
      if (parsedSettings && typeof parsedSettings.snapToGrid === "boolean") {
        nextSettings.snapToGrid = parsedSettings.snapToGrid;
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
          drawStrokeWidth:
            typeof parsedSettings.drawDefaults.drawStrokeWidth === "number"
              ? parsedSettings.drawDefaults.drawStrokeWidth
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
    if (typeof parsed.snapToGrid === "boolean") {
      nextSettings.snapToGrid = parsed.snapToGrid;
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
        drawStrokeWidth:
          typeof parsed.drawDefaults.drawStrokeWidth === "number"
            ? parsed.drawDefaults.drawStrokeWidth
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
