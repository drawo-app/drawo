import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { SceneElement } from "../../core/elements";
import {
  duplicateSelectedElements,
  groupSelectedElements,
  type NewElementType,
  type Scene,
  removeSelectedElement,
  selectElements,
  ungroupSelectedElements,
  updateSceneSettings,
} from "../../core/scene";
import { createElementId } from "../state/ids";
import type { AppAction } from "../state/types";
import {
  MAX_CAMERA_ZOOM,
  MIN_CAMERA_ZOOM,
  ZOOM_SENSITIVITY,
} from "../../canvas/interaction/constants";

interface UseAppKeyboardShortcutsProps {
  scene: Scene;
  dispatch: Dispatch<AppAction>;
  clipboardRef: MutableRefObject<SceneElement[] | null>;
  pasteOffsetRef: MutableRefObject<number>;
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

export const useAppKeyboardShortcuts = ({
  scene,
  dispatch,
  clipboardRef,
  pasteOffsetRef,
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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
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
        clipboardRef.current = scene.elements
          .filter((element) => selectedIds.includes(element.id))
          .map((element) => ({ ...element }));
        pasteOffsetRef.current = 0;
        return;
      }

      if (hasShortcutModifier && !event.altKey && key === "x") {
        const selectedIds = getSelectedIds(scene);
        if (selectedIds.length === 0) {
          return;
        }

        event.preventDefault();
        clipboardRef.current = scene.elements
          .filter((element) => selectedIds.includes(element.id))
          .map((element) => ({ ...element }));
        pasteOffsetRef.current = 0;

        dispatch({
          type: "setScene",
          updater: (currentScene) => removeSelectedElement(currentScene),
        });
        return;
      }

      if (hasShortcutModifier && !event.altKey && key === "v") {
        const clipboardElements = clipboardRef.current;
        if (!clipboardElements || clipboardElements.length === 0) {
          return;
        }

        event.preventDefault();
        pasteOffsetRef.current += 24;
        const offset = pasteOffsetRef.current;

        dispatch({
          type: "setScene",
          updater: (currentScene) => {
            const pastedElements = clipboardElements.map((element) => {
              const clonedElement: SceneElement = {
                ...element,
                id: createElementId(element.type),
                x: element.x + offset,
                y: element.y + offset,
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
          if (key === "h") {
            event.preventDefault();
            setInteractionMode("pan");
            setDrawingTool(null);
          }

          return;
        }

        if (key === "v") {
          event.preventDefault();
          setInteractionMode("select");
          setDrawingTool(null);
          return;
        }

        if (key === "h") {
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
