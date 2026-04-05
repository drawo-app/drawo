import type { Scene, NewElementType } from "@core/scene";
import type { LocaleCode, LocaleMessages } from "@shared/i18n";
import type { ExportImageFormat } from "@features/workspace/exportImage";
import type { LibrarySvgAsset } from "@features/library/catalog";
import type { ResolvedTheme } from "./theme";

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
  children?: React.ReactNode;
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
  handlers: Record<string, (...args: unknown[]) => void>;
}
