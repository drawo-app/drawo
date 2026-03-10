import type { SceneElement } from "./index";

export const createElementId = (type: SceneElement["type"]): string => {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
};
