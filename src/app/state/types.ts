import type { SetStateAction } from "react";
import type { Scene } from "../../core/scene";

export interface AppState {
  past: Scene[];
  present: Scene;
  future: Scene[];
}

export type AppAction =
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
