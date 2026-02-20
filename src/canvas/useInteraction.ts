import { useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import type { Scene } from "../core/scene";
import { estimateTextWidth, getTextStartX } from "../core/elements";
import { findHitElement } from "../core/hitTest";
import {
  addElementToScene,
  type NewElementType,
  selectElement,
  selectElements,
  updateTextElementsFontFamily,
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
  setSceneWithoutHistory: Dispatch<SetStateAction<Scene>>;
  commitInteractionHistory: (before: Scene) => void;
}

interface DragItemState {
  id: string;
  x: number;
  y: number;
}

interface DragState {
  startPointerX: number;
  startPointerY: number;
  elements: DragItemState[];
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

interface GroupResizeElementState {
  id: string;
  type: SceneElement["type"];
  x: number;
  y: number;
  width: number;
  height: number;
  textAlign?: CanvasTextAlign;
  fontSize?: number;
}

interface GroupResizeState {
  handle: ResizeHandle;
  startPointerX: number;
  startPointerY: number;
  startGroupBounds: Bounds;
  elements: GroupResizeElementState[];
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

const getSelectedIds = (scene: Scene): string[] => {
  if (scene.selectedIds.length > 0) {
    return scene.selectedIds;
  }

  return scene.selectedId ? [scene.selectedId] : [];
};

const getElementBounds = (element: SceneElement): Bounds => {
  if (element.type === "rectangle") {
    return {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    };
  }

  return {
    x: getTextStartX(element),
    y: element.y - element.fontSize,
    width: Math.max(16, estimateTextWidth(element)),
    height: element.fontSize,
  };
};

export const useInteraction = ({
  scene,
  setScene,
  setSceneWithoutHistory,
  commitInteractionHistory,
}: UseInteractionProps) => {
  const dragStateRef = useRef<DragState | null>(null);
  const resizeStateRef = useRef<ResizeState | null>(null);
  const groupResizeStateRef = useRef<GroupResizeState | null>(null);
  const rotationStateRef = useRef<RotationState | null>(null);
  const interactionBeforeRef = useRef<Scene | null>(null);

  const beginInteractionHistory = useCallback(() => {
    interactionBeforeRef.current = scene;
  }, [scene]);

  const createClonedElement = (element: SceneElement): SceneElement => {
    const clonedId = `${element.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    return {
      ...element,
      id: clonedId,
    };
  };

  const handlePointerDown = useCallback(
    (x: number, y: number, altKey: boolean, shiftKey: boolean) => {
      setScene((currentScene) => {
        const hitId = findHitElement(currentScene.elements, x, y);
        const selectedIds = getSelectedIds(currentScene);

        if (hitId) {
          if (shiftKey && !altKey) {
            dragStateRef.current = null;

            if (selectedIds.includes(hitId)) {
              return currentScene;
            }

            return selectElements(currentScene, [...selectedIds, hitId]);
          }

          const baseDragIds =
            selectedIds.length > 1 && selectedIds.includes(hitId)
              ? selectedIds
              : [hitId];

          const dragElements = currentScene.elements.filter((element) =>
            baseDragIds.includes(element.id),
          );

          if (dragElements.length > 0) {
            if (altKey) {
              beginInteractionHistory();
              const clonedElements = dragElements.map((element) =>
                createClonedElement(element),
              );
              const nextElements = [
                ...currentScene.elements,
                ...clonedElements,
              ];

              dragStateRef.current = {
                startPointerX: x,
                startPointerY: y,
                elements: clonedElements.map((element) => ({
                  id: element.id,
                  x: element.x,
                  y: element.y,
                })),
              };

              return {
                ...currentScene,
                elements: nextElements,
                selectedId: clonedElements[0]?.id ?? null,
                selectedIds: clonedElements.map((element) => element.id),
              };
            }

            dragStateRef.current = {
              startPointerX: x,
              startPointerY: y,
              elements: dragElements.map((element) => ({
                id: element.id,
                x: element.x,
                y: element.y,
              })),
            };
            beginInteractionHistory();

            if (baseDragIds.length > 1) {
              return selectElements(currentScene, baseDragIds);
            }
          }
        } else {
          dragStateRef.current = null;
        }

        return selectElement(currentScene, hitId);
      });
    },
    [beginInteractionHistory, setScene],
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

        setSceneWithoutHistory((currentScene) =>
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

          setSceneWithoutHistory((currentScene) =>
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

        const textStartElement = resizeState.startElement;

        const startBounds = {
          x: textStartElement.x,
          y: textStartElement.y,
          width: textStartElement.width,
          height: textStartElement.height,
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
          Math.round(textStartElement.fontSize * scale),
        );

        const nextHeight = nextFontSize;
        const widthPerFontSize =
          textStartElement.width / textStartElement.fontSize;
        const nextWidth = Math.max(16, widthPerFontSize * nextFontSize);
        const nextTextBounds = {
          x: nextBounds.x,
          y: nextBounds.y,
          width: nextWidth,
          height: nextHeight,
        };

        setSceneWithoutHistory((currentScene) =>
          updateTextElementLayout(
            currentScene,
            resizeState.id,
            currentScene.settings.snapToGrid
              ? snapValue(
                  getTextXFromBounds(
                    nextTextBounds,
                    textStartElement.textAlign,
                  ),
                  currentScene.settings.gridSize,
                )
              : getTextXFromBounds(nextTextBounds, textStartElement.textAlign),
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

      const groupResizeState = groupResizeStateRef.current;
      if (groupResizeState) {
        const dx = x - groupResizeState.startPointerX;
        const dy = y - groupResizeState.startPointerY;
        const startBounds = groupResizeState.startGroupBounds;
        const pointerX =
          startBounds.x +
          dx +
          (groupResizeState.handle === "ne" || groupResizeState.handle === "se"
            ? startBounds.width
            : 0);
        const pointerY =
          startBounds.y +
          dy +
          (groupResizeState.handle === "sw" || groupResizeState.handle === "se"
            ? startBounds.height
            : 0);

        const nextGroupBounds = getResizedBoundsFromCorner(
          startBounds,
          groupResizeState.handle,
          pointerX,
          pointerY,
        );

        const widthRatio =
          startBounds.width === 0
            ? 1
            : nextGroupBounds.width / startBounds.width;
        const heightRatio =
          startBounds.height === 0
            ? 1
            : nextGroupBounds.height / startBounds.height;

        setSceneWithoutHistory((currentScene) => {
          const byId = new Map(
            groupResizeState.elements.map((item) => [item.id, item]),
          );

          return {
            ...currentScene,
            elements: currentScene.elements.map((element) => {
              const startElement = byId.get(element.id);
              if (!startElement) {
                return element;
              }

              const nextX =
                nextGroupBounds.x +
                (startElement.x - startBounds.x) * widthRatio;
              const nextY =
                nextGroupBounds.y +
                (startElement.y - startBounds.y) * heightRatio;
              const nextWidth = Math.max(
                startElement.type === "rectangle" ? MIN_ELEMENT_SIZE : 16,
                startElement.width * widthRatio,
              );
              const nextHeight = Math.max(
                startElement.type === "rectangle" ? MIN_ELEMENT_SIZE : 10,
                startElement.height * heightRatio,
              );

              if (element.type === "rectangle") {
                return {
                  ...element,
                  x: currentScene.settings.snapToGrid
                    ? snapValue(nextX, currentScene.settings.gridSize)
                    : nextX,
                  y: currentScene.settings.snapToGrid
                    ? snapValue(nextY, currentScene.settings.gridSize)
                    : nextY,
                  width: currentScene.settings.snapToGrid
                    ? Math.max(
                        MIN_ELEMENT_SIZE,
                        snapValue(nextWidth, currentScene.settings.gridSize),
                      )
                    : nextWidth,
                  height: currentScene.settings.snapToGrid
                    ? Math.max(
                        MIN_ELEMENT_SIZE,
                        snapValue(nextHeight, currentScene.settings.gridSize),
                      )
                    : nextHeight,
                };
              }

              const scale = Math.max(widthRatio, heightRatio);
              const startFontSize = startElement.fontSize ?? element.fontSize;
              const nextFontSize = Math.max(
                10,
                Math.round(startFontSize * scale),
              );
              const nextTextX = getTextXFromBounds(
                {
                  x: nextX,
                  y: nextY,
                  width: nextWidth,
                  height: nextHeight,
                },
                startElement.textAlign ?? element.textAlign,
              );
              const nextTextY = nextY + nextFontSize;

              return {
                ...element,
                x: currentScene.settings.snapToGrid
                  ? snapValue(nextTextX, currentScene.settings.gridSize)
                  : nextTextX,
                y: currentScene.settings.snapToGrid
                  ? snapValue(nextTextY, currentScene.settings.gridSize)
                  : nextTextY,
                fontSize: nextFontSize,
              };
            }),
          };
        });

        return;
      }

      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      setSceneWithoutHistory((currentScene) => {
        const byId = new Map(dragState.elements.map((item) => [item.id, item]));
        const dx = x - dragState.startPointerX;
        const dy = y - dragState.startPointerY;

        return {
          ...currentScene,
          elements: currentScene.elements.map((element) => {
            const startElement = byId.get(element.id);
            if (!startElement) {
              return element;
            }

            const nextX = startElement.x + dx;
            const nextY = startElement.y + dy;

            return {
              ...element,
              x: currentScene.settings.snapToGrid
                ? snapValue(nextX, currentScene.settings.gridSize)
                : nextX,
              y: currentScene.settings.snapToGrid
                ? snapValue(nextY, currentScene.settings.gridSize)
                : nextY,
            };
          }),
        };
      });
    },
    [setSceneWithoutHistory],
  );

  const handlePointerUp = useCallback(() => {
    const interactionBefore = interactionBeforeRef.current;
    if (interactionBefore) {
      commitInteractionHistory(interactionBefore);
    }

    dragStateRef.current = null;
    resizeStateRef.current = null;
    groupResizeStateRef.current = null;
    rotationStateRef.current = null;
    interactionBeforeRef.current = null;
  }, [commitInteractionHistory]);

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
      groupResizeStateRef.current = null;
      beginInteractionHistory();

      rotationStateRef.current = {
        id,
        centerX,
        centerY,
        startPointerAngle: Math.atan2(pointerY - centerY, pointerX - centerX),
        startRotation: element.rotation,
      };
    },
    [beginInteractionHistory, scene.elements],
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
      groupResizeStateRef.current = null;
      beginInteractionHistory();

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
    [beginInteractionHistory, scene.elements],
  );

  const handleGroupResizeStart = useCallback(
    (
      handle: ResizeHandle,
      pointerX: number,
      pointerY: number,
      groupBounds: Bounds,
      ids: string[],
    ) => {
      const selectedSet = new Set(ids);
      const elements = scene.elements
        .filter((element) => selectedSet.has(element.id))
        .map((element): GroupResizeElementState => {
          const bounds = getElementBounds(element);

          if (element.type === "rectangle") {
            return {
              id: element.id,
              type: element.type,
              x: bounds.x,
              y: bounds.y,
              width: bounds.width,
              height: bounds.height,
            };
          }

          return {
            id: element.id,
            type: element.type,
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            textAlign: element.textAlign,
            fontSize: element.fontSize,
          };
        });

      if (elements.length === 0) {
        return;
      }

      dragStateRef.current = null;
      resizeStateRef.current = null;
      rotationStateRef.current = null;
      beginInteractionHistory();
      groupResizeStateRef.current = {
        handle,
        startPointerX: pointerX,
        startPointerY: pointerY,
        startGroupBounds: groupBounds,
        elements,
      };
    },
    [beginInteractionHistory, scene.elements],
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

  const handleSelectElements = useCallback(
    (ids: string[]) => {
      setScene((currentScene) => selectElements(currentScene, ids));
    },
    [setScene],
  );

  const handleTextFontFamilyChange = useCallback(
    (ids: string[], fontFamily: string) => {
      setScene((currentScene) =>
        updateTextElementsFontFamily(currentScene, ids, fontFamily),
      );
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
    handleSelectElements,
    handleGroupResizeStart,
    handleTextFontFamilyChange,
  };
};
