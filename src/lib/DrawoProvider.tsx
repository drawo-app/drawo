import {
  useRef,
  useCallback,
  useEffect,
  useReducer,
  useState,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  addSvgElementToScene,
  addImageElementToScene,
  duplicateSelectedElements,
  flipSelectedElements,
  getGroupElementIds,
  groupSelectedElements,
  pasteElementsIntoScene,
  removeSelectedElement,
  reorderSelectedElements,
  selectElements,
  ungroupSelectedElements,
  initScene,
  type NewElementType,
  type Scene,
  updateRectangleElementsBorderRadius,
} from "@core/scene";
import { isLocaleCode, LOCALES, type LocaleCode } from "@shared/i18n";

function createSafeScene(): Scene {
  return initScene();
}
import {
  estimateTextHeight,
  estimateTextWidth,
  getTextStartX,
  type SceneElement,
} from "@core/elements";
import { useInteraction } from "@features/canvas/hooks/useInteraction";
import { useWorkspaceKeyboardShortcuts } from "@features/workspace/hooks/useWorkspaceKeyboardShortcuts";
import {
  exportSceneAsImage,
  type ExportImageFormat,
} from "@features/workspace/exportImage";
import {
  LOCALE_STORAGE_KEY,
  SCENE_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  TIMER_STORAGE_KEY,
  TOPBAR_OPEN_PANEL_STORAGE_KEY,
} from "@app/state/constants";
import {
  blobToDataUrl,
  getStoredImageBlob,
  optimizeImageBlob,
  prepareAndStoreImageFile,
  sourceToBlob,
  storeImageBlob,
} from "@app/state/imageStorage";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { appReducer, createInitialAppState } from "@app/state/reducer";
import type { LibrarySvgAsset } from "@features/library/catalog";
import {
  MAX_CAMERA_ZOOM,
  MIN_CAMERA_ZOOM,
  ZOOM_SENSITIVITY,
} from "@features/canvas/interaction/constants";
import {
  resolveThemeForSettings,
  syncSceneThemeDefaults,
} from "@app/theme/themes";
import { DrawoContext } from "./context";
import type { DrawoContextValue, DrawoProps } from "./types";
import type { ResolvedTheme } from "./theme";

const DRAWO_PROJECT_FORMAT = "drawo-project";
const DRAWO_PROJECT_VERSION_V1 = 1;
const DRAWO_PROJECT_VERSION_V2 = 2;
const DRAWO_PROJECT_SERIALIZATION_V2 = "yaml-v2";
const DRAWO_PROJECT_AI_PROMPT_LINE =
  '# ai_prompt: "You are reading a Drawo project file. Parse the full document as structured data and do not truncate content. The data starts after YAML comments and optional document marker lines."';
const DRAWO_PROJECT_V2_MARKER_LINE = "# drawo_format: yaml-v2";

interface DrawoProjectCommonFields {
  format: typeof DRAWO_PROJECT_FORMAT;
  exportedAt: string;
  safeScene: Scene;
  locale: LocaleCode;
  openTopbarPanel: "music" | "timer" | "sidebar" | null;
  timerState: string | null;
  musicBarState?: string | null;
}

interface DrawoProjectFileV1 extends DrawoProjectCommonFields {
  version: typeof DRAWO_PROJECT_VERSION_V1;
}

interface DrawoProjectFileV2 extends DrawoProjectCommonFields {
  version: typeof DRAWO_PROJECT_VERSION_V2;
  serialization: typeof DRAWO_PROJECT_SERIALIZATION_V2;
}

type DrawoProjectFile = DrawoProjectFileV1 | DrawoProjectFileV2;

const isDrawoProjectCommonFields = (
  value: unknown,
): value is DrawoProjectCommonFields => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<DrawoProjectCommonFields>;
  return (
    candidate.format === DRAWO_PROJECT_FORMAT &&
    typeof candidate.exportedAt === "string" &&
    Boolean(candidate.safeScene) &&
    (candidate.locale === "es_ES" || candidate.locale === "en_US") &&
    (candidate.openTopbarPanel === "music" ||
      candidate.openTopbarPanel === "timer" ||
      candidate.openTopbarPanel === "sidebar" ||
      candidate.openTopbarPanel === null) &&
    (typeof candidate.timerState === "string" ||
      candidate.timerState === null) &&
    (typeof candidate.musicBarState === "undefined" ||
      typeof candidate.musicBarState === "string" ||
      candidate.musicBarState === null)
  );
};

const isDrawoProjectFileV1 = (value: unknown): value is DrawoProjectFileV1 => {
  if (!isDrawoProjectCommonFields(value)) {
    return false;
  }

  const candidate = value as Partial<DrawoProjectFileV1>;
  return candidate.version === DRAWO_PROJECT_VERSION_V1;
};

const isDrawoProjectFileV2 = (value: unknown): value is DrawoProjectFileV2 => {
  if (!isDrawoProjectCommonFields(value)) {
    return false;
  }

  const candidate = value as Partial<DrawoProjectFileV2>;
  return (
    candidate.version === DRAWO_PROJECT_VERSION_V2 &&
    candidate.serialization === DRAWO_PROJECT_SERIALIZATION_V2
  );
};

const parseDrawoProjectFile = (
  rawText: string,
): {
  project: DrawoProjectFile;
} => {
  try {
    const parsedYaml: unknown = parseYaml(rawText);
    if (isDrawoProjectFileV2(parsedYaml)) {
      return { project: parsedYaml };
    }
    if (isDrawoProjectFileV1(parsedYaml)) {
      return { project: parsedYaml };
    }
  } catch {
    // Fall through to legacy JSON parser fallback.
  }

  try {
    const parsedRaw: unknown = JSON.parse(rawText);
    if (isDrawoProjectFileV2(parsedRaw)) {
      return { project: parsedRaw };
    }
    if (isDrawoProjectFileV1(parsedRaw)) {
      return { project: parsedRaw };
    }
  } catch {
    // keep invalid-project-file below
  }

  throw new Error("invalid-project-file");
};

type LoadedImageFile = {
  src: string;
  assetId: string;
  naturalWidth: number;
  naturalHeight: number;
  isAnimated: boolean;
};

const loadImageFiles = async (files: File[]): Promise<LoadedImageFile[]> => {
  const loaded = await Promise.allSettled(
    files
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => prepareAndStoreImageFile(file)),
  );

  return loaded.flatMap((result) => {
    if (
      result.status !== "fulfilled" ||
      result.value.naturalWidth <= 0 ||
      result.value.naturalHeight <= 0
    ) {
      return [];
    }

    return [result.value];
  });
};

const toPersistableScene = (safeScene: Scene): Scene => {
  return {
    ...safeScene,
    elements: safeScene.elements.map((element) => {
      if (element.type !== "image" || !element.assetId) {
        return element;
      }

      return {
        ...element,
        src: "",
      };
    }),
  };
};

const toExportableScene = async (safeScene: Scene): Promise<Scene> => {
  const nextElements = await Promise.all(
    safeScene.elements.map(async (element) => {
      if (element.type !== "image") {
        return element;
      }

      if (element.src && element.src.length > 0) {
        return element;
      }

      if (!element.assetId) {
        return element;
      }

      const blob = await getStoredImageBlob(element.assetId);
      if (!blob) {
        return element;
      }

      const src = await blobToDataUrl(blob);
      return {
        ...element,
        src,
      };
    }),
  );

  return {
    ...safeScene,
    elements: nextElements,
  };
};

export function DrawoProvider({
  children,
  theme,
  colorScheme,
  locale: initialLocale,
  initialScene,
  onSceneChange,
  initialOpenTopbarPanel,
  disablePersistence,
  disableKeyboardShortcuts,
  emptyState,
  onExportProject: onExportProjectProp,
  onExportImage: onExportImageProp,
  onOpenProject: onOpenProjectProp,
  onUndo: onUndoProp,
  onRedo: onRedoProp,
  onZoomIn: onZoomInProp,
  onZoomOut: onZoomOutProp,
  onZoomReset: onZoomResetProp,
  onInteractionModeChange,
  onDrawingToolChange,
  onLocaleChange,
  onThemeChange,
}: DrawoProps & { children: React.ReactNode }) {
  const [openTopbarPanel, setOpenTopbarPanel] = useState<
    "music" | "timer" | "sidebar" | null
  >(() => {
    if (initialOpenTopbarPanel !== undefined) {
      return initialOpenTopbarPanel;
    }
    try {
      const stored = localStorage.getItem(TOPBAR_OPEN_PANEL_STORAGE_KEY);
      return stored === "music" || stored === "timer" || stored === "sidebar"
        ? stored
        : null;
    } catch {
      return null;
    }
  });
  const [interactionMode, setInteractionMode] = useState<"select" | "pan">(
    "select",
  );
  const [drawingTool, setDrawingTool] = useState<
    NewElementType | "laser" | null
  >(null);
  const [locale, setLocale] = useState<LocaleCode>(() => {
    if (initialLocale) return initialLocale;
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      return isLocaleCode(stored) ? stored : "es_ES";
    } catch {
      return "es_ES";
    }
  });
  const [state, dispatch] = useReducer(
    appReducer,
    undefined,
    createInitialAppState,
  );
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const scene = state.present;
  const messages = LOCALES[locale];
  
  const safeScene = scene && scene.settings ? scene : createSafeScene();
  
  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;
  const resolvedTheme = resolveThemeForSettings(
    safeScene.settings,
    systemPrefersDark,
  );
  const isDarkMode = resolvedTheme.isDark;
  const isPresentationMode = safeScene.settings.presentationMode;
  const isZenMode = safeScene.settings.zenMode;
  const isSidebarOpen = openTopbarPanel === "sidebar";
  const effectiveInteractionMode = isPresentationMode ? "pan" : interactionMode;
  const effectiveDrawingTool = isPresentationMode ? null : drawingTool;
  const clipboardRef = useRef<SceneElement[] | null>(null);
  const cursorPositionRef = useRef<{ x: number; y: number } | null>(null);
  const safeScenePersistenceQuotaWarnedRef = useRef(false);
  const loadingImageAssetsRef = useRef<Set<string>>(new Set());
  const missingImageAssetsRef = useRef<Set<string>>(new Set());
  const migratingLegacyImageIdsRef = useRef<Set<string>>(new Set());
  const focusAnimationFrameRef = useRef<number | null>(null);

  const setInteractionModeGuarded: Dispatch<SetStateAction<"select" | "pan">> =
    useCallback(
      (updater) => {
        setInteractionMode((currentMode) => {
          const nextMode =
            typeof updater === "function" ? updater(currentMode) : updater;

          if (isPresentationMode && nextMode !== "pan") {
            return "pan";
          }

          return nextMode;
        });
      },
      [isPresentationMode],
    );

  const setDrawingToolGuarded: Dispatch<
    SetStateAction<NewElementType | "laser" | null>
  > = useCallback(
    (updater) => {
      setDrawingTool((currentTool) => {
        if (isPresentationMode) {
          return null;
        }

        return typeof updater === "function" ? updater(currentTool) : updater;
      });
    },
    [isPresentationMode],
  );

  const setScene: Dispatch<SetStateAction<Scene>> = useCallback((updater) => {
    dispatch({ type: "setScene", updater });
  }, []);

  const setSceneWithoutHistory: Dispatch<SetStateAction<Scene>> = useCallback(
    (updater) => {
      dispatch({ type: "setScene", updater, trackHistory: false });
    },
    [],
  );

  const commitInteractionHistory = useCallback((before: Scene) => {
    dispatch({ type: "commitInteraction", before });
  }, []);

  useEffect(() => {
    const candidates = safeScene.elements.filter(
      (element): element is Extract<SceneElement, { type: "image" }> =>
        element.type === "image" &&
        Boolean(element.assetId) &&
        !element.src &&
        !loadingImageAssetsRef.current.has(element.assetId ?? "") &&
        !missingImageAssetsRef.current.has(element.assetId ?? ""),
    );

    if (candidates.length === 0) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const resolved = await Promise.all(
        candidates.map(async (element) => {
          const assetId = element.assetId;
          if (!assetId) {
            return null;
          }

          loadingImageAssetsRef.current.add(assetId);

          try {
            const blob = await getStoredImageBlob(assetId);
            if (!blob) {
              missingImageAssetsRef.current.add(assetId);
              return null;
            }
            const dataUrl = await blobToDataUrl(blob);

            return {
              id: element.id,
              src: dataUrl,
            };
          } catch {
            missingImageAssetsRef.current.add(assetId);
            return null;
          } finally {
            loadingImageAssetsRef.current.delete(assetId);
          }
        }),
      );

      if (cancelled) {
        return;
      }

      const updates = resolved.filter(
        (item): item is { id: string; src: string } => item !== null,
      );

      if (updates.length === 0) {
        return;
      }

      const updatesById = new Map(updates.map((item) => [item.id, item.src]));
      setSceneWithoutHistory((currentScene) => ({
        ...currentScene,
        elements: currentScene.elements.map((element) => {
          if (element.type !== "image") {
            return element;
          }

          const nextSrc = updatesById.get(element.id);
          if (!nextSrc) {
            return element;
          }

          return {
            ...element,
            src: nextSrc,
          };
        }),
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [safeScene.elements, setSceneWithoutHistory]);

  useEffect(() => {
    const legacyImages = safeScene.elements.filter(
      (element): element is Extract<SceneElement, { type: "image" }> =>
        element.type === "image" &&
        !element.assetId &&
        Boolean(element.src) &&
        !migratingLegacyImageIdsRef.current.has(element.id),
    );

    if (legacyImages.length === 0) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const updates: Array<{
        id: string;
        assetId: string;
        src: string;
        naturalWidth: number;
        naturalHeight: number;
      }> = [];

      for (const image of legacyImages) {
        migratingLegacyImageIdsRef.current.add(image.id);

        try {
          const sourceBlob = await sourceToBlob(image.src);
          const optimized = await optimizeImageBlob(sourceBlob);
          const assetId = await storeImageBlob(optimized.blob);
          const dataUrl = await blobToDataUrl(optimized.blob);

          updates.push({
            id: image.id,
            assetId,
            src: dataUrl,
            naturalWidth: optimized.naturalWidth,
            naturalHeight: optimized.naturalHeight,
          });
        } finally {
          migratingLegacyImageIdsRef.current.delete(image.id);
        }
      }

      if (cancelled || updates.length === 0) {
        return;
      }

      const updatesById = new Map(updates.map((item) => [item.id, item]));

      setSceneWithoutHistory((currentScene) => ({
        ...currentScene,
        elements: currentScene.elements.map((element) => {
          if (element.type !== "image") {
            return element;
          }

          const nextImage = updatesById.get(element.id);
          if (!nextImage) {
            return element;
          }

          return {
            ...element,
            assetId: nextImage.assetId,
            src: nextImage.src,
            naturalWidth: nextImage.naturalWidth,
            naturalHeight: nextImage.naturalHeight,
          };
        }),
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [safeScene.elements, setSceneWithoutHistory]);

  useEffect(() => {
    if (disablePersistence) return;

    const safeSceneToPersist = toPersistableScene(safeScene);

    try {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(safeScene.settings),
      );
    } catch {
      return;
    }

    try {
      localStorage.setItem(SCENE_STORAGE_KEY, JSON.stringify(safeSceneToPersist));
      safeScenePersistenceQuotaWarnedRef.current = false;
    } catch (error) {
      if (!safeScenePersistenceQuotaWarnedRef.current) {
        console.warn(
          "Scene autosave disabled because browser storage quota was exceeded.",
          error,
        );
        safeScenePersistenceQuotaWarnedRef.current = true;
      }
    }
  }, [safeScene, disablePersistence]);

  useEffect(() => {
    if (disablePersistence) return;

    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      return;
    }
  }, [locale, disablePersistence]);

  useEffect(() => {
    if (disablePersistence) return;

    try {
      if (openTopbarPanel) {
        localStorage.setItem(TOPBAR_OPEN_PANEL_STORAGE_KEY, openTopbarPanel);
        return;
      }

      localStorage.removeItem(TOPBAR_OPEN_PANEL_STORAGE_KEY);
    } catch {
      return;
    }
  }, [openTopbarPanel, disablePersistence]);

  useEffect(() => {
    const handlePreventPageZoom = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) {
        return;
      }

      const key = event.key;
      const code = event.code;
      const isZoomShortcut =
        key === "+" ||
        key === "-" ||
        key === "=" ||
        key === "_" ||
        key === "0" ||
        code === "Equal" ||
        code === "Minus" ||
        code === "NumpadAdd" ||
        code === "NumpadSubtract" ||
        code === "Digit0" ||
        code === "Numpad0";

      if (!isZoomShortcut) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    };

    const handlePreventPageZoomWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) {
        return;
      }

      if (event.target instanceof HTMLCanvasElement) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("keydown", handlePreventPageZoom, {
      capture: true,
    });
    window.addEventListener("wheel", handlePreventPageZoomWheel, {
      capture: true,
      passive: false,
    });

    return () => {
      window.removeEventListener("keydown", handlePreventPageZoom, {
        capture: true,
      });
      window.removeEventListener("wheel", handlePreventPageZoomWheel, {
        capture: true,
      });
    };
  }, []);

  if (!disableKeyboardShortcuts) {
    useWorkspaceKeyboardShortcuts({
      scene: safeScene,
      dispatch,
      clipboardRef,
      cursorPositionRef,
      setInteractionMode: setInteractionModeGuarded,
      setDrawingTool: setDrawingToolGuarded,
      setOpenTopbarPanel,
    });
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      cursorPositionRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [cursorPositionRef]);

  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleResizeStart,
    handleGroupResizeStart,
    handleRotateStart,
    handleGroupRotateStart,
    handleTextCommit,
    handleWheelPan,
    handleWheelZoom,
    handleCreateElement,
    handleCreateDrawElement,
    handleCreateLinePathElement,
    handleSelectElements,
    handleTextFontFamilyChange,
    handleTextFontSizeChange,
    handleTextFontWeightChange,
    handleTextFontStyleChange,
    handleTextAlignChange,
    handleTextColorChange,
    handleDrawStrokeWidthChange,
    handleDrawStrokeColorChange,
    handleShapeFillColorChange,
    handleShapeFillStyleChange,
    handleElementsOpacityChange,
    handleShapeStrokeColorChange,
    handleShapeStrokeWidthChange,
    handleShapeStrokeStyleChange,
    handleDrawDefaultStrokeColorChange,
    handleDrawDefaultStrokeWidthChange,
    handleLineStartCapChange,
    handleLineEndCapChange,
    handleLineEditStart,
    handleLineGeometryChange,
    alignmentGuides,
  } = useInteraction({
    scene: safeScene,
    setScene,
    setSceneWithoutHistory,
    commitInteractionHistory,
  });

  const handleRectangleBorderRadiusChange = useCallback(
    (ids: string[], borderRadius: number) => {
      setScene((currentScene) =>
        updateRectangleElementsBorderRadius(currentScene, ids, borderRadius),
      );
    },
    [setScene],
  );

  const handleCopySelection = useCallback(() => {
    const selectedIds =
      safeScene.selectedIds.length > 0
        ? safeScene.selectedIds
        : safeScene.selectedId
          ? [safeScene.selectedId]
          : [];

    if (selectedIds.length === 0) {
      return;
    }

    clipboardRef.current = safeScene.elements
      .filter((element) => selectedIds.includes(element.id))
      .map((element) => ({ ...element }));
  }, [safeScene]);

  const handleCutSelection = useCallback(() => {
    handleCopySelection();
    setScene((currentScene) => removeSelectedElement(currentScene));
  }, [handleCopySelection, setScene]);

  const handleFlipSelection = useCallback(
    (axis: "horizontal" | "vertical") => {
      setScene((currentScene) => flipSelectedElements(currentScene, axis));
    },
    [setScene],
  );

  const handleExportProject = useCallback(async () => {
    if (onExportProjectProp) {
      onExportProjectProp();
      return;
    }

    const exportableScene = await toExportableScene(safeScene);
    const payload: DrawoProjectFileV2 = {
      format: DRAWO_PROJECT_FORMAT,
      version: DRAWO_PROJECT_VERSION_V2,
      serialization: DRAWO_PROJECT_SERIALIZATION_V2,
      exportedAt: new Date().toISOString(),
      safeScene: exportableScene,
      locale,
      openTopbarPanel,
      timerState: localStorage.getItem(TIMER_STORAGE_KEY),
    };
    const serializedPayload = [
      DRAWO_PROJECT_AI_PROMPT_LINE,
      DRAWO_PROJECT_V2_MARKER_LINE,
      "---",
      stringifyYaml(payload, { lineWidth: 0 }),
    ].join("\n");

    const blob = new Blob([serializedPayload], {
      type: "text/yaml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    const filename = `project-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
      now.getDate(),
    )}-${pad(now.getHours())}${pad(now.getMinutes())}.drawo`;
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [locale, openTopbarPanel, safeScene, onExportProjectProp]);

  const handleExportImage = useCallback(
    async (options: {
      format: ExportImageFormat;
      qualityScale: number;
      transparentBackground: boolean;
      padding: number;
    }) => {
      if (onExportImageProp) {
        await onExportImageProp(options);
        return;
      }

      await exportSceneAsImage({
        scene: safeScene,
        format: options.format,
        qualityScale: options.qualityScale,
        transparentBackground: options.transparentBackground,
        padding: options.padding,
        systemPrefersDark,
      });
    },
    [safeScene, systemPrefersDark, onExportImageProp],
  );

  const handleOpenProject = useCallback(
    async (file: File) => {
      if (onOpenProjectProp) {
        await onOpenProjectProp(file);
        return;
      }

      const rawText = await file.text();
      const { project: parsed } = parseDrawoProjectFile(rawText);

      const preparedElements = await Promise.all(
        parsed.safeScene.elements.map(async (element) => {
          if (element.type !== "image") {
            return element;
          }

          if (!element.src || element.src.length === 0) {
            return element;
          }

          try {
            const sourceBlob = await sourceToBlob(element.src);
            const optimized = await optimizeImageBlob(sourceBlob);
            const assetId = await storeImageBlob(
              optimized.blob,
              element.assetId ?? undefined,
            );
            const dataUrl = await blobToDataUrl(optimized.blob);

            return {
              ...element,
              assetId,
              src: dataUrl,
              naturalWidth: optimized.naturalWidth,
              naturalHeight: optimized.naturalHeight,
            };
          } catch {
            return element;
          }
        }),
      );

      const importedScene: Scene = {
        ...parsed.safeScene,
        elements: preparedElements,
      };
      const safeSceneToPersist = toPersistableScene(importedScene);

      try {
        localStorage.setItem(SCENE_STORAGE_KEY, JSON.stringify(safeSceneToPersist));
        localStorage.setItem(
          SETTINGS_STORAGE_KEY,
          JSON.stringify(importedScene.settings),
        );
        localStorage.setItem(LOCALE_STORAGE_KEY, parsed.locale);

        if (parsed.openTopbarPanel) {
          localStorage.setItem(
            TOPBAR_OPEN_PANEL_STORAGE_KEY,
            parsed.openTopbarPanel,
          );
        } else {
          localStorage.removeItem(TOPBAR_OPEN_PANEL_STORAGE_KEY);
        }

        if (parsed.timerState) {
          localStorage.setItem(TIMER_STORAGE_KEY, parsed.timerState);
        } else {
          localStorage.removeItem(TIMER_STORAGE_KEY);
        }
      } catch {
        throw new Error("storage-quota-exceeded");
      }

      window.location.reload();
    },
    [onOpenProjectProp],
  );

  const handlePasteAt = useCallback(
    (x: number, y: number) => {
      const clipboardElements = clipboardRef.current;
      if (!clipboardElements || clipboardElements.length === 0) {
        return;
      }

      setScene((currentScene) =>
        pasteElementsIntoScene(currentScene, clipboardElements, {
          anchorX: x,
          anchorY: y,
        }),
      );
    },
    [setScene],
  );

  const handleDuplicateSelection = useCallback(() => {
    setScene((currentScene) => duplicateSelectedElements(currentScene));
  }, [setScene]);

  const handleDeleteSelection = useCallback(() => {
    setScene((currentScene) => removeSelectedElement(currentScene));
  }, [setScene]);

  const handleReorderSelection = useCallback(
    (direction: "forward" | "backward" | "front" | "back") => {
      setScene((currentScene) =>
        reorderSelectedElements(currentScene, direction),
      );
    },
    [setScene],
  );

  const handleGroupSelection = useCallback(() => {
    setScene((currentScene) => groupSelectedElements(currentScene));
  }, [setScene]);

  const handleUngroupSelection = useCallback(() => {
    setScene((currentScene) => ungroupSelectedElements(currentScene));
  }, [setScene]);

  const applyViewportZoom = useCallback(
    (zoomUpdater: (currentZoom: number) => number) => {
      dispatch({
        type: "setScene",
        trackHistory: false,
        updater: (currentScene) => {
          const currentZoom = currentScene.camera.zoom;
          const nextZoomRaw = zoomUpdater(currentZoom);
          const nextZoom = Math.min(
            MAX_CAMERA_ZOOM,
            Math.max(MIN_CAMERA_ZOOM, nextZoomRaw),
          );

          if (nextZoom === currentZoom) {
            return currentScene;
          }

          const centerX = window.innerWidth / 2;
          const centerY = window.innerHeight / 2;
          const worldX = centerX / currentZoom + currentScene.camera.x;
          const worldY = centerY / currentZoom + currentScene.camera.y;

          return {
            ...currentScene,
            camera: {
              x: worldX - centerX / nextZoom,
              y: worldY - centerY / nextZoom,
              zoom: nextZoom,
            },
          };
        },
      });
    },
    [dispatch],
  );

  const handleZoomIn = useCallback(() => {
    if (onZoomInProp) {
      onZoomInProp();
      return;
    }
    applyViewportZoom(
      (currentZoom) => currentZoom * Math.exp(100 * ZOOM_SENSITIVITY),
    );
  }, [applyViewportZoom, onZoomInProp]);

  const handleZoomOut = useCallback(() => {
    if (onZoomOutProp) {
      onZoomOutProp();
      return;
    }
    applyViewportZoom(
      (currentZoom) => currentZoom * Math.exp(-100 * ZOOM_SENSITIVITY),
    );
  }, [applyViewportZoom, onZoomOutProp]);

  const handleZoomReset = useCallback(() => {
    if (onZoomResetProp) {
      onZoomResetProp();
      return;
    }
    applyViewportZoom(() => 1);
  }, [applyViewportZoom, onZoomResetProp]);

  const handleSelectGroupForElement = useCallback(
    (id: string) => {
      setScene((currentScene) =>
        selectElements(currentScene, getGroupElementIds(currentScene, id)),
      );
    },
    [setScene],
  );

  const getElementFocusBounds = useCallback((element: SceneElement) => {
    if (
      element.type === "rectangle" ||
      element.type === "circle" ||
      element.type === "image" ||
      element.type === "draw" ||
      element.type === "svg"
    ) {
      return {
        x: element.x,
        y: element.y,
        width: Math.max(1, element.width),
        height: Math.max(1, element.height),
      };
    }

    if (element.type === "line") {
      const points = [
        { x: element.x, y: element.y },
        { x: element.x + element.width, y: element.y + element.height },
        ...(element.controlPoint ? [element.controlPoint] : []),
      ];
      const minX = Math.min(...points.map((point) => point.x));
      const minY = Math.min(...points.map((point) => point.y));
      const maxX = Math.max(...points.map((point) => point.x));
      const maxY = Math.max(...points.map((point) => point.y));

      return {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
      };
    }

    return {
      x: getTextStartX(element),
      y: element.y - element.fontSize,
      width: Math.max(16, estimateTextWidth(element)),
      height: Math.max(element.fontSize, estimateTextHeight(element)),
    };
  }, []);

  const handleFocusElement = useCallback(
    (id: string) => {
      setInteractionModeGuarded("select");
      setDrawingToolGuarded(null);

      if (focusAnimationFrameRef.current !== null) {
        cancelAnimationFrame(focusAnimationFrameRef.current);
        focusAnimationFrameRef.current = null;
      }

      const startCamera = {
        x: safeScene.camera.x,
        y: safeScene.camera.y,
      };

      setSceneWithoutHistory((currentScene) => {
        const element = currentScene.elements.find((item) => item.id === id);
        if (!element) {
          return currentScene;
        }

        const bounds = getElementFocusBounds(element);
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        const zoom = currentScene.camera.zoom;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const targetCameraX = centerX - viewportWidth / (2 * zoom);
        const targetCameraY = centerY - viewportHeight / (2 * zoom);

        const deltaX = targetCameraX - startCamera.x;
        const deltaY = targetCameraY - startCamera.y;
        const durationMs = 420;
        const startTime = performance.now();

        const animateCamera = (timestamp: number) => {
          const progress = Math.min(1, (timestamp - startTime) / durationMs);
          const eased =
            progress < 0.5
              ? 2 * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 2) / 2;

          setSceneWithoutHistory((safeSceneForAnimation) => ({
            ...safeSceneForAnimation,
            camera: {
              ...safeSceneForAnimation.camera,
              x: startCamera.x + deltaX * eased,
              y: startCamera.y + deltaY * eased,
            },
          }));

          if (progress < 1) {
            focusAnimationFrameRef.current =
              requestAnimationFrame(animateCamera);
          } else {
            focusAnimationFrameRef.current = null;
          }
        };

        focusAnimationFrameRef.current = requestAnimationFrame(animateCamera);

        return {
          ...currentScene,
          selectedId: id,
          selectedIds: [id],
        };
      });
    },
    [
      getElementFocusBounds,
      safeScene.camera.x,
      safeScene.camera.y,
      setDrawingToolGuarded,
      setInteractionModeGuarded,
      setSceneWithoutHistory,
    ],
  );

  useEffect(() => {
    return () => {
      if (focusAnimationFrameRef.current !== null) {
        cancelAnimationFrame(focusAnimationFrameRef.current);
      }
    };
  }, []);

  const handleInsertImageFiles = useCallback(
    async (files: File[], anchor?: { x: number; y: number }) => {
      const images = await loadImageFiles(files);
      if (images.length === 0) {
        return;
      }

      setScene((currentScene) => {
        const baseX =
          anchor?.x ??
          currentScene.camera.x +
            window.innerWidth / (2 * currentScene.camera.zoom);
        const baseY =
          anchor?.y ??
          currentScene.camera.y +
            window.innerHeight / (2 * currentScene.camera.zoom);

        return images.reduce((nextScene, image, index) => {
          return addImageElementToScene(
            nextScene,
            image,
            baseX + index * 28,
            baseY + index * 28,
          );
        }, currentScene);
      });
    },
    [setScene],
  );

  const handleInsertLibrarySvg = useCallback(
    (asset: LibrarySvgAsset) => {
      setInteractionModeGuarded("select");
      setDrawingToolGuarded(null);

      setScene((currentScene) => {
        const centerX =
          currentScene.camera.x +
          window.innerWidth / (2 * currentScene.camera.zoom);
        const centerY =
          currentScene.camera.y +
          window.innerHeight / (2 * currentScene.camera.zoom);

        return addSvgElementToScene(
          currentScene,
          asset,
          centerX - asset.defaultWidth / 2,
          centerY - asset.defaultHeight / 2,
        );
      });
    },
    [setDrawingToolGuarded, setInteractionModeGuarded, setScene],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);

      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }

    mediaQuery.addListener(handleChange);

    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

  useEffect(() => {
    setSceneWithoutHistory((currentScene) => {
      const nextTheme = resolveThemeForSettings(
        currentScene.settings,
        systemPrefersDark,
      );
      return syncSceneThemeDefaults(currentScene, nextTheme.preset);
    });
  }, [
    safeScene.settings.colorScheme,
    safeScene.settings.theme,
    setSceneWithoutHistory,
    systemPrefersDark,
  ]);

  useEffect(() => {
    const rootElement = document.documentElement;

    rootElement.setAttribute("data-theme", resolvedTheme.dataTheme);

    if (isDarkMode) {
      rootElement.classList.add("dark");
    } else {
      rootElement.classList.remove("dark");
    }

    if (safeScene.settings.zenMode) {
      rootElement.classList.add("drawo-zen-mode");
    } else {
      rootElement.classList.remove("drawo-zen-mode");
    }

    if (safeScene.settings.presentationMode) {
      rootElement.classList.add("drawo-presentation-mode");
    } else {
      rootElement.classList.remove("drawo-presentation-mode");
    }
  }, [
    isDarkMode,
    resolvedTheme.dataTheme,
    safeScene.settings.presentationMode,
    safeScene.settings.zenMode,
  ]);

  useEffect(() => {
    if (onSceneChange) {
      onSceneChange(safeScene);
    }
  }, [safeScene, onSceneChange]);

  useEffect(() => {
    if (onInteractionModeChange) {
      onInteractionModeChange(effectiveInteractionMode);
    }
  }, [effectiveInteractionMode, onInteractionModeChange]);

  useEffect(() => {
    if (onDrawingToolChange) {
      onDrawingToolChange(effectiveDrawingTool);
    }
  }, [effectiveDrawingTool, onDrawingToolChange]);

  useEffect(() => {
    if (onLocaleChange) {
      onLocaleChange(locale);
    }
  }, [locale, onLocaleChange]);

  const handlers = useMemo(
    () => ({
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
      handleResizeStart,
      handleGroupResizeStart,
      handleRotateStart,
      handleGroupRotateStart,
      handleTextCommit,
      handleWheelPan,
      handleWheelZoom,
      handleCreateElement,
      handleCreateDrawElement,
      handleCreateLinePathElement,
      handleSelectElements,
      handleTextFontFamilyChange,
      handleTextFontSizeChange,
      handleTextFontWeightChange,
      handleTextFontStyleChange,
      handleTextAlignChange,
      handleTextColorChange,
      handleDrawStrokeWidthChange,
      handleDrawStrokeColorChange,
      handleShapeFillColorChange,
      handleShapeFillStyleChange,
      handleElementsOpacityChange,
      handleShapeStrokeColorChange,
      handleShapeStrokeWidthChange,
      handleShapeStrokeStyleChange,
      handleDrawDefaultStrokeColorChange,
      handleDrawDefaultStrokeWidthChange,
      handleLineStartCapChange,
      handleLineEndCapChange,
      handleLineEditStart,
      handleLineGeometryChange,
      handleRectangleBorderRadiusChange,
      handleCopySelection,
      handleCutSelection,
      handlePasteAt,
      handleDuplicateSelection,
      handleDeleteSelection,
      handleReorderSelection,
      handleGroupSelection,
      handleUngroupSelection,
      handleSelectGroupForElement,
      handleFlipSelection,
      handleFocusElement,
      handleInsertImageFiles,
      handleInsertLibrarySvg,
      handleExportProject,
      handleExportImage,
      handleOpenProject,
      handleZoomIn,
      handleZoomOut,
      handleZoomReset,
    }),
    [
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
      handleResizeStart,
      handleGroupResizeStart,
      handleRotateStart,
      handleGroupRotateStart,
      handleTextCommit,
      handleWheelPan,
      handleWheelZoom,
      handleCreateElement,
      handleCreateDrawElement,
      handleCreateLinePathElement,
      handleSelectElements,
      handleTextFontFamilyChange,
      handleTextFontSizeChange,
      handleTextFontWeightChange,
      handleTextFontStyleChange,
      handleTextAlignChange,
      handleTextColorChange,
      handleDrawStrokeWidthChange,
      handleDrawStrokeColorChange,
      handleShapeFillColorChange,
      handleShapeFillStyleChange,
      handleElementsOpacityChange,
      handleShapeStrokeColorChange,
      handleShapeStrokeWidthChange,
      handleShapeStrokeStyleChange,
      handleDrawDefaultStrokeColorChange,
      handleDrawDefaultStrokeWidthChange,
      handleLineStartCapChange,
      handleLineEndCapChange,
      handleLineEditStart,
      handleLineGeometryChange,
      handleRectangleBorderRadiusChange,
      handleCopySelection,
      handleCutSelection,
      handlePasteAt,
      handleDuplicateSelection,
      handleDeleteSelection,
      handleReorderSelection,
      handleGroupSelection,
      handleUngroupSelection,
      handleSelectGroupForElement,
      handleFlipSelection,
      handleFocusElement,
      handleInsertImageFiles,
      handleInsertLibrarySvg,
      handleExportProject,
      handleExportImage,
      handleOpenProject,
      handleZoomIn,
      handleZoomOut,
      handleZoomReset,
    ],
  );

  const contextValue: DrawoContextValue = useMemo(
    () => ({
      scene: safeScene,
      resolvedTheme,
      isDarkMode,
      isPresentationMode,
      isZenMode,
      locale,
      messages,
      interactionMode: effectiveInteractionMode,
      drawingTool: effectiveDrawingTool,
      openTopbarPanel,
      canUndo,
      canRedo,
      emptyStateConfig: emptyState ?? {},
      props: {
        theme,
        colorScheme,
        locale: initialLocale,
        initialScene,
        onSceneChange,
        initialOpenTopbarPanel,
        disablePersistence,
        disableKeyboardShortcuts,
        emptyState,
      },
      setScene,
      setSceneWithoutHistory,
      commitInteractionHistory,
      dispatch,
      setInteractionMode: setInteractionModeGuarded,
      setDrawingTool: setDrawingToolGuarded,
      setOpenTopbarPanel,
      setLocale,
      undo: () => dispatch({ type: "undo" }),
      redo: () => dispatch({ type: "redo" }),
      handlers,
    }),
    [
      safeScene,
      resolvedTheme,
      isDarkMode,
      isPresentationMode,
      isZenMode,
      locale,
      messages,
      effectiveInteractionMode,
      effectiveDrawingTool,
      openTopbarPanel,
      canUndo,
      canRedo,
      theme,
      colorScheme,
      initialLocale,
      initialScene,
      onSceneChange,
      initialOpenTopbarPanel,
      disablePersistence,
      disableKeyboardShortcuts,
      setScene,
      setSceneWithoutHistory,
      commitInteractionHistory,
      dispatch,
      setInteractionModeGuarded,
      setDrawingToolGuarded,
      setOpenTopbarPanel,
      setLocale,
      handlers,
    ],
  );

  return (
    <DrawoContext.Provider value={contextValue}>{children}</DrawoContext.Provider>
  );
}
