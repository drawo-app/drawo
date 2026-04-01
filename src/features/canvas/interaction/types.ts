import type { Dispatch, SetStateAction } from "react";
import type { Scene } from "@core/scene";
import type { SceneElement } from "@core/elements";
import type { ResizeHandle } from "@features/canvas/types";

export interface UseInteractionProps {
  scene: Scene;
  setScene: Dispatch<SetStateAction<Scene>>;
  setSceneWithoutHistory: Dispatch<SetStateAction<Scene>>;
  commitInteractionHistory: (before: Scene) => void;
}

export interface DragItemState {
  id: string;
  x: number;
  y: number;
}

export interface DragState {
  startPointerX: number;
  startPointerY: number;
  elements: DragItemState[];
}

export interface ResizeStartBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResizeState {
  id: string;
  handle: ResizeHandle;
  startPointerX: number;
  startPointerY: number;
  startElement:
    | {
        type: "rectangle";
        x: number;
        y: number;
        width: number;
        height: number;
      }
    | {
        type: "circle";
        x: number;
        y: number;
        width: number;
        height: number;
      }
    | {
        type: "image";
        x: number;
        y: number;
        width: number;
        height: number;
        naturalWidth: number;
        naturalHeight: number;
      }
    | {
        type: "svg";
        x: number;
        y: number;
        width: number;
        height: number;
      }
    | {
        type: "draw";
        x: number;
        y: number;
        width: number;
        height: number;
      }
    | {
        type: "line";
        x: number;
        y: number;
        width: number;
        height: number;
      }
    | {
        type: "text";
        x: number;
        y: number;
        width: number;
        height: number;
        fontSize: number;
        textAlign: CanvasTextAlign;
      };
}

export interface GroupResizeElementState {
  id: string;
  type: SceneElement["type"];
  x: number;
  y: number;
  width: number;
  height: number;
  points?: Array<{ x: number; y: number }>;
  textAlign?: CanvasTextAlign;
  fontSize?: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GroupResizeState {
  handle: ResizeHandle;
  startPointerX: number;
  startPointerY: number;
  startGroupBounds: Bounds;
  elements: GroupResizeElementState[];
}

export interface RotationState {
  id: string;
  centerX: number;
  centerY: number;
  startPointerAngle: number;
  startRotation: number;
}

export interface GroupRotationState {
  ids: string[];
  centerX: number;
  centerY: number;
  startPointerAngle: number;
  startPositions: Map<
    string,
    {
      centerX: number;
      centerY: number;
      offsetX: number;
      offsetY: number;
      rotation: number;
    }
  >;
}
