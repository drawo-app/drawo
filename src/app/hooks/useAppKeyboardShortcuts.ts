import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { SceneElement } from "../../core/elements";
import {
  type NewElementType,
  type Scene,
  removeSelectedElement,
  selectElements,
} from "../../core/scene";
import { createElementId } from "../state/ids";
import type { AppAction } from "../state/types";

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

      if (!hasShortcutModifier && !event.altKey) {
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
