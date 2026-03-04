import type { SceneElement } from "../elements";

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
  drawDefaults: {
    drawStroke: string;
    markerStroke: string;
    drawStrokeWidth: number;
    markerStrokeWidth: number;
  };
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
  drawMode: "draw" | "marker";
  stroke: string;
  strokeWidth: number;
}

export type NewElementType =
  | "rectangle"
  | "circle"
  | "text"
  | "draw"
  | "marker";

export const initScene = (): Scene => ({
  elements: [],
  selectedId: null,
  selectedIds: [],
  camera: { x: 0, y: 0, zoom: 1 },
  settings: {
    showGrid: true,
    snapToGrid: false,
    gridSize: 24,
    theme: "light",
    drawDefaults: {
      drawStroke: "#2f3b52",
      markerStroke: "#f1e66d",
      drawStrokeWidth: 2,
      markerStrokeWidth: 18,
    },
  },
});
