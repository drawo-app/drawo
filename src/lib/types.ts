import type { ReactNode, CSSProperties } from "react";
import type { Scene, NewElementType } from "@core/scene";
import type { LocaleCode, LocaleMessages } from "@shared/i18n";
import type { ExportImageFormat } from "@features/workspace/exportImage";
import type { ResolvedTheme } from "./theme";
import type { LibrarySvgAsset } from "@features/library/catalog";

export interface DrawoEmptyStateConfig {
  /** Show or hide the empty state completely */
  enabled?: boolean;
  /** Full custom render function - replaces entire empty state */
  render?: (params: {
    messages: LocaleMessages;
    onInsertImage: () => void;
  }) => ReactNode;
  /** Custom inline styles for the container */
  style?: CSSProperties;
  /** Custom CSS class for the container */
  className?: string;
}

export interface DrawoProps {
  theme?: string;
  colorScheme?: "light" | "dark";
  locale?: LocaleCode;
  initialScene?: Scene;
  onSceneChange?: (scene: Scene) => void;
  tools?: Array<
    | "select"
    | "pan"
    | "text"
    | "rectangle"
    | "circle"
    | "line"
    | "draw"
    | "image"
    | "laser"
  >;
  initialOpenTopbarPanel?: "music" | "timer" | "sidebar" | null;
  disablePersistence?: boolean;
  disableKeyboardShortcuts?: boolean;
  className?: string;
  style?: React.CSSProperties;
  emptyState?: DrawoEmptyStateConfig;
  onExportProject?: () => void;
  onExportImage?: (options: {
    format: ExportImageFormat;
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
  onLocaleChange?: (locale: LocaleCode) => void;
  onThemeChange?: (theme: string, colorScheme: "light" | "dark") => void;
  children?: ReactNode;
}

export interface DrawoContextValue {
  scene: Scene;
  resolvedTheme: ResolvedTheme;
  isDarkMode: boolean;
  isPresentationMode: boolean;
  isZenMode: boolean;
  locale: LocaleCode;
  messages: LocaleMessages;
  interactionMode: "select" | "pan";
  drawingTool: NewElementType | "laser" | null;
  openTopbarPanel: "music" | "timer" | "sidebar" | null;
  canUndo: boolean;
  canRedo: boolean;
  emptyStateConfig: DrawoEmptyStateConfig;
  props: DrawoProps;
  setScene: (updater: React.SetStateAction<Scene>) => void;
  setSceneWithoutHistory: (updater: React.SetStateAction<Scene>) => void;
  commitInteractionHistory: (before: Scene) => void;
  dispatch: (action: { type: string; [key: string]: unknown }) => void;
  setInteractionMode: (mode: "select" | "pan") => void;
  setDrawingTool: (tool: NewElementType | "laser" | null) => void;
  setOpenTopbarPanel: (
    panel:
      | "music"
      | "timer"
      | "sidebar"
      | null
      | ((
          prev: "music" | "timer" | "sidebar" | null,
        ) => "music" | "timer" | "sidebar" | null),
  ) => void;
  setLocale: (locale: LocaleCode) => void;
  undo: () => void;
  redo: () => void;
  onExportProject: () => Promise<void>;
  onExportImage: (options: {
    format: ExportImageFormat;
    qualityScale: number;
    transparentBackground: boolean;
    padding: number;
  }) => Promise<void>;
  onOpenProject: (file: File) => Promise<void>;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onCopySelection: () => void;
  onCutSelection: () => void;
  onPasteAt: (x: number, y: number) => void;
  onDuplicateSelection: () => void;
  onDeleteSelection: () => void;
  onReorderSelection: (
    direction: "forward" | "backward" | "front" | "back",
  ) => void;
  onGroupSelection: () => void;
  onUngroupSelection: () => void;
  onFlipSelection: (axis: "horizontal" | "vertical") => void;
  onSelectGroupForElement: (id: string) => void;
  onFocusElement: (id: string) => void;
  onInsertImageFiles: (
    files: File[],
    anchor?: { x: number; y: number },
  ) => Promise<void>;
  onInsertLibrarySvg: (asset: LibrarySvgAsset) => void;
  onSetRectangleBorderRadius: (ids: string[], borderRadius: number) => void;
  handlers: Record<string, (...args: unknown[]) => void>;
}
