import {
  useEffect,
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { SceneElement, ImageElement } from "@core/elements";
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

const copyToSystemClipboard = async (
  elements: SceneElement[],
): Promise<boolean> => {
  if (!navigator.clipboard || !navigator.clipboard.write) {
    return false;
  }

  try {
    const serialized = serializeElements(elements);
    const blob = new Blob([serialized], { type: "text/plain" });

    await navigator.clipboard.write([
      new ClipboardItem({
        [DRAWO_MIME_TYPE]: blob,
        "text/plain": blob,
      }),
    ]);
    return true;
  } catch (error) {
    console.warn("Failed to copy to system clipboard:", error);
    return false;
  }
};

const readFromSystemClipboard = async (): Promise<
  SceneElement[] | ImageElement[] | null
> => {
  if (navigator.clipboard && navigator.clipboard.read) {
    try {
      const items = await navigator.clipboard.read();

      for (const item of items) {
        if (item.types.includes(DRAWO_MIME_TYPE)) {
          const blob = await item.getType(DRAWO_MIME_TYPE);
          const text = await blob.text();
          const elements = deserializeElements(text);
          if (elements && elements.length > 0) {
            return elements;
          }
        }

        if (item.types.includes("image/png")) {
          const blob = await item.getType("image/png");
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.split(",")[1]);
            };
            reader.readAsDataURL(blob);
          });

          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = `data:image/png;base64,${base64}`;
          });

          const imageElement: ImageElement = {
            id: createElementId("image"),
            type: "image",
            x: 0,
            y: 0,
            width: img.naturalWidth || 200,
            height: img.naturalHeight || 200,
            naturalWidth: img.naturalWidth || 200,
            naturalHeight: img.naturalHeight || 200,
            src: `data:image/png;base64,${base64}`,
            rotation: 0,
            flipX: false,
            flipY: false,
            opacity: 1,
            frame: false,
          };
          return [imageElement];
        }

        if (item.types.includes("text/plain")) {
          const blob = await item.getType("text/plain");
          const text = await blob.text();

          if (!deserializeElements(text)) {
            const textElement = {
              id: createElementId("text"),
              type: "text" as const,
              x: 0,
              y: 0,
              text,
              fontSize: 24,
              fontFamily: "Inter",
              fontWeight: "400",
              fontStyle: "normal" as const,
              color: "#000000",
              textAlign: "left" as const,
              width: 200,
              height: 40,
              rotation: 0,
              flipX: false,
              flipY: false,
              opacity: 1,
            };
            return [textElement];
          }
        }
      }
    } catch (error) {
      console.warn("Failed to read from system clipboard API:", error);
    }
  }

  if (navigator.clipboard && navigator.clipboard.readText) {
    try {
      const text = await navigator.clipboard.readText();
      if (text && !deserializeElements(text)) {
        const textElement = {
          id: createElementId("text"),
          type: "text" as const,
          x: 0,
          y: 0,
          text,
          fontSize: 24,
          fontFamily: "Inter",
          fontWeight: "400",
          fontStyle: "normal" as const,
          color: "#000000",
          textAlign: "left" as const,
          width: 200,
          height: 40,
          rotation: 0,
          flipX: false,
          flipY: false,
          opacity: 1,
        };
        return [textElement];
      }
    } catch (error) {
      console.warn("Failed to read text from clipboard:", error);
    }
  }

  return null;
};

const readImageFromClipboardLegacy = async (): Promise<
  ImageElement[] | null
> => {
  return new Promise((resolve) => {
    const pasteArea = document.createElement("div");
    pasteArea.style.position = "absolute";
    pasteArea.style.left = "-9999px";
    pasteArea.style.top = "-9999px";
    pasteArea.contentEditable = "true";
    document.body.appendChild(pasteArea);

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) {
        cleanup();
        resolve(null);
        return;
      }

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (!blob) {
            cleanup();
            resolve(null);
            return;
          }

          const reader = new FileReader();
          reader.onload = async () => {
            const result = reader.result as string;
            const base64 = result.split(",")[1];

            const img = new Image();
            img.onload = () => {
              const imageElement: ImageElement = {
                id: createElementId("image"),
                type: "image",
                x: 0,
                y: 0,
                width: img.naturalWidth || 200,
                height: img.naturalHeight || 200,
                naturalWidth: img.naturalWidth || 200,
                naturalHeight: img.naturalHeight || 200,
                src: result,
                rotation: 0,
                flipX: false,
                flipY: false,
                opacity: 1,
                frame: false,
              };
              cleanup();
              resolve([imageElement]);
            };
            img.onerror = () => {
              cleanup();
              resolve(null);
            };
            img.src = result;
          };
          reader.readAsDataURL(blob);
          return;
        }
      }

      cleanup();
      resolve(null);
    };

    const cleanup = () => {
      pasteArea.removeEventListener("paste", handlePaste);
      document.removeEventListener("paste", handlePaste);
    };

    pasteArea.addEventListener("paste", handlePaste);
    document.addEventListener("paste", handlePaste);

    pasteArea.focus();
    document.execCommand("paste");

    setTimeout(cleanup, 1000);
  });
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
  pasteOffsetRef: MutableRefObject<number>;
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
  pasteOffsetRef,
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

      if (hasShortcutModifier && !event.altKey && key === "c") {
        const selectedIds = getSelectedIds(scene);
        if (selectedIds.length === 0) {
          return;
        }

        event.preventDefault();
        const elementsToCopy = scene.elements
          .filter((element) => selectedIds.includes(element.id))
          .map((element) => ({ ...element }));
        clipboardRef.current = elementsToCopy;
        pasteOffsetRef.current = 0;

        copyToSystemClipboard(elementsToCopy);
        return;
      }

      if (hasShortcutModifier && !event.altKey && key === "x") {
        const selectedIds = getSelectedIds(scene);
        if (selectedIds.length === 0) {
          return;
        }

        event.preventDefault();
        const elementsToCut = scene.elements
          .filter((element) => selectedIds.includes(element.id))
          .map((element) => ({ ...element }));
        clipboardRef.current = elementsToCut;
        pasteOffsetRef.current = 0;

        copyToSystemClipboard(elementsToCut);

        dispatch({
          type: "setScene",
          updater: (currentScene) => removeSelectedElement(currentScene),
        });
        return;
      }

      if (hasShortcutModifier && !event.altKey && key === "v") {
        let clipboardElements = clipboardRef.current;

        if (!clipboardElements || clipboardElements.length === 0) {
          const systemClipboardData = await readFromSystemClipboard();
          if (systemClipboardData && systemClipboardData.length > 0) {
            clipboardElements = systemClipboardData;
            clipboardRef.current = systemClipboardData;
          }
        }

        if (!clipboardElements || clipboardElements.length === 0) {
          const legacyImageData = await readImageFromClipboardLegacy();
          if (legacyImageData && legacyImageData.length > 0) {
            clipboardElements = legacyImageData;
            clipboardRef.current = legacyImageData;
          }
        }

        if (!clipboardElements || clipboardElements.length === 0) {
          return;
        }

        event.preventDefault();

        const cursorPos = cursorPositionRef.current;
        const baseX = cursorPos ? cursorPos.x : 100;
        const baseY = cursorPos ? cursorPos.y : 100;

        dispatch({
          type: "setScene",
          updater: (currentScene) => {
            let minX = Infinity;
            let minY = Infinity;
            for (const el of clipboardElements!) {
              minX = Math.min(minX, el.x);
              minY = Math.min(minY, el.y);
            }

            const pastedElements = clipboardElements!.map((element) => {
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

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    clipboardRef,
    dispatch,
    pasteOffsetRef,
    scene,
    setDrawingTool,
    setInteractionMode,
  ]);
};
