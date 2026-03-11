import { createElementId, type SceneElement } from "../elements";
import type { Scene } from "./types";

const createGroupId = () => `group-${createElementId("draw")}`;

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

const cloneSceneElements = (
  elements: SceneElement[],
  offsetX: number,
  offsetY: number,
): SceneElement[] => {
  const groupIdMap = new Map<string, string>();

  return elements.map((element) => {
    const nextGroupId =
      typeof element.groupId === "string"
        ? (groupIdMap.get(element.groupId) ??
          (() => {
            const groupId = createGroupId();
            groupIdMap.set(element.groupId, groupId);
            return groupId;
          })())
        : null;

    return {
      ...element,
      id: createElementId(element.type),
      groupId: nextGroupId,
      x: element.x + offsetX,
      y: element.y + offsetY,
    };
  });
};

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

  const duplicatedElements = cloneSceneElements(sourceElements, offsetX, offsetY);

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
  const pastedElements = cloneSceneElements(elements, translateX, translateY);

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

export const getGroupElementIds = (scene: Scene, elementId: string): string[] => {
  const element = scene.elements.find((item) => item.id === elementId);
  if (!element) {
    return [];
  }

  if (!element.groupId) {
    return [element.id];
  }

  return scene.elements
    .filter((item) => item.groupId === element.groupId)
    .map((item) => item.id);
};

export const groupSelectedElements = (scene: Scene): Scene => {
  const selectedIds = getSelectedIds(scene);
  if (selectedIds.length < 2) {
    return scene;
  }

  const targetIds = new Set(selectedIds);
  const nextGroupId = createGroupId();

  return {
    ...scene,
    elements: scene.elements.map((element) =>
      targetIds.has(element.id)
        ? {
            ...element,
            groupId: nextGroupId,
          }
        : element,
    ),
  };
};

export const ungroupSelectedElements = (scene: Scene): Scene => {
  const selectedIds = getSelectedIds(scene);
  if (selectedIds.length === 0) {
    return scene;
  }

  const selectedIdSet = new Set(selectedIds);
  const selectedGroupIds = new Set(
    scene.elements
      .filter((element) => selectedIdSet.has(element.id) && element.groupId)
      .map((element) => element.groupId as string),
  );

  if (selectedGroupIds.size === 0) {
    return scene;
  }

  return {
    ...scene,
    elements: scene.elements.map((element) =>
      element.groupId && selectedGroupIds.has(element.groupId)
        ? {
            ...element,
            groupId: null,
          }
        : element,
    ),
  };
};
