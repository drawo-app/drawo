import type { DrawPoint, SceneElement } from "./elements";

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface SceneSettings {
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  theme: "light" | "dark";
}

export interface Scene {
  elements: SceneElement[];
  selectedId: string | null;
  selectedIds: string[];
  camera: Camera;
  settings: SceneSettings;
}

export interface ElementCreationBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DrawElementStyle {
  stroke: string;
  strokeWidth: number;
}

export type NewElementType = "rectangle" | "circle" | "text" | "draw";

export const initScene = (): Scene => ({
  elements: [],
  selectedId: null,
  selectedIds: [],
  camera: { x: 0, y: 0, zoom: 1 },
  settings: {
    showGrid: true,
    snapToGrid: true,
    gridSize: 24,
    theme: "light",
  },
});

export const selectElement = (scene: Scene, id: string | null): Scene => ({
  ...scene,
  selectedId: id,
  selectedIds: id ? [id] : [],
});

export const selectElements = (scene: Scene, ids: string[]): Scene => {
  const uniqueIds = Array.from(new Set(ids));

  return {
    ...scene,
    selectedId: uniqueIds[0] ?? null,
    selectedIds: uniqueIds,
  };
};

export const updateTextElementContent = (
  scene: Scene,
  id: string,
  text: string,
): Scene => ({
  ...scene,
  elements: scene.elements.map((element) => {
    if (element.id !== id) {
      return element;
    }

    if (
      element.type !== "text" &&
      element.type !== "rectangle" &&
      element.type !== "circle"
    ) {
      return element;
    }

    return {
      ...element,
      text,
    };
  }),
});

export const updateTextElementsFontFamily = (
  scene: Scene,
  ids: string[],
  fontFamily: string,
): Scene => {
  if (ids.length === 0) {
    return scene;
  }

  const targetIds = new Set(ids);

  return {
    ...scene,
    elements: scene.elements.map((element) => {
      if (!targetIds.has(element.id)) {
        return element;
      }

      if (
        element.type !== "text" &&
        element.type !== "rectangle" &&
        element.type !== "circle"
      ) {
        return element;
      }

      return {
        ...element,
        fontFamily,
      };
    }),
  };
};

export const updateTextElementsFontSize = (
  scene: Scene,
  ids: string[],
  fontSize: number,
): Scene => {
  if (ids.length === 0) {
    return scene;
  }

  const targetIds = new Set(ids);
  const nextFontSize = Math.max(10, Math.round(fontSize));

  return {
    ...scene,
    elements: scene.elements.map((element) => {
      if (!targetIds.has(element.id)) {
        return element;
      }

      if (
        element.type !== "text" &&
        element.type !== "rectangle" &&
        element.type !== "circle"
      ) {
        return element;
      }

      return {
        ...element,
        fontSize: nextFontSize,
      };
    }),
  };
};

export const updateElementPosition = (
  scene: Scene,
  id: string,
  x: number,
  y: number,
): Scene => ({
  ...scene,
  elements: scene.elements.map((element) => {
    if (element.id !== id) {
      return element;
    }

    return {
      ...element,
      x,
      y,
    };
  }),
});

export const updateRectangleElementBounds = (
  scene: Scene,
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
): Scene => ({
  ...scene,
  elements: scene.elements.map((element) => {
    if (element.id !== id) {
      return element;
    }

    if (element.type !== "rectangle" && element.type !== "circle") {
      if (element.type !== "draw") {
        return element;
      }

      const startWidth = Math.max(1, element.width);
      const startHeight = Math.max(1, element.height);
      const widthRatio = width / startWidth;
      const heightRatio = height / startHeight;

      return {
        ...element,
        x,
        y,
        width,
        height,
        points: element.points.map((point) => ({
          x: point.x * widthRatio,
          y: point.y * heightRatio,
        })),
      };
    }

    return {
      ...element,
      x,
      y,
      width,
      height,
    };
  }),
});

export const updateRectangleElementsBorderRadius = (
  scene: Scene,
  ids: string[],
  borderRadius: number,
): Scene => {
  if (ids.length === 0) {
    return scene;
  }

  const targetIds = new Set(ids);
  const nextRadius = Math.max(0, borderRadius);

  return {
    ...scene,
    elements: scene.elements.map((element) => {
      if (!targetIds.has(element.id) || element.type !== "rectangle") {
        return element;
      }

      return {
        ...element,
        borderRadius: nextRadius,
      };
    }),
  };
};

export const updateDrawElementsStrokeWidth = (
  scene: Scene,
  ids: string[],
  strokeWidth: number,
): Scene => {
  if (ids.length === 0) {
    return scene;
  }

  const targetIds = new Set(ids);
  const nextStrokeWidth = Math.max(1, strokeWidth);

  return {
    ...scene,
    elements: scene.elements.map((element) => {
      if (!targetIds.has(element.id) || element.type !== "draw") {
        return element;
      }

      return {
        ...element,
        strokeWidth: nextStrokeWidth,
      };
    }),
  };
};

export const updateTextElementLayout = (
  scene: Scene,
  id: string,
  x: number,
  y: number,
  fontSize: number,
): Scene => ({
  ...scene,
  elements: scene.elements.map((element) => {
    if (element.id !== id || element.type !== "text") {
      return element;
    }

    return {
      ...element,
      x,
      y,
      fontSize,
    };
  }),
});

export const updateElementRotation = (
  scene: Scene,
  id: string,
  rotation: number,
): Scene => ({
  ...scene,
  elements: scene.elements.map((element) => {
    if (element.id !== id) {
      return element;
    }

    return {
      ...element,
      rotation,
    };
  }),
});

export const updateGroupElementsRotation = (
  scene: Scene,
  ids: string[],
  angleDeltaDegrees: number,
  centerX: number,
  centerY: number,
  startPositions: Map<
    string,
    {
      centerX: number;
      centerY: number;
      offsetX: number;
      offsetY: number;
      rotation: number;
    }
  >,
): Scene => {
  if (ids.length === 0) {
    return scene;
  }

  const targetIds = new Set(ids);
  const angleRad = (angleDeltaDegrees * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  return {
    ...scene,
    elements: scene.elements.map((element) => {
      if (!targetIds.has(element.id)) {
        return element;
      }

      const startPos = startPositions.get(element.id);
      if (!startPos) {
        return element;
      }

      const dx = startPos.centerX - centerX;
      const dy = startPos.centerY - centerY;
      const rotatedCenterX = centerX + dx * cos - dy * sin;
      const rotatedCenterY = centerY + dx * sin + dy * cos;

      return {
        ...element,
        x: rotatedCenterX + startPos.offsetX,
        y: rotatedCenterY + startPos.offsetY,
        rotation: startPos.rotation + angleDeltaDegrees,
      };
    }),
  };
};

export const updateSceneSettings = (
  scene: Scene,
  settings: Partial<SceneSettings>,
): Scene => ({
  ...scene,
  settings: {
    ...scene.settings,
    ...settings,
  },
});

export const removeSelectedElement = (scene: Scene): Scene => {
  const targetIds =
    scene.selectedIds.length > 0
      ? new Set(scene.selectedIds)
      : scene.selectedId
        ? new Set([scene.selectedId])
        : null;

  if (!targetIds) {
    return scene;
  }

  return {
    ...scene,
    elements: scene.elements.filter((element) => !targetIds.has(element.id)),
    selectedId: null,
    selectedIds: [],
  };
};

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
      text: "New text",
      fontFamily: "Shantell Sans, sans-serif",
      fontSize,
      fontWeight: "200",
      fontStyle: "normal",
      color: "#2f3b52",
      textAlign: "left",
    };
  } else {
    newElement = {
      id: createElementId("draw"),
      type: "draw",
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
      stroke: "#2f3b52",
      strokeWidth: 2,
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
      : "#2f3b52";
  const strokeWidth =
    typeof style?.strokeWidth === "number" && Number.isFinite(style.strokeWidth)
      ? Math.max(1, style.strokeWidth)
      : 2;

  const minX = Math.min(...nextPoints.map((point) => point.x));
  const minY = Math.min(...nextPoints.map((point) => point.y));
  const maxX = Math.max(...nextPoints.map((point) => point.x));
  const maxY = Math.max(...nextPoints.map((point) => point.y));
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  const element: SceneElement = {
    id: createElementId("draw"),
    type: "draw",
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
