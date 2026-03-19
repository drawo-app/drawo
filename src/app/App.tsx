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

const DRAWO_VERSION = "1.1.2";
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
    (typeof candidate.timerState === "string" || candidate.timerState === null) &&
    (typeof candidate.musicBarState === "string" ||
      candidate.musicBarState === null)
  );
};

type LoadedImageFile = {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read image file"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read error"));
    reader.readAsDataURL(file);
  });

const loadImageDimensions = (
  src: string,
): Promise<Pick<LoadedImageFile, "naturalWidth" | "naturalHeight">> =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      resolve({
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      });
    };
    image.onerror = () => reject(new Error("Image load error"));
    image.src = src;
  });

const loadImageFiles = async (files: File[]): Promise<LoadedImageFile[]> => {
  const loaded = await Promise.all(
    files
      .filter((file) => file.type.startsWith("image/"))
      .map(async (file) => {
        const src = await readFileAsDataUrl(file);
        const { naturalWidth, naturalHeight } = await loadImageDimensions(src);

        return {
          src,
          naturalWidth,
          naturalHeight,
        };
      }),
  );

  return loaded.filter(
    (image): image is LoadedImageFile =>
      image.naturalWidth > 0 && image.naturalHeight > 0,
  );
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
  const isDarkMode =
    scene.settings.theme === "dark" ||
    (scene.settings.theme === "system" && systemPrefersDark);
  const isPresentationMode = scene.settings.presentationMode;
  const effectiveInteractionMode = isPresentationMode ? "pan" : interactionMode;
  const effectiveDrawingTool = isPresentationMode ? null : drawingTool;
  const clipboardRef = useRef<SceneElement[] | null>(null);
  const cursorPositionRef = useRef<{ x: number; y: number } | null>(null);

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
    localStorage.setItem(SCENE_STORAGE_KEY, JSON.stringify(scene));
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(scene.settings));
  }, [scene]);

  useEffect(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    if (openTopbarPanel) {
      localStorage.setItem(TOPBAR_OPEN_PANEL_STORAGE_KEY, openTopbarPanel);
      return;
    }

    localStorage.removeItem(TOPBAR_OPEN_PANEL_STORAGE_KEY);
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

  const handleExportProject = useCallback(() => {
    const payload: DrawoProjectFile = {
      format: DRAWO_PROJECT_FORMAT,
      version: DRAWO_PROJECT_VERSION,
      exportedAt: new Date().toISOString(),
      scene,
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

    localStorage.setItem(SCENE_STORAGE_KEY, JSON.stringify(parsed.scene));
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(parsed.scene.settings));
    localStorage.setItem(LOCALE_STORAGE_KEY, parsed.locale);

    if (parsed.openTopbarPanel) {
      localStorage.setItem(TOPBAR_OPEN_PANEL_STORAGE_KEY, parsed.openTopbarPanel);
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
    const rootElement = document.documentElement;

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
  }, [isDarkMode, scene.settings.presentationMode, scene.settings.zenMode]);

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
          onDrawDefaultStrokeColorChange={handleDrawDefaultStrokeColorChange}
          onDrawDefaultStrokeWidthChange={handleDrawDefaultStrokeWidthChange}
          onSelectImageFiles={(files) => void handleInsertImageFiles(files)}
        />
      </TooltipProvider>
    </div>
  );
}
