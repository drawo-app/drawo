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
  initScene,
  type NewElementType,
  removeSelectedElement,
  selectElements,
  type Scene,
  type SceneSettings,
  updateRectangleElementsBorderRadius,
  updateSceneSettings,
} from "./core/scene";
import { isLocaleCode, LOCALES, type LocaleCode } from "./i18n";
import type { SceneElement } from "./core/elements";
import { useInteraction } from "./canvas/useInteraction";
import { CanvasView } from "./canvas/CanvasView";
import "./App.css";
import { MapArrowUp, Pen, Text } from "@solar-icons/react";
import { GrabHandLinear, LaserIcon, SquareLinear } from "./components/icons";
import { Circle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/tooltip";

const SETTINGS_STORAGE_KEY = "settings";
const SCENE_STORAGE_KEY = "scene";
const LOCALE_STORAGE_KEY = "locale";
const MAX_HISTORY_ENTRIES = 200;

interface AppState {
  past: Scene[];
  present: Scene;
  future: Scene[];
}

type AppAction =
  | {
      type: "setScene";
      updater: SetStateAction<Scene>;
      trackHistory?: boolean;
    }
  | {
      type: "commitInteraction";
      before: Scene;
    }
  | { type: "undo" }
  | { type: "redo" };

const createElementId = (type: SceneElement["type"]): string => {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
};

const normalizeElement = (element: SceneElement): SceneElement => {
  if (element.type === "rectangle" || element.type === "circle") {
    return {
      ...element,
      text: typeof element.text === "string" ? element.text : "",
      fontFamily:
        typeof element.fontFamily === "string"
          ? element.fontFamily
          : "Shantell Sans, sans-serif",
      fontSize:
        typeof element.fontSize === "number" &&
        Number.isFinite(element.fontSize)
          ? element.fontSize
          : 20,
      fontWeight:
        typeof element.fontWeight === "string" ? element.fontWeight : "200",
      fontStyle: element.fontStyle === "italic" ? "italic" : "normal",
      color: typeof element.color === "string" ? element.color : "#2f3b52",
      textAlign:
        element.textAlign === "left" ||
        element.textAlign === "center" ||
        element.textAlign === "right" ||
        element.textAlign === "start" ||
        element.textAlign === "end"
          ? element.textAlign
          : "center",
    };
  }

  if (element.type === "draw") {
    return {
      ...element,
      width:
        typeof element.width === "number" && Number.isFinite(element.width)
          ? Math.max(1, element.width)
          : 1,
      height:
        typeof element.height === "number" && Number.isFinite(element.height)
          ? Math.max(1, element.height)
          : 1,
      points: Array.isArray(element.points)
        ? element.points
            .filter(
              (point): point is { x: number; y: number } =>
                typeof point?.x === "number" && typeof point?.y === "number",
            )
            .map((point) => ({ x: point.x, y: point.y }))
        : [],
      stroke: typeof element.stroke === "string" ? element.stroke : "#2f3b52",
      strokeWidth:
        typeof element.strokeWidth === "number" &&
        Number.isFinite(element.strokeWidth)
          ? Math.max(1, element.strokeWidth)
          : 2,
    };
  }

  return element;
};

const isValidTheme = (value: unknown): value is SceneSettings["theme"] => {
  return value === "light" || value === "dark";
};

const loadInitialScene = (): Scene => {
  const baseScene = initScene();

  try {
    const rawScene = localStorage.getItem(SCENE_STORAGE_KEY);
    if (rawScene) {
      const parsed = JSON.parse(rawScene) as Partial<Scene>;
      const camera = parsed.camera;
      const parsedSettings = parsed.settings;
      const nextSettings: Partial<SceneSettings> = {};

      if (parsedSettings && typeof parsedSettings.showGrid === "boolean") {
        nextSettings.showGrid = parsedSettings.showGrid;
      }
      if (parsedSettings && typeof parsedSettings.snapToGrid === "boolean") {
        nextSettings.snapToGrid = parsedSettings.snapToGrid;
      }
      if (
        parsedSettings &&
        typeof parsedSettings.gridSize === "number" &&
        Number.isFinite(parsedSettings.gridSize)
      ) {
        nextSettings.gridSize = parsedSettings.gridSize;
      }
      if (parsedSettings && isValidTheme(parsedSettings.theme)) {
        nextSettings.theme = parsedSettings.theme;
      }

      const nextScene: Scene = {
        ...baseScene,
        elements: Array.isArray(parsed.elements)
          ? (parsed.elements as SceneElement[]).map(normalizeElement)
          : baseScene.elements,
        selectedId:
          typeof parsed.selectedId === "string" ? parsed.selectedId : null,
        selectedIds: Array.isArray(parsed.selectedIds)
          ? parsed.selectedIds.filter(
              (id): id is string => typeof id === "string",
            )
          : [],
        camera:
          camera &&
          typeof camera.x === "number" &&
          typeof camera.y === "number" &&
          typeof camera.zoom === "number"
            ? camera
            : baseScene.camera,
        settings: {
          ...baseScene.settings,
          ...nextSettings,
        },
      };

      if (nextScene.selectedIds.length === 0 && nextScene.selectedId) {
        nextScene.selectedIds = [nextScene.selectedId];
      }

      return nextScene;
    }

    const rawSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!rawSettings) {
      return baseScene;
    }

    const parsed = JSON.parse(rawSettings) as Partial<SceneSettings>;
    const nextSettings: Partial<SceneSettings> = {};

    if (typeof parsed.showGrid === "boolean") {
      nextSettings.showGrid = parsed.showGrid;
    }
    if (typeof parsed.snapToGrid === "boolean") {
      nextSettings.snapToGrid = parsed.snapToGrid;
    }
    if (
      typeof parsed.gridSize === "number" &&
      Number.isFinite(parsed.gridSize)
    ) {
      nextSettings.gridSize = parsed.gridSize;
    }
    if (isValidTheme(parsed.theme)) {
      nextSettings.theme = parsed.theme;
    }

    return updateSceneSettings(baseScene, nextSettings);
  } catch {
    return baseScene;
  }
};

const createInitialAppState = (): AppState => ({
  past: [],
  present: loadInitialScene(),
  future: [],
});

const appReducer = (state: AppState, action: AppAction): AppState => {
  if (action.type === "undo") {
    if (state.past.length === 0) {
      return state;
    }

    const previous = state.past[state.past.length - 1];
    return {
      past: state.past.slice(0, -1),
      present: previous,
      future: [state.present, ...state.future],
    };
  }

  if (action.type === "redo") {
    if (state.future.length === 0) {
      return state;
    }

    const [next, ...restFuture] = state.future;
    return {
      past: [...state.past, state.present].slice(-MAX_HISTORY_ENTRIES),
      present: next,
      future: restFuture,
    };
  }

  if (action.type === "commitInteraction") {
    if (action.before === state.present) {
      return state;
    }

    return {
      past: [...state.past, action.before].slice(-MAX_HISTORY_ENTRIES),
      present: state.present,
      future: [],
    };
  }

  const nextScene =
    typeof action.updater === "function"
      ? action.updater(state.present)
      : action.updater;

  if (nextScene === state.present) {
    return state;
  }

  if (action.trackHistory === false) {
    return {
      ...state,
      present: nextScene,
    };
  }

  return {
    past: [...state.past, state.present].slice(-MAX_HISTORY_ENTRIES),
    present: nextScene,
    future: [],
  };
};

export default function App() {
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
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      const tagName = target.tagName.toLowerCase();
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select"
      ) {
        return true;
      }

      return target.isContentEditable;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      const hasShortcutModifier = event.ctrlKey || event.metaKey;

      if (hasShortcutModifier && !event.altKey && key === "z") {
        event.preventDefault();

        if (event.shiftKey) {
          dispatch({ type: "redo" });
          return;
        }

        dispatch({ type: "undo" });
        return;
      }

      if (hasShortcutModifier && !event.altKey && key === "y") {
        event.preventDefault();
        dispatch({ type: "redo" });
        return;
      }

      if (hasShortcutModifier && !event.altKey && key === "a") {
        event.preventDefault();
        dispatch({
          type: "setScene",
          updater: (currentScene) =>
            selectElements(
              currentScene,
              currentScene.elements.map((element) => element.id),
            ),
        });
        return;
      }

      if (hasShortcutModifier && !event.altKey && key === "c") {
        const selectedIds =
          scene.selectedIds.length > 0
            ? scene.selectedIds
            : scene.selectedId
              ? [scene.selectedId]
              : [];

        if (selectedIds.length === 0) {
          return;
        }

        event.preventDefault();
        clipboardRef.current = scene.elements
          .filter((element) => selectedIds.includes(element.id))
          .map((element) => ({ ...element }));
        pasteOffsetRef.current = 0;
        return;
      }

      if (hasShortcutModifier && !event.altKey && key === "x") {
        const selectedIds =
          scene.selectedIds.length > 0
            ? scene.selectedIds
            : scene.selectedId
              ? [scene.selectedId]
              : [];

        if (selectedIds.length === 0) {
          return;
        }

        event.preventDefault();
        clipboardRef.current = scene.elements
          .filter((element) => selectedIds.includes(element.id))
          .map((element) => ({ ...element }));
        pasteOffsetRef.current = 0;

        dispatch({
          type: "setScene",
          updater: (currentScene) => removeSelectedElement(currentScene),
        });
        return;
      }

      if (hasShortcutModifier && !event.altKey && key === "v") {
        const clipboardElements = clipboardRef.current;
        if (!clipboardElements || clipboardElements.length === 0) {
          return;
        }

        event.preventDefault();
        pasteOffsetRef.current += 24;
        const offset = pasteOffsetRef.current;

        dispatch({
          type: "setScene",
          updater: (currentScene) => {
            const pastedElements = clipboardElements.map((element) => {
              const clonedElement: SceneElement = {
                ...element,
                id: createElementId(element.type),
                x: element.x + offset,
                y: element.y + offset,
              };

              return clonedElement;
            });

            return {
              ...currentScene,
              elements: [...currentScene.elements, ...pastedElements],
              selectedId: pastedElements[0]?.id ?? null,
              selectedIds: pastedElements.map((element) => element.id),
            };
          },
        });
        return;
      }

      if (!hasShortcutModifier && !event.altKey) {
        if (key === "v") {
          event.preventDefault();
          setInteractionMode("select");
          setDrawingTool(null);
          return;
        }

        if (key === "h") {
          event.preventDefault();
          setInteractionMode("pan");
          setDrawingTool(null);
          return;
        }

        if (event.code === "Digit1") {
          event.preventDefault();
          setInteractionMode("select");
          setDrawingTool("text");
          return;
        }

        if (event.code === "Digit2") {
          event.preventDefault();
          setInteractionMode("select");
          setDrawingTool("rectangle");
          return;
        }

        if (event.code === "Digit3") {
          event.preventDefault();
          setInteractionMode("select");
          setDrawingTool("circle");
          return;
        }

        if (event.code === "Digit4") {
          event.preventDefault();
          setInteractionMode("select");
          setDrawingTool("draw");
          return;
        }

        if (key === "k") {
          event.preventDefault();
          setInteractionMode("select");
          setDrawingTool("laser");
          return;
        }
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        if (!scene.selectedId && scene.selectedIds.length === 0) {
          return;
        }

        event.preventDefault();
        dispatch({
          type: "setScene",
          updater: (currentScene) => removeSelectedElement(currentScene),
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [scene]);

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
    handleDrawStrokeWidthChange,
    handleDrawStrokeColorChange,
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
    <div className={`app-root`}>
      <TooltipProvider>
        <div className="settings-bar">
          <label className="switch-row">
            <input
              type="checkbox"
              checked={scene.settings.showGrid}
              onChange={(event) =>
                setScene((currentScene) =>
                  updateSceneSettings(currentScene, {
                    showGrid: event.target.checked,
                  }),
                )
              }
            />
            <span>{messages.settings.showGrid}</span>
          </label>

          <label className="switch-row">
            <input
              type="checkbox"
              checked={scene.settings.snapToGrid}
              onChange={(event) =>
                setScene((currentScene) =>
                  updateSceneSettings(currentScene, {
                    snapToGrid: event.target.checked,
                  }),
                )
              }
            />
            <span>{messages.settings.snapToGrid}</span>
          </label>

          <label className="switch-row">
            <input
              type="checkbox"
              checked={isDarkMode}
              onChange={(event) =>
                setScene((currentScene) =>
                  updateSceneSettings(currentScene, {
                    theme: event.target.checked ? "dark" : "light",
                  }),
                )
              }
            />
            <span>{messages.settings.darkMode}</span>
          </label>

          <label className="switch-row">
            <span>{messages.settings.language}</span>
            <select
              value={locale}
              onChange={(event) => {
                const next = event.target.value;
                if (isLocaleCode(next)) {
                  setLocale(next);
                }
              }}
            >
              <option value="en_US">{messages.localeNames.en_US}</option>
              <option value="es_ES">{messages.localeNames.es_ES}</option>
            </select>
          </label>
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
          onDrawStrokeWidthChange={handleDrawStrokeWidthChange}
          onDrawStrokeColorChange={handleDrawStrokeColorChange}
          onRectangleBorderRadiusChange={handleRectangleBorderRadiusChange}
          localeMessages={messages}
        />

        <div className="tool-bar">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={`tool-item${interactionMode === "select" && !drawingTool ? " active" : ""}`}
                onClick={() => {
                  setInteractionMode("select");
                  setDrawingTool(null);
                }}
              >
                <MapArrowUp
                  style={{
                    transform:
                      "translateY(-2px) translateX(-3px) rotate(-46deg)",
                  }}
                  strokeWidth={0.1}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{messages.toolNames.selection}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={`tool-item${interactionMode === "pan" ? " active" : ""}`}
                onClick={() => {
                  setInteractionMode("pan");
                  setDrawingTool(null);
                }}
              >
                <GrabHandLinear />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{messages.toolNames.pan}</p>
            </TooltipContent>
          </Tooltip>
          <div className="tool-separator" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={`tool-item${drawingTool === "text" ? " active" : ""}`}
                onClick={() => {
                  setInteractionMode("select");
                  setDrawingTool("text");
                }}
              >
                <Text strokeWidth={0.1} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{messages.toolNames.text}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={`tool-item${drawingTool === "rectangle" ? " active" : ""}`}
                onClick={() => {
                  setInteractionMode("select");
                  setDrawingTool("rectangle");
                }}
              >
                <SquareLinear />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{messages.toolNames.rectangle}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={`tool-item${drawingTool === "circle" ? " active" : ""}`}
                onClick={() => {
                  setInteractionMode("select");
                  setDrawingTool("circle");
                }}
              >
                <Circle strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{messages.toolNames.ellipse}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={`tool-item${drawingTool === "draw" ? " active" : ""}`}
                onClick={() => {
                  setInteractionMode("select");
                  setDrawingTool("draw");
                }}
              >
                <Pen strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{messages.toolNames.draw}</p>
            </TooltipContent>
          </Tooltip>
          <div className="tool-separator" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={`tool-item${drawingTool === "laser" ? " active" : ""}`}
                onClick={() => {
                  setInteractionMode("select");
                  setDrawingTool("laser");
                }}
              >
                <LaserIcon strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{messages.toolNames.laser}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
