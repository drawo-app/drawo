import {
  useEffect,
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { SceneElement, ImageElement, TextElement } from "@core/elements";
import {
  duplicateSelectedElements,
  groupSelectedElements,
  type NewElementType,
  type Scene,
  removeSelectedElement,
  selectElements,
  translateSelectedElements,
  ungroupSelectedElements,
  updateSceneSettings,
} from "@core/scene";
import { createElementId } from "@app/state/ids";
import type { AppAction } from "@app/state/types";
import {
  MAX_CAMERA_ZOOM,
  MIN_CAMERA_ZOOM,
  ZOOM_SENSITIVITY,
} from "@features/canvas/interaction/constants";

const DRAWO_MIME_TYPE = "application/x-drawo";

const serializeElements = (elements: SceneElement[]): string => {
  return JSON.stringify(elements);
};

const deserializeElements = (data: string): SceneElement[] | null => {
  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

const createTextElement = (text: string): TextElement => {
  return {
    id: createElementId("text"),
    type: "text",
    x: 0,
    y: 0,
    text,
    fontSize: 24,
    fontFamily: "Inter",
    fontWeight: "400",
    fontStyle: "normal",
    color: "#000000",
    textAlign: "left",
    rotation: 0,
  };
};

const readFileAsDataUrl = (file: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read clipboard image"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read error"));
    reader.readAsDataURL(file);
  });
};

const loadImageDimensions = (
  src: string,
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      resolve({
        width: image.naturalWidth || 200,
        height: image.naturalHeight || 200,
      });
    };
    image.onerror = () => reject(new Error("Image load error"));
    image.src = src;
  });
};

const createImageElementFromBlob = async (
  blob: Blob,
): Promise<ImageElement | null> => {
  try {
    const src = await readFileAsDataUrl(blob);
    const { width, height } = await loadImageDimensions(src);
    return {
      id: createElementId("image"),
      type: "image",
      x: 0,
      y: 0,
      width,
      height,
      naturalWidth: width,
      naturalHeight: height,
      src,
      rotation: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      frame: false,
    };
  } catch {
    return null;
  }
};

const extractElementsFromClipboardData = async (
  clipboardData: DataTransfer,
): Promise<SceneElement[] | null> => {
  const drawoPayload = clipboardData.getData(DRAWO_MIME_TYPE);
  if (drawoPayload) {
    const parsed = deserializeElements(drawoPayload);
    if (parsed && parsed.length > 0) {
      return parsed;
    }
  }

  const plainText = clipboardData.getData("text/plain");
  if (plainText) {
    const parsed = deserializeElements(plainText);
    if (parsed && parsed.length > 0) {
      return parsed;
    }
  }

  const items = Array.from(clipboardData.items ?? []);
  for (const item of items) {
    if (!item.type.startsWith("image/")) {
      continue;
    }

    const file = item.getAsFile();
    if (!file) {
      continue;
    }

    const imageElement = await createImageElementFromBlob(file);
    if (imageElement) {
      return [imageElement];
    }
  }

  if (plainText) {
    return [createTextElement(plainText)];
  }

  return null;
};

const writeElementsToClipboardData = (
  clipboardData: DataTransfer,
  elements: SceneElement[],
): void => {
  const serialized = serializeElements(elements);
  clipboardData.setData(DRAWO_MIME_TYPE, serialized);
  clipboardData.setData("text/plain", serialized);
};



const ELEMENT_KEYBOARD_MOVE_AMOUNT = 1;
const ELEMENT_KEYBOARD_MOVE_AMOUNT_WITH_SHIFT = 10;

const getArrowKeyTranslation = (
  event: KeyboardEvent,
): { dx: number; dy: number } | null => {
  const moveAmount = event.shiftKey
    ? ELEMENT_KEYBOARD_MOVE_AMOUNT_WITH_SHIFT
    : ELEMENT_KEYBOARD_MOVE_AMOUNT;

  switch (event.key) {
    case "ArrowUp":
      return { dx: 0, dy: -moveAmount };
    case "ArrowDown":
      return { dx: 0, dy: moveAmount };
    case "ArrowLeft":
      return { dx: -moveAmount, dy: 0 };
    case "ArrowRight":
      return { dx: moveAmount, dy: 0 };
    default:
      return null;
  }
};

interface UseAppKeyboardShortcutsProps {
  scene: Scene;
  dispatch: Dispatch<AppAction>;
  clipboardRef: MutableRefObject<SceneElement[] | null>;
  cursorPositionRef: MutableRefObject<{ x: number; y: number } | null>;
  setInteractionMode: Dispatch<SetStateAction<"select" | "pan">>;
  setDrawingTool: Dispatch<SetStateAction<NewElementType | "laser" | null>>;
}

const getSelectedIds = (scene: Scene): string[] => {
  return scene.selectedIds.length > 0
    ? scene.selectedIds
    : scene.selectedId
      ? [scene.selectedId]
      : [];
};

export const useWorkspaceKeyboardShortcuts = ({
  scene,
  dispatch,
  clipboardRef,
  cursorPositionRef,
  setInteractionMode,
  setDrawingTool,
}: UseAppKeyboardShortcutsProps) => {
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

    const handleKeyDown = async (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const arrowKeyTranslation = getArrowKeyTranslation(event);
      if (
        arrowKeyTranslation &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        const selectedIds = getSelectedIds(scene);

        if (selectedIds.length > 0) {
          event.preventDefault();
          dispatch({
            type: "setScene",
            updater: (currentScene) =>
              translateSelectedElements(
                currentScene,
                arrowKeyTranslation.dx,
                arrowKeyTranslation.dy,
              ),
          });
          return;
        }
      }

      const key = event.key.toLowerCase();
      const hasShortcutModifier = event.ctrlKey || event.metaKey;

      if (event.altKey && !hasShortcutModifier && !event.shiftKey) {
        if (key === "z") {
          event.preventDefault();
          dispatch({
            type: "setScene",
            trackHistory: false,
            updater: (currentScene) =>
              updateSceneSettings(currentScene, {
                zenMode: !currentScene.settings.zenMode,
              }),
          });
          return;
        }

        if (key === "r") {
          event.preventDefault();
          dispatch({
            type: "setScene",
            trackHistory: false,
            updater: (currentScene) =>
              updateSceneSettings(currentScene, {
                presentationMode: !currentScene.settings.presentationMode,
              }),
          });
          return;
        }
      }

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

      if (hasShortcutModifier && !event.altKey && key === "d") {
        const selectedIds = getSelectedIds(scene);
        if (selectedIds.length === 0) {
          return;
        }

        event.preventDefault();
        dispatch({
          type: "setScene",
          updater: (currentScene) => duplicateSelectedElements(currentScene),
        });
        return;
      }

      if (hasShortcutModifier && !event.altKey && key === "g") {
        const selectedIds = getSelectedIds(scene);
        const selectedElements = scene.elements.filter((element) =>
          selectedIds.includes(element.id),
        );

        if (event.shiftKey) {
          const canUngroupSelection = selectedElements.some((element) =>
            Boolean(element.groupId),
          );
          if (!canUngroupSelection) {
            return;
          }

          event.preventDefault();
          dispatch({
            type: "setScene",
            updater: (currentScene) => ungroupSelectedElements(currentScene),
          });
          return;
        }

        if (selectedIds.length <= 1) {
          return;
        }

        event.preventDefault();
        dispatch({
          type: "setScene",
          updater: (currentScene) => groupSelectedElements(currentScene),
        });
        return;
      }

      if (hasShortcutModifier && !event.altKey) {
        const code = event.code;
        const isZoomIn =
          key === "+" ||
          key === "=" ||
          code === "Equal" ||
          code === "NumpadAdd";
        const isZoomOut =
          key === "-" ||
          key === "_" ||
          code === "Minus" ||
          code === "NumpadSubtract";
        const isZoomReset =
          key === "0" || code === "Digit0" || code === "Numpad0";

        if (isZoomIn) {
          event.preventDefault();
          dispatch({
            type: "setScene",
            trackHistory: false,
            updater: (currentScene) => {
              const currentZoom = currentScene.camera.zoom;
              const zoomFactor = Math.exp(100 * ZOOM_SENSITIVITY);
              const nextZoom = Math.min(
                currentZoom * zoomFactor,
                MAX_CAMERA_ZOOM,
              );

              if (nextZoom === currentZoom) {
                return currentScene;
              }

              const centerX = window.innerWidth / 2;
              const centerY = window.innerHeight / 2;
              const worldX = centerX / currentZoom + currentScene.camera.x;
              const worldY = centerY / currentZoom + currentScene.camera.y;

              return {
                ...currentScene,
                camera: {
                  x: worldX - centerX / nextZoom,
                  y: worldY - centerY / nextZoom,
                  zoom: nextZoom,
                },
              };
            },
          });
          return;
        }

        if (isZoomOut) {
          event.preventDefault();
          dispatch({
            type: "setScene",
            trackHistory: false,
            updater: (currentScene) => {
              const currentZoom = currentScene.camera.zoom;
              const zoomFactor = Math.exp(-100 * ZOOM_SENSITIVITY);
              const nextZoom = Math.max(
                currentZoom * zoomFactor,
                MIN_CAMERA_ZOOM,
              );

              if (nextZoom === currentZoom) {
                return currentScene;
              }

              const centerX = window.innerWidth / 2;
              const centerY = window.innerHeight / 2;
              const worldX = centerX / currentZoom + currentScene.camera.x;
              const worldY = centerY / currentZoom + currentScene.camera.y;

              return {
                ...currentScene,
                camera: {
                  x: worldX - centerX / nextZoom,
                  y: worldY - centerY / nextZoom,
                  zoom: nextZoom,
                },
              };
            },
          });
          return;
        }

        if (isZoomReset) {
          event.preventDefault();
          dispatch({
            type: "setScene",
            trackHistory: false,
            updater: (currentScene) => {
              const currentZoom = currentScene.camera.zoom;
              const nextZoom = 1;

              if (nextZoom === currentZoom) {
                return currentScene;
              }

              const centerX = window.innerWidth / 2;
              const centerY = window.innerHeight / 2;
              const worldX = centerX / currentZoom + currentScene.camera.x;
              const worldY = centerY / currentZoom + currentScene.camera.y;

              return {
                ...currentScene,
                camera: {
                  x: worldX - centerX / nextZoom,
                  y: worldY - centerY / nextZoom,
                  zoom: nextZoom,
                },
              };
            },
          });
          return;
        }
      }

      if (!hasShortcutModifier && !event.altKey) {
        if (scene.settings.presentationMode) {
          if (key === "h" && !event.shiftKey) {
            event.preventDefault();
            setInteractionMode("pan");
            setDrawingTool(null);
          }

          return;
        }

        if (key === "v" && !event.shiftKey) {
          event.preventDefault();
          setInteractionMode("select");
          setDrawingTool(null);
          return;
        }

        if (key === "h" && !event.shiftKey) {
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

    const pasteElementsAtCursor = (clipboardElements: SceneElement[]) => {
      if (clipboardElements.length === 0) {
        return;
      }

      const cursorPos = cursorPositionRef.current;
      const baseX = cursorPos ? cursorPos.x : 100;
      const baseY = cursorPos ? cursorPos.y : 100;

      dispatch({
        type: "setScene",
        updater: (currentScene) => {
          let minX = Infinity;
          let minY = Infinity;
          for (const el of clipboardElements) {
            minX = Math.min(minX, el.x);
            minY = Math.min(minY, el.y);
          }

          const pastedElements = clipboardElements.map((element) => {
            const clonedElement: SceneElement = {
              ...element,
              id: createElementId(element.type),
              x: baseX + (element.x - minX),
              y: baseY + (element.y - minY),
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
    };

    const handleCopy = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const selectedIds = getSelectedIds(scene);
      if (selectedIds.length === 0 || !event.clipboardData) {
        return;
      }

      const elementsToCopy = scene.elements
        .filter((element) => selectedIds.includes(element.id))
        .map((element) => ({ ...element }));
      clipboardRef.current = elementsToCopy;
      writeElementsToClipboardData(event.clipboardData, elementsToCopy);
      event.preventDefault();
    };

    const handleCut = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const selectedIds = getSelectedIds(scene);
      if (selectedIds.length === 0 || !event.clipboardData) {
        return;
      }

      const elementsToCut = scene.elements
        .filter((element) => selectedIds.includes(element.id))
        .map((element) => ({ ...element }));
      clipboardRef.current = elementsToCut;
      writeElementsToClipboardData(event.clipboardData, elementsToCut);
      event.preventDefault();
      dispatch({
        type: "setScene",
        updater: (currentScene) => removeSelectedElement(currentScene),
      });
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target) || !event.clipboardData) {
        return;
      }

      event.preventDefault();
      void extractElementsFromClipboardData(event.clipboardData).then(
        (clipboardElements) => {
          if (clipboardElements && clipboardElements.length > 0) {
            clipboardRef.current = clipboardElements;
            pasteElementsAtCursor(clipboardElements);
            return;
          }

          const fallbackElements = clipboardRef.current;
          if (fallbackElements && fallbackElements.length > 0) {
            pasteElementsAtCursor(fallbackElements);
          }
        },
      );
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("copy", handleCopy);
    window.addEventListener("cut", handleCut);
    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("copy", handleCopy);
      window.removeEventListener("cut", handleCut);
      window.removeEventListener("paste", handlePaste);
    };
  }, [
    clipboardRef,
    dispatch,
    scene,
    setDrawingTool,
    setInteractionMode,
    cursorPositionRef,
  ]);
};
