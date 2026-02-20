import type { SceneElement } from "./elements";

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

export type NewElementType = "rectangle" | "text";

export const initScene = (): Scene => ({
  elements: [
    {
      id: "text-1",
      type: "text",
      rotation: 0,
      x: 120,
      y: 240,
      text: "Hello Drawo",
      fontFamily: "Inter, sans-serif",
      fontSize: 28,
      fontWeight: "600",
      fontStyle: "normal",
      color: "#2f3b52",
      textAlign: "left",
    },
    {
      id: "rect-1",
      type: "rectangle",
      rotation: 0,
      x: 50,
      y: 50,
      width: 180,
      height: 110,
      fill: "#f5f5f5",
      stroke: "#cccccc",
      strokeWidth: 1,
    },
    {
      id: "rect-2",
      type: "rectangle",
      rotation: 0,
      x: 280,
      y: 80,
      width: 120,
      height: 120,
      fill: "#fff8e1",
      stroke: "#ffcc80",
      strokeWidth: 1,
    },
    {
      id: "text-2",
      type: "text",
      rotation: 0,
      x: 520,
      y: 190,
      text: "Editable text styles",
      fontFamily: "Georgia, serif",
      fontSize: 22,
      fontWeight: "400",
      fontStyle: "italic",
      color: "#6a1b9a",
      textAlign: "center",
    },
  ],
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
    if (element.id !== id || element.type !== "text") {
      return element;
    }

    return {
      ...element,
      text,
    };
  }),
});

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
    if (element.id !== id || element.type !== "rectangle") {
      return element;
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

export const addElementToScene = (
  scene: Scene,
  type: NewElementType,
  x: number,
  y: number,
): Scene => {
  const newElement =
    type === "rectangle"
      ? {
          id: createElementId("rectangle"),
          type: "rectangle" as const,
          rotation: 0,
          x: x - 80,
          y: y - 50,
          width: 100,
          height: 100,
          fill: "#f5f5f5",
          stroke: "#cccccc",
          strokeWidth: 1,
        }
      : {
          id: createElementId("text"),
          type: "text" as const,
          rotation: 0,
          x,
          y: y + 20,
          text: "New text",
          fontFamily: "Shantell Sans, sans-serif",
          fontSize: 24,
          fontWeight: "200",
          fontStyle: "normal" as const,
          color: "#2f3b52",
          textAlign: "left" as const,
        };

  return {
    ...scene,
    elements: [...scene.elements, newElement],
    selectedId: newElement.id,
    selectedIds: [newElement.id],
  };
};
