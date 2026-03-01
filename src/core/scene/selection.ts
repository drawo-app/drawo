import type { Scene } from "./types";

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
  const targetIds =
    scene.selectedIds.length > 0
      ? new Set(scene.selectedIds)
      : scene.selectedId
        ? new Set([scene.selectedId])
        : null;

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
