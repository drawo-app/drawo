import { useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import type { Scene } from "../core/scene";
import { estimateTextWidth, getTextStartX } from "../core/elements";
import { findHitElement } from "../core/hitTest";
import {
  addElementToScene,
  type NewElementType,
  selectElement,
  updateElementPosition,
  updateElementRotation,
  updateRectangleElementBounds,
  updateTextElementLayout,
  updateTextElementContent,
} from "../core/scene";
import type { SceneElement } from "../core/elements";

interface UseInteractionProps {
  scene: Scene;
  setScene: Dispatch<SetStateAction<Scene>>;
}

interface DragState {
  id: string;
  offsetX: number;
  offsetY: number;
}

type ResizeHandle = "nw" | "ne" | "se" | "sw";

interface ResizeStartBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ResizeState {
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
        type: "text";
        x: number;
        y: number;
        width: number;
        height: number;
        fontSize: number;
        textAlign: CanvasTextAlign;
      };
}

interface RotationState {
  id: string;
  centerX: number;
  centerY: number;
  startPointerAngle: number;
  startRotation: number;
}

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_ELEMENT_SIZE = 20;
const MIN_CAMERA_ZOOM = 0.2;
const MAX_CAMERA_ZOOM = 4;
const ZOOM_SENSITIVITY = 0.002;

const snapValue = (value: number, gridSize: number): number => {
  return Math.round(value / gridSize) * gridSize;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const getResizedBoundsFromCorner = (
  bounds: Bounds,
  handle: ResizeHandle,
  pointerX: number,
  pointerY: number,
): Bounds => {
  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;

  if (handle === "nw") {
    const nextX = Math.min(pointerX, right - MIN_ELEMENT_SIZE);
    const nextY = Math.min(pointerY, bottom - MIN_ELEMENT_SIZE);

    return {
      x: nextX,
      y: nextY,
      width: right - nextX,
      height: bottom - nextY,
    };
  }

  if (handle === "ne") {
    const nextRight = Math.max(pointerX, bounds.x + MIN_ELEMENT_SIZE);
    const nextY = Math.min(pointerY, bottom - MIN_ELEMENT_SIZE);

    return {
      x: bounds.x,
      y: nextY,
      width: nextRight - bounds.x,
      height: bottom - nextY,
    };
  }

  if (handle === "sw") {
    const nextX = Math.min(pointerX, right - MIN_ELEMENT_SIZE);
    const nextBottom = Math.max(pointerY, bounds.y + MIN_ELEMENT_SIZE);

    return {
      x: nextX,
      y: bounds.y,
      width: right - nextX,
      height: nextBottom - bounds.y,
    };
  }

  const nextRight = Math.max(pointerX, bounds.x + MIN_ELEMENT_SIZE);
  const nextBottom = Math.max(pointerY, bounds.y + MIN_ELEMENT_SIZE);

  return {
    x: bounds.x,
    y: bounds.y,
    width: nextRight - bounds.x,
    height: nextBottom - bounds.y,
  };
};

const getTextXFromBounds = (
  bounds: Bounds,
  textAlign: CanvasTextAlign,
): number => {
  if (textAlign === "center") {
    return bounds.x + bounds.width / 2;
  }

  if (textAlign === "right" || textAlign === "end") {
    return bounds.x + bounds.width;
  }

  return bounds.x;
};

export const useInteraction = ({ scene, setScene }: UseInteractionProps) => {
  const dragStateRef = useRef<DragState | null>(null);
  const resizeStateRef = useRef<ResizeState | null>(null);
  const rotationStateRef = useRef<RotationState | null>(null);

  const createClonedElement = (element: SceneElement): SceneElement => {
    const clonedId = `${element.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    return {
      ...element,
      id: clonedId,
    };
  };

  const handlePointerDown = useCallback(
    (x: number, y: number, altKey: boolean) => {
      setScene((currentScene) => {
        const hitId = findHitElement(currentScene.elements, x, y);

        if (hitId) {
          const hitElement = currentScene.elements.find(
            (element) => element.id === hitId,
          );

          if (hitElement) {
            if (altKey) {
              const clonedElement = createClonedElement(hitElement);
              dragStateRef.current = {
                id: clonedElement.id,
                offsetX: x - clonedElement.x,
                offsetY: y - clonedElement.y,
              };

              const nextElements = [...currentScene.elements, clonedElement];
              return {
                ...currentScene,
                elements: nextElements,
                selectedId: clonedElement.id,
              };
            }

            dragStateRef.current = {
              id: hitElement.id,
              offsetX: x - hitElement.x,
              offsetY: y - hitElement.y,
            };
          }
        } else {
          dragStateRef.current = null;
        }

        return selectElement(currentScene, hitId);
      });
    },
    [setScene],
  );

  const handlePointerMove = useCallback(
    (x: number, y: number, shiftKey: boolean) => {
      const rotationState = rotationStateRef.current;
      if (rotationState) {
        const nextPointerAngle = Math.atan2(
          y - rotationState.centerY,
          x - rotationState.centerX,
        );
        const angleDeltaDegrees =
          ((nextPointerAngle - rotationState.startPointerAngle) * 180) /
          Math.PI;

        setScene((currentScene) =>
          updateElementRotation(
            currentScene,
            rotationState.id,
            rotationState.startRotation + angleDeltaDegrees,
          ),
        );
        return;
      }

      const resizeState = resizeStateRef.current;
      if (resizeState) {
        const dx = x - resizeState.startPointerX;
        const dy = y - resizeState.startPointerY;

        if (resizeState.startElement.type === "rectangle") {
          const startBounds = {
            x: resizeState.startElement.x,
            y: resizeState.startElement.y,
            width: resizeState.startElement.width,
            height: resizeState.startElement.height,
          };

          let nextBounds = getResizedBoundsFromCorner(
            startBounds,
            resizeState.handle,
            startBounds.x +
              dx +
              (resizeState.handle === "ne" || resizeState.handle === "se"
                ? startBounds.width
                : 0),
            startBounds.y +
              dy +
              (resizeState.handle === "sw" || resizeState.handle === "se"
                ? startBounds.height
                : 0),
          );

          if (shiftKey) {
            const nextSize = Math.max(
              MIN_ELEMENT_SIZE,
              Math.max(nextBounds.width, nextBounds.height),
            );

            if (resizeState.handle === "nw") {
              nextBounds = {
                x: startBounds.x + startBounds.width - nextSize,
                y: startBounds.y + startBounds.height - nextSize,
                width: nextSize,
                height: nextSize,
              };
            } else if (resizeState.handle === "ne") {
              nextBounds = {
                x: startBounds.x,
                y: startBounds.y + startBounds.height - nextSize,
                width: nextSize,
                height: nextSize,
              };
            } else if (resizeState.handle === "sw") {
              nextBounds = {
                x: startBounds.x + startBounds.width - nextSize,
                y: startBounds.y,
                width: nextSize,
                height: nextSize,
              };
            } else {
              nextBounds = {
                x: startBounds.x,
                y: startBounds.y,
                width: nextSize,
                height: nextSize,
              };
            }
          }

          setScene((currentScene) =>
            updateRectangleElementBounds(
              currentScene,
              resizeState.id,
              currentScene.settings.snapToGrid
                ? snapValue(nextBounds.x, currentScene.settings.gridSize)
                : nextBounds.x,
              currentScene.settings.snapToGrid
                ? snapValue(nextBounds.y, currentScene.settings.gridSize)
                : nextBounds.y,
              Math.max(
                MIN_ELEMENT_SIZE,
                currentScene.settings.snapToGrid
                  ? snapValue(nextBounds.width, currentScene.settings.gridSize)
                  : nextBounds.width,
              ),
              Math.max(
                MIN_ELEMENT_SIZE,
                currentScene.settings.snapToGrid
                  ? snapValue(nextBounds.height, currentScene.settings.gridSize)
                  : nextBounds.height,
              ),
            ),
          );
          return;
        }

        const startBounds = {
          x: resizeState.startElement.x,
          y: resizeState.startElement.y,
          width: resizeState.startElement.width,
          height: resizeState.startElement.height,
        };

        const nextBounds = getResizedBoundsFromCorner(
          startBounds,
          resizeState.handle,
          startBounds.x +
            dx +
            (resizeState.handle === "ne" || resizeState.handle === "se"
              ? startBounds.width
              : 0),
          startBounds.y +
            dy +
            (resizeState.handle === "sw" || resizeState.handle === "se"
              ? startBounds.height
              : 0),
        );

        const widthRatio = nextBounds.width / startBounds.width;
        const heightRatio = nextBounds.height / startBounds.height;
        const scale = Math.max(widthRatio, heightRatio);
        const nextFontSize = Math.max(
          10,
          Math.round(resizeState.startElement.fontSize * scale),
        );

        const nextHeight = nextFontSize;
        const widthPerFontSize =
          resizeState.startElement.width / resizeState.startElement.fontSize;
        const nextWidth = Math.max(16, widthPerFontSize * nextFontSize);
        const nextTextBounds = {
          x: nextBounds.x,
          y: nextBounds.y,
          width: nextWidth,
          height: nextHeight,
        };

        setScene((currentScene) =>
          updateTextElementLayout(
            currentScene,
            resizeState.id,
            currentScene.settings.snapToGrid
              ? snapValue(
                  getTextXFromBounds(
                    nextTextBounds,
                    resizeState.startElement.textAlign,
                  ),
                  currentScene.settings.gridSize,
                )
              : getTextXFromBounds(
                  nextTextBounds,
                  resizeState.startElement.textAlign,
                ),
            currentScene.settings.snapToGrid
              ? snapValue(
                  nextTextBounds.y + nextFontSize,
                  currentScene.settings.gridSize,
                )
              : nextTextBounds.y + nextFontSize,
            nextFontSize,
          ),
        );
        return;
      }

      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      setScene((currentScene) => {
        const nextX = x - dragState.offsetX;
        const nextY = y - dragState.offsetY;

        return updateElementPosition(
          currentScene,
          dragState.id,
          currentScene.settings.snapToGrid
            ? snapValue(nextX, currentScene.settings.gridSize)
            : nextX,
          currentScene.settings.snapToGrid
            ? snapValue(nextY, currentScene.settings.gridSize)
            : nextY,
        );
      });
    },
    [setScene],
  );

  const handlePointerUp = useCallback(() => {
    dragStateRef.current = null;
    resizeStateRef.current = null;
    rotationStateRef.current = null;
  }, []);

  const handleRotateStart = useCallback(
    (
      id: string,
      centerX: number,
      centerY: number,
      pointerX: number,
      pointerY: number,
    ) => {
      const element = scene.elements.find((item) => item.id === id);
      if (!element) {
        return;
      }

      dragStateRef.current = null;
      resizeStateRef.current = null;

      rotationStateRef.current = {
        id,
        centerX,
        centerY,
        startPointerAngle: Math.atan2(pointerY - centerY, pointerX - centerX),
        startRotation: element.rotation,
      };
    },
    [scene.elements],
  );

  const handleResizeStart = useCallback(
    (
      id: string,
      handle: ResizeHandle,
      pointerX: number,
      pointerY: number,
      startBounds?: ResizeStartBounds,
    ) => {
      const element = scene.elements.find((item) => item.id === id);
      if (!element) {
        return;
      }

      dragStateRef.current = null;

      if (element.type === "rectangle") {
        resizeStateRef.current = {
          id,
          handle,
          startPointerX: pointerX,
          startPointerY: pointerY,
          startElement: {
            type: "rectangle",
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
          },
        };
        return;
      }

      resizeStateRef.current = {
        id,
        handle,
        startPointerX: pointerX,
        startPointerY: pointerY,
        startElement: {
          type: "text",
          x: startBounds?.x ?? getTextStartX(element),
          y: startBounds?.y ?? element.y - element.fontSize,
          width: startBounds?.width ?? estimateTextWidth(element),
          height: startBounds?.height ?? element.fontSize,
          fontSize: element.fontSize,
          textAlign: element.textAlign,
        },
      };
    },
    [scene.elements],
  );

  const handleTextCommit = useCallback(
    (id: string, text: string) => {
      setScene((currentScene) =>
        updateTextElementContent(currentScene, id, text),
      );
    },
    [setScene],
  );

  const handleWheelPan = useCallback(
    (deltaX: number, deltaY: number) => {
      setScene((currentScene) => {
        const zoom = currentScene.camera.zoom;

        return {
          ...currentScene,
          camera: {
            ...currentScene.camera,
            x: currentScene.camera.x + deltaX / zoom,
            y: currentScene.camera.y + deltaY / zoom,
          },
        };
      });
    },
    [setScene],
  );

  const handleWheelZoom = useCallback(
    (screenX: number, screenY: number, deltaY: number) => {
      setScene((currentScene) => {
        const currentZoom = currentScene.camera.zoom;
        const zoomFactor = Math.exp(-deltaY * ZOOM_SENSITIVITY);
        const nextZoom = clamp(
          currentZoom * zoomFactor,
          MIN_CAMERA_ZOOM,
          MAX_CAMERA_ZOOM,
        );

        if (nextZoom === currentZoom) {
          return currentScene;
        }

        const worldX = screenX / currentZoom + currentScene.camera.x;
        const worldY = screenY / currentZoom + currentScene.camera.y;

        return {
          ...currentScene,
          camera: {
            x: worldX - screenX / nextZoom,
            y: worldY - screenY / nextZoom,
            zoom: nextZoom,
          },
        };
      });
    },
    [setScene],
  );

  const handleCreateElement = useCallback(
    (type: NewElementType, x: number, y: number) => {
      setScene((currentScene) => {
        const nextX = currentScene.settings.snapToGrid
          ? snapValue(x, currentScene.settings.gridSize)
          : x;
        const nextY = currentScene.settings.snapToGrid
          ? snapValue(y, currentScene.settings.gridSize)
          : y;

        return addElementToScene(currentScene, type, nextX, nextY);
      });
    },
    [setScene],
  );

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleResizeStart,
    handleRotateStart,
    handleTextCommit,
    handleWheelPan,
    handleWheelZoom,
    handleCreateElement,
  };
};
