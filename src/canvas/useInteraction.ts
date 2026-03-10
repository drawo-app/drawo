import { useCallback, useRef } from "react";
import {
  estimateTextHeight,
  estimateTextWidth,
  getTextStartX,
  createElementId,
} from "../core/elements";
import { findHitElement } from "../core/hitTest";
import {
  addDrawElementToScene,
  addElementToScene,
  type DrawElementStyle,
  type ElementCreationBounds,
  type NewElementType,
  selectElement,
  selectElements,
  type Scene,
  updateDrawElementsStrokeColor,
  updateDrawElementsStrokeWidth,
  updateElementRotation,
  updateGroupElementsRotation,
  updateRectangleElementBounds,
  updateSceneSettings,
  updateTextElementContent,
  updateTextElementLayout,
  updateTextElementsFontFamily,
  updateTextElementsFontSize,
  updateTextElementsFontStyle,
  updateTextElementsFontWeight,
  updateTextElementsTextAlign,
} from "../core/scene";
import type { LineCap, SceneElement } from "../core/elements";
import type { LocaleMessages } from "../i18n";
import type { ResizeHandle } from "./types";
import {
  MAX_CAMERA_ZOOM,
  MIN_CAMERA_ZOOM,
  MIN_ELEMENT_SIZE,
  ZOOM_SENSITIVITY,
} from "./interaction/constants";
import {
  clamp,
  getAspectRatioLockedBounds,
  getElementBounds,
  getResizedBoundsFromCorner,
  getSelectedIds,
  getTextXFromBounds,
  snapValue,
} from "./interaction/geometry";
import type {
  Bounds,
  DragState,
  GroupResizeElementState,
  GroupResizeState,
  GroupRotationState,
  ResizeStartBounds,
  ResizeState,
  RotationState,
  UseInteractionProps,
} from "./interaction/types";
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
    return {
      ...element,
      id: createElementId(element.type),
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
          resizeState.startElement.type === "draw" ||
          resizeState.startElement.type === "line"
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
              resizeState.startElement.type === "draw" ||
              resizeState.startElement.type === "line"
                ? 1
                : MIN_ELEMENT_SIZE;

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
                resizeState.startElement.type === "draw" ||
                  resizeState.startElement.type === "line"
                  ? 1
                  : MIN_ELEMENT_SIZE,
                currentScene.settings.snapToGrid
                  ? snapValue(nextBounds.width, currentScene.settings.gridSize)
                  : nextBounds.width,
              ),
              Math.max(
                resizeState.startElement.type === "draw" ||
                  resizeState.startElement.type === "line"
                  ? 1
                  : MIN_ELEMENT_SIZE,
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

              if (element.type === "line") {
                return {
                  ...element,
                  x: appliedX,
                  y: appliedY,
                  width: appliedWidth,
                  height: appliedHeight,
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

            const appliedX = currentScene.settings.snapToGrid
              ? snapValue(nextX, currentScene.settings.gridSize)
              : nextX;
            const appliedY = currentScene.settings.snapToGrid
              ? snapValue(nextY, currentScene.settings.gridSize)
              : nextY;

            if (element.type === "line") {
              const controlPoint = element.controlPoint
                ? {
                    x: appliedX + (element.controlPoint.x - element.x),
                    y: appliedY + (element.controlPoint.y - element.y),
                  }
                : null;

              return {
                ...element,
                x: appliedX,
                y: appliedY,
                controlPoint,
              };
            }

            return {
              ...element,
              x: appliedX,
              y: appliedY,
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

      if (element.type === "line") {
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

          if (element.type === "line") {
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
      setSceneWithoutHistory((currentScene) => {
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
    [setSceneWithoutHistory],
  );

  const handleWheelZoom = useCallback(
    (screenX: number, screenY: number, deltaY: number) => {
      setSceneWithoutHistory((currentScene) => {
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
    [setSceneWithoutHistory],
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

        let nextBounds: ElementCreationBounds | undefined;

        if (bounds) {
          const snapCoord = (value: number): number =>
            currentScene.settings.snapToGrid
              ? snapValue(value, currentScene.settings.gridSize)
              : value;

          if (type === "line") {
            const startX = snapCoord(bounds.x);
            const startY = snapCoord(bounds.y);
            const endX = snapCoord(bounds.x + bounds.width);
            const endY = snapCoord(bounds.y + bounds.height);

            nextBounds = {
              x: startX,
              y: startY,
              width: endX - startX,
              height: endY - startY,
            };
          } else {
            nextBounds = {
              x: snapCoord(bounds.x),
              y: snapCoord(bounds.y),
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
            };
          }
        }

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

  const handleTextAlignChange = useCallback(
    (ids: string[], textAlign: CanvasTextAlign) => {
      setScene((currentScene) =>
        updateTextElementsTextAlign(currentScene, ids, textAlign),
      );
    },
    [setScene],
  );

  const handleCreateDrawElement = useCallback(
    (
      points: Array<{ x: number; y: number; t?: number }>,
      style?: Partial<DrawElementStyle>,
    ) => {
      setScene((currentScene) => {
        const nextPoints = currentScene.settings.snapToGrid
          ? points.map((point) => ({
              x: snapValue(point.x, currentScene.settings.gridSize),
              y: snapValue(point.y, currentScene.settings.gridSize),
              t: point.t,
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

  const handleDrawDefaultStrokeColorChange = useCallback(
    (drawMode: "draw" | "marker" | "quill", strokeColor: string) => {
      setScene((currentScene) =>
        updateSceneSettings(currentScene, {
          drawDefaults:
            drawMode === "marker"
              ? {
                  ...currentScene.settings.drawDefaults,
                  markerStroke: strokeColor,
                }
              : drawMode === "quill"
                ? {
                    ...currentScene.settings.drawDefaults,
                    quillStroke: strokeColor,
                  }
                : {
                    ...currentScene.settings.drawDefaults,
                    drawStroke: strokeColor,
                  },
        }),
      );
    },
    [setScene],
  );

  const handleDrawDefaultStrokeWidthChange = useCallback(
    (drawMode: "draw" | "marker" | "quill", strokeWidth: number) => {
      setScene((currentScene) =>
        updateSceneSettings(currentScene, {
          drawDefaults:
            drawMode === "marker"
              ? {
                  ...currentScene.settings.drawDefaults,
                  markerStrokeWidth: strokeWidth,
                }
              : drawMode === "quill"
                ? {
                    ...currentScene.settings.drawDefaults,
                    quillStrokeWidth: strokeWidth,
                  }
                : {
                    ...currentScene.settings.drawDefaults,
                    drawStrokeWidth: strokeWidth,
                  },
        }),
      );
    },
    [setScene],
  );

  const handleLineStartCapChange = useCallback(
    (ids: string[], startCap: LineCap) => {
      setScene((currentScene) => ({
        ...currentScene,
        elements: currentScene.elements.map((element) =>
          ids.includes(element.id) && element.type === "line"
            ? { ...element, startCap }
            : element,
        ),
      }));
    },
    [setScene],
  );

  const handleLineEndCapChange = useCallback(
    (ids: string[], endCap: LineCap) => {
      setScene((currentScene) => ({
        ...currentScene,
        elements: currentScene.elements.map((element) =>
          ids.includes(element.id) && element.type === "line"
            ? { ...element, endCap }
            : element,
        ),
      }));
    },
    [setScene],
  );

  const handleLineEditStart = useCallback(() => {
    dragStateRef.current = null;
    resizeStateRef.current = null;
    groupResizeStateRef.current = null;
    rotationStateRef.current = null;
    groupRotationStateRef.current = null;
    beginInteractionHistory();
  }, [beginInteractionHistory]);

  const handleLineGeometryChange = useCallback(
    (
      id: string,
      nextGeometry: {
        x: number;
        y: number;
        width: number;
        height: number;
        controlPoint: { x: number; y: number } | null;
      },
    ) => {
      setSceneWithoutHistory((currentScene) => ({
        ...currentScene,
        elements: currentScene.elements.map((element) => {
          if (element.id !== id || element.type !== "line") {
            return element;
          }

          return {
            ...element,
            x: nextGeometry.x,
            y: nextGeometry.y,
            width: nextGeometry.width,
            height: nextGeometry.height,
            controlPoint: nextGeometry.controlPoint,
          };
        }),
      }));
    },
    [setSceneWithoutHistory],
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
    handleTextAlignChange,
    handleCreateDrawElement,
    handleDrawStrokeWidthChange,
    handleDrawStrokeColorChange,
    handleDrawDefaultStrokeColorChange,
    handleDrawDefaultStrokeWidthChange,
    handleLineStartCapChange,
    handleLineEndCapChange,
    handleLineEditStart,
    handleLineGeometryChange,
  };
};
