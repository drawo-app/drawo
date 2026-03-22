import type { SceneElement } from "../elements";

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface SceneSettings {
  showGrid: boolean;
  gridStyle: "dots" | "squares";
  snapToGrid: boolean;
  smartGuides: boolean;
  quillDrawOptimizations: boolean;
  gridSize: number;
  theme: "light" | "dark" | "system";
  colorScheme:
    | "drawo"
    | "catppuccin"
    | "nord"
    | "solarized"
    | "gruvbox"
    | "tokyonight"
    | "rosepine"
    | "everforest"
    | "kanagawa"
    | "dracula"
    | "one"
    | "ayu";
  zenMode: boolean;
  presentationMode: boolean;
  drawDefaults: {
    canvas: string;
    drawStroke: string;
    markerStroke: string;
    quillStroke: string;
    drawStrokeWidth: number;
    markerStrokeWidth: number;
    quillStrokeWidth: number;
  };
  shapeDefaults: {
    fill: string;
    stroke: string;
    textColor: string;
    lineStroke: string;
  };
  laserSettings: {
    lifetime: number;
    baseWidth: number;
    minWidth: number;
    shadow: boolean;
    color: string;
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
  drawMode: "draw" | "marker" | "quill";
  stroke: string;
  strokeWidth: number;
}

export type NewElementType =
  | "rectangle"
  | "circle"
  | "text"
  | "image"
  | "quill"
  | "draw"
  | "marker"
  | "line";

export const initScene = (): Scene => ({
  elements: [],
  selectedId: null,
  selectedIds: [],
  camera: { x: 0, y: 0, zoom: 1 },
  settings: {
    showGrid: true,
    gridStyle: "dots",
    snapToGrid: false,
    smartGuides: true,
    quillDrawOptimizations: true,
    gridSize: 24,
    theme: "light",
    colorScheme: "drawo",
    zenMode: false,
    presentationMode: false,
    drawDefaults: {
      canvas: "#f4f5f4",
      drawStroke: "#2f3b52",
      markerStroke: "#f1e66d",
      quillStroke: "#2f3b52",
      drawStrokeWidth: 2,
      markerStrokeWidth: 18,
      quillStrokeWidth: 2,
    },
    shapeDefaults: {
      fill: "#f5f5f5",
      stroke: "#cccccc",
      textColor: "#2f3b52",
      lineStroke: "#2f3b52",
    },
    laserSettings: {
      lifetime: 600,
      baseWidth: 11,
      minWidth: 0.3,
      shadow: false,
      color: "#FF1A28",
    },
  },
});
