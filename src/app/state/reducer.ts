import { MAX_HISTORY_ENTRIES } from "./constants";
import { loadInitialScene } from "./scenePersistence";
import type { AppAction, AppState } from "./types";

export const createInitialAppState = (): AppState => ({
  past: [],
  present: loadInitialScene(),
  future: [],
});

export const appReducer = (state: AppState, action: AppAction): AppState => {
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
