import {
  useRef,
  useCallback,
  useEffect,
  useReducer,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
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
  type NewElementType,
  type Scene,
  updateRectangleElementsBorderRadius,
} from "@core/scene";
import { isLocaleCode, LOCALES, type LocaleCode } from "@shared/i18n";
import type { SceneElement } from "@core/elements";
import { useInteraction } from "@features/canvas/hooks/useInteraction";
import { CanvasView } from "@features/canvas/view/CanvasView";
import { TooltipProvider } from "@shared/ui/tooltip";
import { MenuBar } from "@features/workspace/components/MenuBar";
import { ToolBar } from "@features/workspace/components/ToolBar";
import { MusicBar } from "@features/music/components/MusicBar";
import { useWorkspaceKeyboardShortcuts } from "@features/workspace/hooks/useWorkspaceKeyboardShortcuts";
import {
  LOCALE_STORAGE_KEY,
  MUSIC_BAR_STORAGE_KEY,
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
import { appReducer, createInitialAppState } from "@app/state/reducer";
import "./App.css";
import { Timer } from "@features/timer/components/Timer";
import { UndoBar } from "@features/workspace/components/UndoBar";
import { ZoomBar } from "@features/workspace/components/ZoomBar";
import {
  MAX_CAMERA_ZOOM,
  MIN_CAMERA_ZOOM,
  ZOOM_SENSITIVITY,
} from "@features/canvas/interaction/constants";
import {
  resolveThemeForSettings,
  syncSceneThemeDefaults,
} from "@app/theme/themes";
import "@app/theme/base-tokens.css";
import "@app/theme/themes/drawo-light.css";
import "@app/theme/themes/drawo-dark.css";
import "@app/theme/themes/catppuccin-latte.css";
import "@app/theme/themes/catppuccin-mocha.css";
import "@app/theme/themes/nord-light.css";
import "@app/theme/themes/nord-dark.css";
import "@app/theme/themes/solarized-light.css";
import "@app/theme/themes/solarized-dark.css";
import "@app/theme/themes/gruvbox-light.css";
import "@app/theme/themes/gruvbox-dark.css";
import "@app/theme/themes/tokyonight-light.css";
import "@app/theme/themes/tokyonight-dark.css";
import "@app/theme/themes/rosepine-light.css";
import "@app/theme/themes/rosepine-dark.css";
import "@app/theme/themes/everforest-light.css";
import "@app/theme/themes/everforest-dark.css";
import "@app/theme/themes/kanagawa-light.css";
import "@app/theme/themes/kanagawa-dark.css";
import "@app/theme/themes/dracula-light.css";
import "@app/theme/themes/dracula-dark.css";
import "@app/theme/themes/one-light.css";
import "@app/theme/themes/one-dark.css";
import "@app/theme/themes/ayu-light.css";
import "@app/theme/themes/ayu-dark.css";

//const DRAWO_VERSION = "1.1.2";
const DRAWO_PROJECT_FORMAT = "drawo-project";
const DRAWO_PROJECT_VERSION = 1;

interface DrawoProjectFile {
  format: typeof DRAWO_PROJECT_FORMAT;
  version: number;
  exportedAt: string;
  scene: Scene;
  locale: LocaleCode;
  openTopbarPanel: "music" | "timer" | null;
  timerState: string | null;
  musicBarState: string | null;
}

const isDrawoProjectFile = (value: unknown): value is DrawoProjectFile => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<DrawoProjectFile>;
  return (
    candidate.format === DRAWO_PROJECT_FORMAT &&
    typeof candidate.version === "number" &&
    typeof candidate.exportedAt === "string" &&
    Boolean(candidate.scene) &&
    (candidate.locale === "es_ES" || candidate.locale === "en_US") &&
    (candidate.openTopbarPanel === "music" ||
      candidate.openTopbarPanel === "timer" ||
      candidate.openTopbarPanel === null) &&
    (typeof candidate.timerState === "string" ||
      candidate.timerState === null) &&
    (typeof candidate.musicBarState === "string" ||
      candidate.musicBarState === null)
  );
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

const toPersistableScene = (scene: Scene): Scene => {
  return {
    ...scene,
    elements: scene.elements.map((element) => {
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

const toExportableScene = async (scene: Scene): Promise<Scene> => {
  const nextElements = await Promise.all(
    scene.elements.map(async (element) => {
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
    ...scene,
    elements: nextElements,
  };
};

export default function App() {
  const [openTopbarPanel, setOpenTopbarPanel] = useState<
    "music" | "timer" | null
  >(() => {
    try {
      const stored = localStorage.getItem(TOPBAR_OPEN_PANEL_STORAGE_KEY);
      return stored === "music" || stored === "timer" ? stored : null;
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
  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;
  const messages = LOCALES[locale];
  const resolvedTheme = resolveThemeForSettings(
    scene.settings,
    systemPrefersDark,
  );
  const isDarkMode = resolvedTheme.isDark;
  const isPresentationMode = scene.settings.presentationMode;
  const effectiveInteractionMode = isPresentationMode ? "pan" : interactionMode;
  const effectiveDrawingTool = isPresentationMode ? null : drawingTool;
  const clipboardRef = useRef<SceneElement[] | null>(null);
  const cursorPositionRef = useRef<{ x: number; y: number } | null>(null);
  const scenePersistenceQuotaWarnedRef = useRef(false);
  const imageObjectUrlsRef = useRef<Map<string, string>>(new Map());
  const loadingImageAssetsRef = useRef<Set<string>>(new Set());
  const missingImageAssetsRef = useRef<Set<string>>(new Set());
  const migratingLegacyImageIdsRef = useRef<Set<string>>(new Set());

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
    return () => {
      for (const objectUrl of imageObjectUrlsRef.current.values()) {
        URL.revokeObjectURL(objectUrl);
      }
      imageObjectUrlsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const candidates = scene.elements.filter(
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

            const previousUrl = imageObjectUrlsRef.current.get(assetId);
            if (previousUrl) {
              URL.revokeObjectURL(previousUrl);
            }

            const objectUrl = URL.createObjectURL(blob);
            imageObjectUrlsRef.current.set(assetId, objectUrl);

            return {
              id: element.id,
              src: objectUrl,
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
  }, [scene.elements, setSceneWithoutHistory]);

  useEffect(() => {
    const legacyImages = scene.elements.filter(
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

          const previousUrl = imageObjectUrlsRef.current.get(assetId);
          if (previousUrl) {
            URL.revokeObjectURL(previousUrl);
          }

          const objectUrl = URL.createObjectURL(optimized.blob);
          imageObjectUrlsRef.current.set(assetId, objectUrl);

          updates.push({
            id: image.id,
            assetId,
            src: objectUrl,
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
  }, [scene.elements, setSceneWithoutHistory]);

  useEffect(() => {
    const sceneToPersist = toPersistableScene(scene);

    try {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(scene.settings),
      );
    } catch {
      return;
    }

    try {
      localStorage.setItem(SCENE_STORAGE_KEY, JSON.stringify(sceneToPersist));
      scenePersistenceQuotaWarnedRef.current = false;
    } catch (error) {
      if (!scenePersistenceQuotaWarnedRef.current) {
        console.warn(
          "Scene autosave disabled because browser storage quota was exceeded.",
          error,
        );
        scenePersistenceQuotaWarnedRef.current = true;
      }
    }
  }, [scene]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      return;
    }
  }, [locale]);

  useEffect(() => {
    try {
      if (openTopbarPanel) {
        localStorage.setItem(TOPBAR_OPEN_PANEL_STORAGE_KEY, openTopbarPanel);
        return;
      }

      localStorage.removeItem(TOPBAR_OPEN_PANEL_STORAGE_KEY);
    } catch {
      return;
    }
  }, [openTopbarPanel]);

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

      // Allow canvas to handle its own zoom
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

  useWorkspaceKeyboardShortcuts({
    scene,
    dispatch,
    clipboardRef,
    cursorPositionRef,
    setInteractionMode: setInteractionModeGuarded,
    setDrawingTool: setDrawingToolGuarded,
  });

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
    scene,
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
      scene.selectedIds.length > 0
        ? scene.selectedIds
        : scene.selectedId
          ? [scene.selectedId]
          : [];

    if (selectedIds.length === 0) {
      return;
    }

    clipboardRef.current = scene.elements
      .filter((element) => selectedIds.includes(element.id))
      .map((element) => ({ ...element }));
  }, [scene]);

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
    const exportableScene = await toExportableScene(scene);
    const payload: DrawoProjectFile = {
      format: DRAWO_PROJECT_FORMAT,
      version: DRAWO_PROJECT_VERSION,
      exportedAt: new Date().toISOString(),
      scene: exportableScene,
      locale,
      openTopbarPanel,
      timerState: localStorage.getItem(TIMER_STORAGE_KEY),
      musicBarState: localStorage.getItem(MUSIC_BAR_STORAGE_KEY),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
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
  }, [locale, openTopbarPanel, scene]);

  const handleOpenProject = useCallback(async (file: File) => {
    const rawText = await file.text();
    const parsed: unknown = JSON.parse(rawText);
    if (!isDrawoProjectFile(parsed)) {
      throw new Error("invalid-project-file");
    }

    const preparedElements = await Promise.all(
      parsed.scene.elements.map(async (element) => {
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

          return {
            ...element,
            assetId,
            src: URL.createObjectURL(optimized.blob),
            naturalWidth: optimized.naturalWidth,
            naturalHeight: optimized.naturalHeight,
          };
        } catch {
          return element;
        }
      }),
    );

    const importedScene: Scene = {
      ...parsed.scene,
      elements: preparedElements,
    };
    const sceneToPersist = toPersistableScene(importedScene);

    try {
      localStorage.setItem(SCENE_STORAGE_KEY, JSON.stringify(sceneToPersist));
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

      if (parsed.musicBarState) {
        localStorage.setItem(MUSIC_BAR_STORAGE_KEY, parsed.musicBarState);
      } else {
        localStorage.removeItem(MUSIC_BAR_STORAGE_KEY);
      }
    } catch {
      throw new Error("storage-quota-exceeded");
    }

    window.location.reload();
  }, []);

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
    applyViewportZoom(
      (currentZoom) => currentZoom * Math.exp(100 * ZOOM_SENSITIVITY),
    );
  }, [applyViewportZoom]);

  const handleZoomOut = useCallback(() => {
    applyViewportZoom(
      (currentZoom) => currentZoom * Math.exp(-100 * ZOOM_SENSITIVITY),
    );
  }, [applyViewportZoom]);

  const handleZoomReset = useCallback(() => {
    applyViewportZoom(() => 1);
  }, [applyViewportZoom]);

  const handleSelectGroupForElement = useCallback(
    (id: string) => {
      setScene((currentScene) =>
        selectElements(currentScene, getGroupElementIds(currentScene, id)),
      );
    },
    [setScene],
  );

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
    scene.settings.colorScheme,
    scene.settings.theme,
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

    if (scene.settings.zenMode) {
      rootElement.classList.add("drawo-zen-mode");
    } else {
      rootElement.classList.remove("drawo-zen-mode");
    }

    if (scene.settings.presentationMode) {
      rootElement.classList.add("drawo-presentation-mode");
    } else {
      rootElement.classList.remove("drawo-presentation-mode");
    }
  }, [
    isDarkMode,
    resolvedTheme.dataTheme,
    scene.settings.presentationMode,
    scene.settings.zenMode,
  ]);

  return (
    <div className="app-root">
      <TooltipProvider>
        <div className="drawo-topbar">
          <div className="drawo-topbar-left">
            <MenuBar
              scene={scene}
              locale={locale}
              messages={messages}
              setLocale={setLocale}
              setScene={setScene}
              setSceneWithoutHistory={setSceneWithoutHistory}
              onExportProject={handleExportProject}
              onOpenProject={handleOpenProject}
            />
          </div>
          <div className="drawo-topbar-right">
            <Timer
              messages={messages}
              isOpen={openTopbarPanel === "timer"}
              onOpenChange={(nextIsOpen) =>
                setOpenTopbarPanel(nextIsOpen ? "timer" : null)
              }
            />
            <MusicBar
              messages={messages}
              isOpen={openTopbarPanel === "music"}
              onOpenChange={(nextIsOpen) =>
                setOpenTopbarPanel(nextIsOpen ? "music" : null)
              }
            />
          </div>
        </div>
        <CanvasView
          scene={scene}
          strokeColors={resolvedTheme.preset.strokeColors}
          shapeColors={resolvedTheme.preset.shapeColors}
          alignmentGuides={alignmentGuides}
          interactionMode={effectiveInteractionMode}
          drawingTool={effectiveDrawingTool}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onResizeStart={handleResizeStart}
          onRotateStart={handleRotateStart}
          onTextCommit={handleTextCommit}
          onWheelPan={handleWheelPan}
          onWheelZoom={handleWheelZoom}
          onCreateElement={handleCreateElement}
          onCreateDrawElement={handleCreateDrawElement}
          onCreateLinePathElement={handleCreateLinePathElement}
          onDrawingToolComplete={() => setDrawingToolGuarded(null)}
          onDropImageFiles={(files, x, y) =>
            void handleInsertImageFiles(files, { x, y })
          }
          onSelectElements={handleSelectElements}
          onGroupResizeStart={handleGroupResizeStart}
          onGroupRotateStart={handleGroupRotateStart}
          onTextFontFamilyChange={handleTextFontFamilyChange}
          onTextFontSizeChange={handleTextFontSizeChange}
          onTextFontWeightChange={handleTextFontWeightChange}
          onTextFontStyleChange={handleTextFontStyleChange}
          onTextAlignChange={handleTextAlignChange}
          onDrawStrokeWidthChange={handleDrawStrokeWidthChange}
          onDrawStrokeColorChange={handleDrawStrokeColorChange}
          onShapeFillColorChange={handleShapeFillColorChange}
          onShapeFillStyleChange={handleShapeFillStyleChange}
          onElementsOpacityChange={handleElementsOpacityChange}
          onShapeStrokeColorChange={handleShapeStrokeColorChange}
          onShapeStrokeWidthChange={handleShapeStrokeWidthChange}
          onShapeStrokeStyleChange={handleShapeStrokeStyleChange}
          onDrawDefaultStrokeColorChange={handleDrawDefaultStrokeColorChange}
          onDrawDefaultStrokeWidthChange={handleDrawDefaultStrokeWidthChange}
          onLineStartCapChange={handleLineStartCapChange}
          onLineEndCapChange={handleLineEndCapChange}
          onLineEditStart={handleLineEditStart}
          onLineGeometryChange={handleLineGeometryChange}
          onRectangleBorderRadiusChange={handleRectangleBorderRadiusChange}
          onCopySelection={handleCopySelection}
          onCutSelection={handleCutSelection}
          onPasteAt={handlePasteAt}
          onDuplicateSelection={handleDuplicateSelection}
          onDeleteSelection={handleDeleteSelection}
          onGroupSelection={handleGroupSelection}
          onUngroupSelection={handleUngroupSelection}
          onSelectGroupForElement={handleSelectGroupForElement}
          onReorderSelection={handleReorderSelection}
          onFlipSelection={handleFlipSelection}
          localeMessages={messages}
        />

        <div className="drawo-bottomleft-bar">
          <UndoBar
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={() => dispatch({ type: "undo" })}
            onRedo={() => dispatch({ type: "redo" })}
          />
        </div>
        <div className="drawo-bottomright-bar">
          <ZoomBar
            zoomPercent={Math.round(scene.camera.zoom * 100)}
            canZoomOut={scene.camera.zoom > MIN_CAMERA_ZOOM}
            canZoomIn={scene.camera.zoom < MAX_CAMERA_ZOOM}
            onZoomOut={handleZoomOut}
            onZoomIn={handleZoomIn}
            onZoomReset={handleZoomReset}
          />
        </div>
        <ToolBar
          interactionMode={effectiveInteractionMode}
          drawingTool={effectiveDrawingTool}
          isPresentationMode={isPresentationMode}
          messages={messages}
          setInteractionMode={setInteractionModeGuarded}
          setDrawingTool={setDrawingToolGuarded}
          drawDefaults={scene.settings.drawDefaults}
          invertPaletteInDarkMode={
            isDarkMode && scene.settings.colorScheme === "drawo"
          }
          strokeColors={resolvedTheme.preset.strokeColors}
          onDrawDefaultStrokeColorChange={handleDrawDefaultStrokeColorChange}
          onDrawDefaultStrokeWidthChange={handleDrawDefaultStrokeWidthChange}
          onSelectImageFiles={(files) => void handleInsertImageFiles(files)}
        />
      </TooltipProvider>
    </div>
  );
}
