import { createElementId, type SceneElement } from "../elements";
import type { Scene } from "./types";

const getSelectedIds = (scene: Scene): string[] => {
  return scene.selectedIds.length > 0
    ? scene.selectedIds
    : scene.selectedId
      ? [scene.selectedId]
      : [];
};

const getElementLeft = (element: SceneElement): number => {
  if (
    element.type === "rectangle" ||
    element.type === "circle" ||
    element.type === "draw" ||
    element.type === "line"
  ) {
    return Math.min(element.x, element.x + element.width);
  }

  return element.x;
};

const getElementTop = (element: SceneElement): number => {
  if (
    element.type === "rectangle" ||
    element.type === "circle" ||
    element.type === "draw" ||
    element.type === "line"
  ) {
    return Math.min(element.y, element.y + element.height);
  }

  return element.y;
};

const cloneSceneElement = (
  element: SceneElement,
  offsetX: number,
  offsetY: number,
): SceneElement => ({
  ...element,
  id: createElementId(element.type),
  x: element.x + offsetX,
  y: element.y + offsetY,
});

export const selectElement = (scene: Scene, id: string | null): Scene => ({
  ...scene,
  selectedId: id,
  selectedIds: id ? [id] : [],
});

export const selectElements = (scene: Scene, ids: string[]): Scene => {
  const uniqueIds = Array.from(new Set(ids));

  return {
    ...scene,
    selectedId: uniqueIds[0] ?? null,
    selectedIds: uniqueIds,
  };
};

export const removeSelectedElement = (scene: Scene): Scene => {
  const selectedIds = getSelectedIds(scene);
  const targetIds = selectedIds.length > 0 ? new Set(selectedIds) : null;

  if (!targetIds) {
    return scene;
  }

  return {
    ...scene,
    elements: scene.elements.filter((element) => !targetIds.has(element.id)),
    selectedId: null,
    selectedIds: [],
  };
};

export const duplicateSelectedElements = (
  scene: Scene,
  offsetX = 24,
  offsetY = 24,
): Scene => {
  const selectedIds = getSelectedIds(scene);
  if (selectedIds.length === 0) {
    return scene;
  }

  const selectedIdSet = new Set(selectedIds);
  const sourceElements = scene.elements.filter((element) =>
    selectedIdSet.has(element.id),
  );
  if (sourceElements.length === 0) {
    return scene;
  }

  const duplicatedElements = sourceElements.map((element) =>
    cloneSceneElement(element, offsetX, offsetY),
  );

  return {
    ...scene,
    elements: [...scene.elements, ...duplicatedElements],
    selectedId: duplicatedElements[0]?.id ?? null,
    selectedIds: duplicatedElements.map((element) => element.id),
  };
};

export const pasteElementsIntoScene = (
  scene: Scene,
  elements: SceneElement[],
  options?: {
    offsetX?: number;
    offsetY?: number;
    anchorX?: number;
    anchorY?: number;
  },
): Scene => {
  if (elements.length === 0) {
    return scene;
  }

  const { offsetX = 0, offsetY = 0, anchorX, anchorY } = options ?? {};
  const minX = Math.min(...elements.map(getElementLeft));
  const minY = Math.min(...elements.map(getElementTop));
  const translateX = typeof anchorX === "number" ? anchorX - minX : offsetX;
  const translateY = typeof anchorY === "number" ? anchorY - minY : offsetY;
  const pastedElements = elements.map((element) =>
    cloneSceneElement(element, translateX, translateY),
  );

  return {
    ...scene,
    elements: [...scene.elements, ...pastedElements],
    selectedId: pastedElements[0]?.id ?? null,
    selectedIds: pastedElements.map((element) => element.id),
  };
};

export const reorderSelectedElements = (
  scene: Scene,
  direction: "forward" | "backward" | "front" | "back",
): Scene => {
  const selectedIds = getSelectedIds(scene);
  if (selectedIds.length === 0) {
    return scene;
  }

  const selectedIdSet = new Set(selectedIds);
  const elements = [...scene.elements];

  if (direction === "front") {
    return {
      ...scene,
      elements: [
        ...elements.filter((element) => !selectedIdSet.has(element.id)),
        ...elements.filter((element) => selectedIdSet.has(element.id)),
      ],
    };
  }

  if (direction === "back") {
    return {
      ...scene,
      elements: [
        ...elements.filter((element) => selectedIdSet.has(element.id)),
        ...elements.filter((element) => !selectedIdSet.has(element.id)),
      ],
    };
  }

  if (direction === "forward") {
    for (let index = elements.length - 2; index >= 0; index -= 1) {
      const current = elements[index];
      const next = elements[index + 1];
      if (selectedIdSet.has(current.id) && !selectedIdSet.has(next.id)) {
        elements[index] = next;
        elements[index + 1] = current;
      }
    }
  } else {
    for (let index = 1; index < elements.length; index += 1) {
      const current = elements[index];
      const previous = elements[index - 1];
      if (selectedIdSet.has(current.id) && !selectedIdSet.has(previous.id)) {
        elements[index] = previous;
        elements[index - 1] = current;
      }
    }
  }

  return {
    ...scene,
    elements,
  };
};
