import { createContext, useContext } from "react";
import type { Scene, NewElementType } from "@core/scene";
import type { LocaleCode, LocaleMessages } from "@shared/i18n";
import type { ExportImageFormat } from "@features/workspace/exportImage";
import type { LibrarySvgAsset } from "@features/library/catalog";
import type { ResolvedTheme } from "./theme";
import type { DrawoProps, DrawoEmptyStateConfig } from "./types";

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
    panel: "music" | "timer" | "sidebar" | null | ((prev: "music" | "timer" | "sidebar" | null) => "music" | "timer" | "sidebar" | null)
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

const DrawoContext = createContext<DrawoContextValue | null>(null);

export function useDrawo(): DrawoContextValue {
  const ctx = useContext(DrawoContext);
  if (!ctx) {
    throw new Error("useDrawo must be used within a <Drawo /> component");
  }
  return ctx;
}

export { DrawoContext };
