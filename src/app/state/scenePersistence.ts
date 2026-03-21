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
      assetId: normalizeGroupId(element.assetId),
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
  return value === "light" || value === "dark" || value === "system";
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

const isValidLaserSettings = (
  value: unknown,
): value is SceneSettings["laserSettings"] => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const laserSettings = value as SceneSettings["laserSettings"];
  return (
    typeof laserSettings.lifetime === "number" &&
    Number.isFinite(laserSettings.lifetime) &&
    laserSettings.lifetime > 0 &&
    typeof laserSettings.baseWidth === "number" &&
    Number.isFinite(laserSettings.baseWidth) &&
    laserSettings.baseWidth > 0 &&
    typeof laserSettings.minWidth === "number" &&
    Number.isFinite(laserSettings.minWidth) &&
    laserSettings.minWidth >= 0 &&
    typeof laserSettings.shadow === "boolean" &&
    typeof laserSettings.color === "string" &&
    laserSettings.color.trim().length > 0
  );
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === "object" && !Array.isArray(value);
};

const mergeByShape = <T extends Record<string, unknown>>(
  defaults: T,
  source: unknown,
): Partial<T> => {
  if (!isPlainObject(source)) {
    return {};
  }

  const merged: Partial<T> = {};

  for (const key of Object.keys(defaults) as Array<keyof T>) {
    const defaultValue = defaults[key];
    const sourceValue = source[key as string];

    if (typeof sourceValue === "undefined") {
      continue;
    }

    if (typeof defaultValue === "number") {
      if (typeof sourceValue === "number" && Number.isFinite(sourceValue)) {
        merged[key] = sourceValue as T[keyof T];
      }
      continue;
    }

    if (typeof defaultValue === "boolean") {
      if (typeof sourceValue === "boolean") {
        merged[key] = sourceValue as T[keyof T];
      }
      continue;
    }

    if (typeof defaultValue === "string") {
      if (typeof sourceValue === "string") {
        merged[key] = sourceValue as T[keyof T];
      }
      continue;
    }

    if (isPlainObject(defaultValue)) {
      const nested = mergeByShape(
        defaultValue as Record<string, unknown>,
        sourceValue,
      );

      if (Object.keys(nested).length > 0) {
        merged[key] = nested as T[keyof T];
      }
    }
  }

  return merged;
};

const normalizeSceneSettings = (
  value: unknown,
  baseSettings: SceneSettings,
): Partial<SceneSettings> => {
  const nextSettings = mergeByShape(
    baseSettings as unknown as Record<string, unknown>,
    value,
  ) as Partial<SceneSettings>;
  const source = isPlainObject(value) ? value : null;

  if (
    typeof nextSettings.theme !== "undefined" &&
    !isValidTheme(nextSettings.theme)
  ) {
    delete nextSettings.theme;
  }

  if (
    typeof nextSettings.gridStyle !== "undefined" &&
    !isValidGridStyle(nextSettings.gridStyle)
  ) {
    delete nextSettings.gridStyle;
  }

  if (source && Object.prototype.hasOwnProperty.call(source, "drawDefaults")) {
    if (isValidDrawDefaults(source.drawDefaults)) {
      const mergedDrawDefaults = mergeByShape(
        baseSettings.drawDefaults as unknown as Record<string, unknown>,
        source.drawDefaults,
      ) as Partial<SceneSettings["drawDefaults"]>;
      nextSettings.drawDefaults = {
        ...baseSettings.drawDefaults,
        ...mergedDrawDefaults,
      };
    } else {
      delete nextSettings.drawDefaults;
    }
  }

  if (source && Object.prototype.hasOwnProperty.call(source, "laserSettings")) {
    if (isValidLaserSettings(source.laserSettings)) {
      const mergedLaserSettings = mergeByShape(
        baseSettings.laserSettings as unknown as Record<string, unknown>,
        source.laserSettings,
      ) as Partial<SceneSettings["laserSettings"]>;
      nextSettings.laserSettings = {
        ...baseSettings.laserSettings,
        ...mergedLaserSettings,
      };
    } else {
      delete nextSettings.laserSettings;
    }
  }

  return nextSettings;
};

export const loadInitialScene = (): Scene => {
  const baseScene = initScene();

  try {
    const rawScene = localStorage.getItem(SCENE_STORAGE_KEY);
    if (rawScene) {
      const parsed = JSON.parse(rawScene) as Partial<Scene>;
      const camera = parsed.camera;
      const nextSettings = normalizeSceneSettings(
        parsed.settings,
        baseScene.settings,
      );

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

    const parsed = JSON.parse(rawSettings) as unknown;
    const nextSettings = normalizeSceneSettings(parsed, baseScene.settings);

    return updateSceneSettings(baseScene, nextSettings);
  } catch {
    return baseScene;
  }
};
