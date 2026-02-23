import { useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import type { Scene } from "../core/scene";
import {
  estimateTextHeight,
  estimateTextWidth,
  getTextStartX,
} from "../core/elements";
import { findHitElement } from "../core/hitTest";
import {
  addDrawElementToScene,
  addElementToScene,
  type ElementCreationBounds,
  type DrawElementStyle,
  type NewElementType,
  selectElement,
  selectElements,
  updateDrawElementsStrokeWidth,
  updateTextElementsFontSize,
  updateTextElementsFontFamily,
  updateTextElementsFontWeight,
  updateTextElementsFontStyle,
  updateElementPosition,
  updateElementRotation,
  updateGroupElementsRotation,
  updateRectangleElementBounds,
  updateTextElementLayout,
  updateTextElementContent,
  updateDrawElementsStrokeColor,
} from "../core/scene";
import type { SceneElement } from "../core/elements";
import type { LocaleMessages } from "../i18n";

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
        type: "circle";
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
  points?: Array<{ x: number; y: number }>;
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

interface GroupRotationState {
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

const getAspectRatioLockedBounds = (
  bounds: Bounds,
  handle: ResizeHandle,
  aspectRatio: number,
  fromCenter: boolean,
): Bounds => {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    return bounds;
  }

  const widthFromHeight = Math.max(1, bounds.height * aspectRatio);
  const heightFromWidth = Math.max(1, bounds.width / aspectRatio);
  const useWidthDriven =
    Math.abs(heightFromWidth - bounds.height) <=
    Math.abs(widthFromHeight - bounds.width);

  const lockedWidth = useWidthDriven ? bounds.width : widthFromHeight;
  const lockedHeight = useWidthDriven ? heightFromWidth : bounds.height;

  if (fromCenter) {
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    return {
      x: centerX - lockedWidth / 2,
      y: centerY - lockedHeight / 2,
      width: lockedWidth,
      height: lockedHeight,
    };
  }

  if (handle === "nw") {
    const anchorX = bounds.x + bounds.width;
    const anchorY = bounds.y + bounds.height;

    return {
      x: anchorX - lockedWidth,
      y: anchorY - lockedHeight,
      width: lockedWidth,
      height: lockedHeight,
    };
  }

  if (handle === "ne") {
    const anchorY = bounds.y + bounds.height;

    return {
      x: bounds.x,
      y: anchorY - lockedHeight,
      width: lockedWidth,
      height: lockedHeight,
    };
  }

  if (handle === "sw") {
    const anchorX = bounds.x + bounds.width;

    return {
      x: anchorX - lockedWidth,
      y: bounds.y,
      width: lockedWidth,
      height: lockedHeight,
    };
  }

  return {
    x: bounds.x,
    y: bounds.y,
    width: lockedWidth,
    height: lockedHeight,
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
  if (element.type === "rectangle" || element.type === "circle") {
    return {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    };
  }

  if (element.type === "draw") {
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
    height: estimateTextHeight(element),
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
  const groupRotationStateRef = useRef<GroupRotationState | null>(null);
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
          const baseDragIds =
            selectedIds.length > 1 && selectedIds.includes(hitId)
              ? selectedIds
              : [hitId];

          // Multi-select only if shift is pressed AND the element is not already selected
          // Otherwise shift is used for ruler constraint on drag
          if (shiftKey && !altKey && !baseDragIds.includes(hitId)) {
            dragStateRef.current = null;
            return selectElements(currentScene, [...selectedIds, hitId]);
          }

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
    (x: number, y: number, shiftKey: boolean, altKey: boolean) => {
      const rotationState = rotationStateRef.current;
      if (rotationState) {
        const nextPointerAngle = Math.atan2(
          y - rotationState.centerY,
          x - rotationState.centerX,
        );
        const angleDeltaDegrees =
          ((nextPointerAngle - rotationState.startPointerAngle) * 180) /
          Math.PI;
        const nextRotationRaw = rotationState.startRotation + angleDeltaDegrees;
        const nextRotation = shiftKey
          ? Math.round(nextRotationRaw / 10) * 10
          : nextRotationRaw;

        setSceneWithoutHistory((currentScene) =>
          updateElementRotation(currentScene, rotationState.id, nextRotation),
        );
        return;
      }

      const groupRotationState = groupRotationStateRef.current;
      if (groupRotationState) {
        const nextPointerAngle = Math.atan2(
          y - groupRotationState.centerY,
          x - groupRotationState.centerX,
        );
        const angleDeltaDegrees =
          ((nextPointerAngle - groupRotationState.startPointerAngle) * 180) /
          Math.PI;
        const snappedAngle = shiftKey
          ? Math.round(angleDeltaDegrees / 10) * 10
          : angleDeltaDegrees;

        setSceneWithoutHistory((currentScene) =>
          updateGroupElementsRotation(
            currentScene,
            groupRotationState.ids,
            snappedAngle,
            groupRotationState.centerX,
            groupRotationState.centerY,
            groupRotationState.startPositions,
          ),
        );
        return;
      }

      const resizeState = resizeStateRef.current;
      if (resizeState) {
        const dx = x - resizeState.startPointerX;
        const dy = y - resizeState.startPointerY;

        if (
          resizeState.startElement.type === "rectangle" ||
          resizeState.startElement.type === "circle" ||
          resizeState.startElement.type === "draw"
        ) {
          const startBounds = {
            x: resizeState.startElement.x,
            y: resizeState.startElement.y,
            width: resizeState.startElement.width,
            height: resizeState.startElement.height,
          };

          let nextBounds: Bounds;

          if (altKey) {
            const centerX = startBounds.x + startBounds.width / 2;
            const centerY = startBounds.y + startBounds.height / 2;
            const halfWidth = Math.max(
              MIN_ELEMENT_SIZE / 2,
              Math.abs(x - centerX),
            );
            const halfHeight = Math.max(
              MIN_ELEMENT_SIZE / 2,
              Math.abs(y - centerY),
            );

            nextBounds = {
              x: centerX - halfWidth,
              y: centerY - halfHeight,
              width: halfWidth * 2,
              height: halfHeight * 2,
            };
          } else {
            nextBounds = getResizedBoundsFromCorner(
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
          }

          if (shiftKey) {
            const startAspectRatio =
              startBounds.height === 0
                ? 1
                : startBounds.width / startBounds.height;
            const aspectLockedBounds = getAspectRatioLockedBounds(
              nextBounds,
              resizeState.handle,
              startAspectRatio,
              altKey,
            );
            const minSize =
              resizeState.startElement.type === "draw" ? 1 : MIN_ELEMENT_SIZE;

            nextBounds = {
              ...aspectLockedBounds,
              width: Math.max(minSize, aspectLockedBounds.width),
              height: Math.max(minSize, aspectLockedBounds.height),
            };
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
                resizeState.startElement.type === "draw" ? 1 : MIN_ELEMENT_SIZE,
                currentScene.settings.snapToGrid
                  ? snapValue(nextBounds.width, currentScene.settings.gridSize)
                  : nextBounds.width,
              ),
              Math.max(
                resizeState.startElement.type === "draw" ? 1 : MIN_ELEMENT_SIZE,
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

        const nextBounds = altKey
          ? (() => {
              const centerX = startBounds.x + startBounds.width / 2;
              const centerY = startBounds.y + startBounds.height / 2;
              const halfWidth = Math.max(8, Math.abs(x - centerX));
              const halfHeight = Math.max(8, Math.abs(y - centerY));

              return {
                x: centerX - halfWidth,
                y: centerY - halfHeight,
                width: halfWidth * 2,
                height: halfHeight * 2,
              };
            })()
          : getResizedBoundsFromCorner(
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

        let nextGroupBounds = getResizedBoundsFromCorner(
          startBounds,
          groupResizeState.handle,
          pointerX,
          pointerY,
        );

        if (shiftKey) {
          const startAspectRatio =
            startBounds.height === 0
              ? 1
              : startBounds.width / startBounds.height;
          nextGroupBounds = getAspectRatioLockedBounds(
            nextGroupBounds,
            groupResizeState.handle,
            startAspectRatio,
            false,
          );
        }

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
              const minSize =
                startElement.type === "draw"
                  ? 1
                  : startElement.type === "rectangle" ||
                      startElement.type === "circle"
                    ? MIN_ELEMENT_SIZE
                    : 16;
              const nextWidth = Math.max(
                minSize,
                startElement.width * widthRatio,
              );
              const nextHeight = Math.max(
                startElement.type === "draw"
                  ? 1
                  : startElement.type === "rectangle" ||
                      startElement.type === "circle"
                    ? MIN_ELEMENT_SIZE
                    : 10,
                startElement.height * heightRatio,
              );

              const appliedX = currentScene.settings.snapToGrid
                ? snapValue(nextX, currentScene.settings.gridSize)
                : nextX;
              const appliedY = currentScene.settings.snapToGrid
                ? snapValue(nextY, currentScene.settings.gridSize)
                : nextY;
              const appliedWidth = currentScene.settings.snapToGrid
                ? Math.max(
                    minSize,
                    snapValue(nextWidth, currentScene.settings.gridSize),
                  )
                : nextWidth;
              const appliedHeight = currentScene.settings.snapToGrid
                ? Math.max(
                    startElement.type === "draw"
                      ? 1
                      : startElement.type === "rectangle" ||
                          startElement.type === "circle"
                        ? MIN_ELEMENT_SIZE
                        : 10,
                    snapValue(nextHeight, currentScene.settings.gridSize),
                  )
                : nextHeight;

              if (element.type === "rectangle" || element.type === "circle") {
                return {
                  ...element,
                  x: appliedX,
                  y: appliedY,
                  width: appliedWidth,
                  height: appliedHeight,
                };
              }

              if (element.type === "draw") {
                const pointScaleX =
                  startElement.width === 0
                    ? 1
                    : appliedWidth / startElement.width;
                const pointScaleY =
                  startElement.height === 0
                    ? 1
                    : appliedHeight / startElement.height;

                return {
                  ...element,
                  x: appliedX,
                  y: appliedY,
                  width: appliedWidth,
                  height: appliedHeight,
                  points: (startElement.points ?? element.points).map(
                    (point) => ({
                      x: point.x * pointScaleX,
                      y: point.y * pointScaleY,
                    }),
                  ),
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
        let dx = x - dragState.startPointerX;
        let dy = y - dragState.startPointerY;

        // Ruler constraint with shift key
        if (shiftKey) {
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          // Determine direction based on which delta is larger
          if (absDx > absDy) {
            // Horizontal ruler: lock Y movement
            dy = 0;
          } else {
            // Vertical ruler: lock X movement
            dx = 0;
          }
        }

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
    groupRotationStateRef.current = null;
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

  const handleGroupRotateStart = useCallback(
    (
      centerX: number,
      centerY: number,
      pointerX: number,
      pointerY: number,
      ids: string[],
    ) => {
      dragStateRef.current = null;
      resizeStateRef.current = null;
      groupResizeStateRef.current = null;
      rotationStateRef.current = null;
      beginInteractionHistory();

      const startPositions = new Map<
        string,
        {
          centerX: number;
          centerY: number;
          offsetX: number;
          offsetY: number;
          rotation: number;
        }
      >();
      for (const id of ids) {
        const element = scene.elements.find((item) => item.id === id);
        if (element) {
          const bounds = getElementBounds(element);
          const elementCenterX = bounds.x + bounds.width / 2;
          const elementCenterY = bounds.y + bounds.height / 2;

          startPositions.set(id, {
            centerX: elementCenterX,
            centerY: elementCenterY,
            offsetX: element.x - elementCenterX,
            offsetY: element.y - elementCenterY,
            rotation: element.rotation,
          });
        }
      }

      groupRotationStateRef.current = {
        ids,
        centerX,
        centerY,
        startPointerAngle: Math.atan2(pointerY - centerY, pointerX - centerX),
        startPositions,
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

      if (element.type === "rectangle" || element.type === "circle") {
        resizeStateRef.current = {
          id,
          handle,
          startPointerX: pointerX,
          startPointerY: pointerY,
          startElement: {
            type: element.type,
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
          },
        };
        return;
      }

      if (element.type === "draw") {
        resizeStateRef.current = {
          id,
          handle,
          startPointerX: pointerX,
          startPointerY: pointerY,
          startElement: {
            type: element.type,
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
          height: startBounds?.height ?? estimateTextHeight(element),
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

          if (
            element.type === "rectangle" ||
            element.type === "circle" ||
            element.type === "draw"
          ) {
            return {
              id: element.id,
              type: element.type,
              x: bounds.x,
              y: bounds.y,
              width: bounds.width,
              height: bounds.height,
              points: element.type === "draw" ? [...element.points] : undefined,
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
    (
      type: NewElementType,
      x: number,
      y: number,
      messages: LocaleMessages,
      bounds?: ElementCreationBounds,
    ) => {
      setScene((currentScene) => {
        const nextX = currentScene.settings.snapToGrid
          ? snapValue(x, currentScene.settings.gridSize)
          : x;
        const nextY = currentScene.settings.snapToGrid
          ? snapValue(y, currentScene.settings.gridSize)
          : y;

        const nextBounds = bounds
          ? {
              x: currentScene.settings.snapToGrid
                ? snapValue(bounds.x, currentScene.settings.gridSize)
                : bounds.x,
              y: currentScene.settings.snapToGrid
                ? snapValue(bounds.y, currentScene.settings.gridSize)
                : bounds.y,
              width: currentScene.settings.snapToGrid
                ? Math.max(
                    1,
                    snapValue(bounds.width, currentScene.settings.gridSize),
                  )
                : bounds.width,
              height: currentScene.settings.snapToGrid
                ? Math.max(
                    1,
                    snapValue(bounds.height, currentScene.settings.gridSize),
                  )
                : bounds.height,
            }
          : undefined;

        return addElementToScene(
          currentScene,
          type,
          nextX,
          nextY,
          messages,
          nextBounds,
        );
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

  const handleTextFontSizeChange = useCallback(
    (ids: string[], fontSize: number) => {
      setScene((currentScene) =>
        updateTextElementsFontSize(currentScene, ids, fontSize),
      );
    },
    [setScene],
  );

  const handleTextFontWeightChange = useCallback(
    (ids: string[], fontWeight: string) => {
      setScene((currentScene) =>
        updateTextElementsFontWeight(currentScene, ids, fontWeight),
      );
    },
    [setScene],
  );

  const handleTextFontStyleChange = useCallback(
    (ids: string[], fontStyle: "normal" | "italic") => {
      setScene((currentScene) =>
        updateTextElementsFontStyle(currentScene, ids, fontStyle),
      );
    },
    [setScene],
  );

  const handleCreateDrawElement = useCallback(
    (
      points: Array<{ x: number; y: number }>,
      style?: Partial<DrawElementStyle>,
    ) => {
      setScene((currentScene) => {
        const nextPoints = currentScene.settings.snapToGrid
          ? points.map((point) => ({
              x: snapValue(point.x, currentScene.settings.gridSize),
              y: snapValue(point.y, currentScene.settings.gridSize),
            }))
          : points;

        return addDrawElementToScene(currentScene, nextPoints, style);
      });
    },
    [setScene],
  );

  const handleDrawStrokeWidthChange = useCallback(
    (ids: string[], strokeWidth: number) => {
      setScene((currentScene) =>
        updateDrawElementsStrokeWidth(currentScene, ids, strokeWidth),
      );
    },
    [setScene],
  );

  const handleDrawStrokeColorChange = useCallback(
    (ids: string[], strokeColor: string) => {
      setScene((currentScene) =>
        updateDrawElementsStrokeColor(currentScene, ids, strokeColor),
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
    handleGroupRotateStart,
    handleTextCommit,
    handleWheelPan,
    handleWheelZoom,
    handleCreateElement,
    handleSelectElements,
    handleGroupResizeStart,
    handleTextFontFamilyChange,
    handleTextFontSizeChange,
    handleTextFontWeightChange,
    handleTextFontStyleChange,
    handleCreateDrawElement,
    handleDrawStrokeWidthChange,
    handleDrawStrokeColorChange,
  };
};
