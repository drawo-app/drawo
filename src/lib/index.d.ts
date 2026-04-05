import type { ComponentProps, ReactNode, JSX } from "react";

export interface DrawoProps {
  theme?: string;
  colorScheme?: "light" | "dark";
  locale?: "en_US" | "es_ES";
  initialScene?: Scene;
  onSceneChange?: (scene: Scene) => void;
  tools?: Array<"select" | "pan" | "text" | "rectangle" | "circle" | "line" | "draw" | "image" | "laser">;
  initialOpenTopbarPanel?: "music" | "timer" | "sidebar" | null;
  disablePersistence?: boolean;
  disableKeyboardShortcuts?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onExportProject?: () => void;
  onExportImage?: (options: {
    format: "png" | "jpg" | "svg" | "pdf";
    qualityScale: number;
    transparentBackground: boolean;
    padding: number;
  }) => Promise<void>;
  onOpenProject?: (file: File) => Promise<void>;
  onUndo?: () => void;
  onRedo?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onInteractionModeChange?: (mode: "select" | "pan") => void;
  onDrawingToolChange?: (tool: NewElementType | "laser" | null) => void;
  onLocaleChange?: (locale: "en_US" | "es_ES") => void;
  onThemeChange?: (theme: string, colorScheme: "light" | "dark") => void;
  children?: ReactNode;
}

export interface DrawoEmptyStateConfig {
  enabled?: boolean;
  render?: (params: {
    messages: LocaleMessages;
    onInsertImage: () => void;
  }) => ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export interface DrawoTopBarProps {
  children?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  showMenuBar?: boolean;
}

export interface DrawoCanvasProps {
  showDefaultEmptyState?: boolean;
}

export interface DrawoEmptyStateProps {
  children?: ReactNode;
  config?: DrawoEmptyStateConfig;
}

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
  colorScheme: string;
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

export interface SceneElement {
  id: string;
  type: string;
  [key: string]: unknown;
}

export interface Scene {
  elements: SceneElement[];
  selectedId: string | null;
  selectedIds: string[];
  camera: Camera;
  settings: SceneSettings;
}

export type NewElementType = "rectangle" | "circle" | "text" | "image" | "quill" | "draw" | "marker" | "line";

export interface LocaleMessages {
  [key: string]: unknown;
}

export interface ResolvedTheme {
  preset: {
    strokeColors: readonly string[];
    shapeColors: readonly [readonly string[], readonly string[]];
  };
  dataTheme: string;
  isDark: boolean;
}

export interface DrawoContextValue {
  scene: Scene;
  resolvedTheme: ResolvedTheme;
  isDarkMode: boolean;
  isPresentationMode: boolean;
  isZenMode: boolean;
  locale: "en_US" | "es_ES";
  messages: LocaleMessages;
  interactionMode: "select" | "pan";
  drawingTool: NewElementType | "laser" | null;
  openTopbarPanel: "music" | "timer" | "sidebar" | null;
  canUndo: boolean;
  canRedo: boolean;
  props: DrawoProps;
  setScene: (updater: React.SetStateAction<Scene>) => void;
  setSceneWithoutHistory: (updater: React.SetStateAction<Scene>) => void;
  commitInteractionHistory: (before: Scene) => void;
  dispatch: (action: { type: string; [key: string]: unknown }) => void;
  setInteractionMode: (mode: "select" | "pan") => void;
  setDrawingTool: (tool: NewElementType | "laser" | null) => void;
  setOpenTopbarPanel: (panel: "music" | "timer" | "sidebar" | null | ((prev: "music" | "timer" | "sidebar" | null) => "music" | "timer" | "sidebar" | null)) => void;
  setLocale: (locale: "en_US" | "es_ES") => void;
  undo: () => void;
  redo: () => void;
  handlers: Record<string, (...args: unknown[]) => void>;
}

export type ExportImageFormat = "png" | "jpg" | "svg" | "pdf";
export type LibrarySvgAsset = { defaultWidth: number; defaultHeight: number; [key: string]: unknown };
export type LibraryCategoryId = string;

export function useDrawo(): DrawoContextValue;
export function DrawoProvider(props: DrawoProps & { children: ReactNode }): JSX.Element;

export const Drawo: React.FC<DrawoProps> & {
  TopBar: React.FC<DrawoTopBarProps>;
  Canvas: React.FC<DrawoCanvasProps>;
  ToolBar: React.FC;
  UndoBar: React.FC;
  ZoomBar: React.FC;
  EmptyState: React.FC<DrawoEmptyStateProps>;
};

export function DrawoTopBar(props: DrawoTopBarProps): JSX.Element;
export function DrawoCanvas(props: DrawoCanvasProps): JSX.Element;
export function DrawoToolBar(): JSX.Element;
export function DrawoUndoBar(): JSX.Element;
export function DrawoZoomBar(): JSX.Element;
export function DrawoEmptyState(props: DrawoEmptyStateProps): JSX.Element;

export function Timer(props: { isOpen: boolean; onOpenChange: (next: boolean) => void; messages: LocaleMessages }): JSX.Element;
export function MusicBar(props: { isOpen: boolean; onOpenChange: (next: boolean) => void; messages: LocaleMessages }): JSX.Element;

export function MenuBar(props: Record<string, unknown>): JSX.Element;
export function ToolBar(props: Record<string, unknown>): JSX.Element;
export function UndoBar(props: { canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void }): JSX.Element;
export function ZoomBar(props: { zoomPercent: number; canZoomOut: boolean; canZoomIn: boolean; onZoomOut: () => void; onZoomIn: () => void; onZoomReset: () => void }): JSX.Element;
export function CanvasView(props: Record<string, unknown>): JSX.Element;
export function CanvasContextMenu(props: Record<string, unknown>): JSX.Element;
export function CanvasEmptyState(props: Record<string, unknown>): JSX.Element;
export function SelectionToolbar(props: Record<string, unknown>): JSX.Element;
export function SelectionTextControls(props: Record<string, unknown>): JSX.Element;
export function SelectionShapeControls(props: Record<string, unknown>): JSX.Element;
export function SelectionStrokeControls(props: Record<string, unknown>): JSX.Element;
export function SelectionImageControls(props: Record<string, unknown>): JSX.Element;
export function TextEditorOverlay(props: Record<string, unknown>): JSX.Element;
export function SearchLibrarySidebar(props: Record<string, unknown>): JSX.Element;
