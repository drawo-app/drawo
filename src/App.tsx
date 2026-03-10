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
  type NewElementType,
  type Scene,
  updateRectangleElementsBorderRadius,
} from "./core/scene";
import { isLocaleCode, LOCALES, type LocaleCode } from "./i18n";
import type { SceneElement } from "./core/elements";
import { useInteraction } from "./canvas/useInteraction";
import { CanvasView } from "./canvas/CanvasView";
import { TooltipProvider } from "./components/tooltip";
import { SettingsBar } from "./app/components/SettingsBar";
import { ToolBar } from "./app/components/ToolBar";
import { MusicBar } from "./app/components/MusicBar/MusicBar";
import { useAppKeyboardShortcuts } from "./app/hooks/useAppKeyboardShortcuts";
import {
  LOCALE_STORAGE_KEY,
  SCENE_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  TOPBAR_OPEN_PANEL_STORAGE_KEY,
} from "./app/state/constants";
import { appReducer, createInitialAppState } from "./app/state/reducer";
import "./App.css";
import { Timer } from "./app/components/Timer/Timer";

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
  const scene = state.present;
  const messages = LOCALES[locale];
  const isDarkMode = scene.settings.theme === "dark";
  const clipboardRef = useRef<SceneElement[] | null>(null);
  const pasteOffsetRef = useRef(0);

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

  useAppKeyboardShortcuts({
    scene,
    dispatch,
    clipboardRef,
    pasteOffsetRef,
    setInteractionMode,
    setDrawingTool,
  });

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
    handleDrawDefaultStrokeColorChange,
    handleDrawDefaultStrokeWidthChange,
    handleLineStartCapChange,
    handleLineEndCapChange,
    handleLineEditStart,
    handleLineGeometryChange,
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

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  return (
    <div className="app-root">
      <TooltipProvider>
        <div className="drawo-topbar">
          <div className="drawo-topbar-left">
            <SettingsBar
              scene={scene}
              isDarkMode={isDarkMode}
              locale={locale}
              messages={messages}
              setLocale={setLocale}
              setScene={setScene}
            />
          </div>
          <div className="drawo-topbar-right">
            <MusicBar
              messages={messages}
              isOpen={openTopbarPanel === "music"}
              onOpenChange={(nextIsOpen) =>
                setOpenTopbarPanel(nextIsOpen ? "music" : null)
              }
            />
            <Timer
              messages={messages}
              isOpen={openTopbarPanel === "timer"}
              onOpenChange={(nextIsOpen) =>
                setOpenTopbarPanel(nextIsOpen ? "timer" : null)
              }
            />
          </div>
        </div>
        <CanvasView
          scene={scene}
          interactionMode={interactionMode}
          drawingTool={drawingTool}
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
          onDrawingToolComplete={() => setDrawingTool(null)}
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
          onDrawDefaultStrokeColorChange={handleDrawDefaultStrokeColorChange}
          onDrawDefaultStrokeWidthChange={handleDrawDefaultStrokeWidthChange}
          onLineStartCapChange={handleLineStartCapChange}
          onLineEndCapChange={handleLineEndCapChange}
          onLineEditStart={handleLineEditStart}
          onLineGeometryChange={handleLineGeometryChange}
          onRectangleBorderRadiusChange={handleRectangleBorderRadiusChange}
          localeMessages={messages}
        />

        <ToolBar
          interactionMode={interactionMode}
          drawingTool={drawingTool}
          messages={messages}
          setInteractionMode={setInteractionMode}
          setDrawingTool={setDrawingTool}
          drawDefaults={scene.settings.drawDefaults}
          onDrawDefaultStrokeColorChange={handleDrawDefaultStrokeColorChange}
          onDrawDefaultStrokeWidthChange={handleDrawDefaultStrokeWidthChange}
        />
      </TooltipProvider>
    </div>
  );
}
