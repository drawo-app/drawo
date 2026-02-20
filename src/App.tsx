import {
  useCallback,
  useEffect,
  useReducer,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  initScene,
  type NewElementType,
  removeSelectedElement,
  type Scene,
  type SceneSettings,
  updateSceneSettings,
} from "./core/scene";
import { useInteraction } from "./canvas/useInteraction";
import { CanvasView } from "./canvas/CanvasView";
import "./App.css";

const SETTINGS_STORAGE_KEY = "settings";
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
  | { type: "undo" }
  | { type: "redo" };

const isValidTheme = (value: unknown): value is SceneSettings["theme"] => {
  return value === "light" || value === "dark";
};

const loadInitialScene = (): Scene => {
  const baseScene = initScene();

  try {
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
    if (typeof parsed.gridSize === "number" && Number.isFinite(parsed.gridSize)) {
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
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialAppState);
  const scene = state.present;
  const isDarkMode = scene.settings.theme === "dark";
  const setScene: Dispatch<SetStateAction<Scene>> = useCallback((updater) => {
    dispatch({ type: "setScene", updater });
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(scene.settings));
  }, [scene.settings]);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      const tagName = target.tagName.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || tagName === "select") {
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

      if (event.key === "Backspace" || event.key === "Delete") {
        if (!scene.selectedId) {
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
  }, [scene.selectedId]);

  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleResizeStart,
    handleRotateStart,
    handleTextCommit,
    handleWheelPan,
    handleWheelZoom,
    handleCreateElement,
  } = useInteraction({
    scene,
    setScene,
  });

  const handlePaletteDragStart = (
    event: React.DragEvent<HTMLButtonElement>,
    type: NewElementType,
  ) => {
    event.dataTransfer.setData("application/x-drawo-element", type);
    event.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className={`app-root${isDarkMode ? " app-root--dark" : ""}`}>
      <div className="toolbar">
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
          <span>Show grid</span>
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
          <span>Snap to grid</span>
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
          <span>Dark mode</span>
        </label>
      </div>

      <CanvasView
        scene={scene}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onResizeStart={handleResizeStart}
        onRotateStart={handleRotateStart}
        onTextCommit={handleTextCommit}
        onWheelPan={handleWheelPan}
        onWheelZoom={handleWheelZoom}
        onCreateElement={handleCreateElement}
      />

      <div className="insert-bar">
        <button
          type="button"
          draggable
          className="insert-item"
          onDragStart={(event) => handlePaletteDragStart(event, "rectangle")}
        >
          Rectangle
        </button>

        <button
          type="button"
          draggable
          className="insert-item"
          onDragStart={(event) => handlePaletteDragStart(event, "text")}
        >
          Text
        </button>
      </div>
    </div>
  );
}
