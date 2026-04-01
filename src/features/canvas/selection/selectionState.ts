import type {
  DrawElement,
  ImageElement,
  LineElement,
  SceneElement,
} from "@core/elements";
import type { Scene } from "@core/scene";
import type { EditableElement } from "@features/canvas/types";

export const getSelectedIds = (scene: Scene): string[] => {
  return scene.selectedIds.length > 0
    ? scene.selectedIds
    : scene.selectedId
      ? [scene.selectedId]
      : [];
};

export const getSelectedTextElements = (
  elements: SceneElement[],
  selectedIds: string[],
): EditableElement[] => {
  return elements.filter(
    (element): element is EditableElement =>
      selectedIds.includes(element.id) &&
      (element.type === "text" ||
        element.type === "rectangle" ||
        element.type === "circle"),
  );
};

export const getSelectedShapeElements = (
  elements: SceneElement[],
  selectedIds: string[],
): Extract<SceneElement, { type: "rectangle" | "circle" | "svg" }>[] => {
  return elements.filter(
    (element): element is Extract<
      SceneElement,
      { type: "rectangle" | "circle" | "svg" }
    > =>
      selectedIds.includes(element.id) &&
      (element.type === "rectangle" ||
        element.type === "circle" ||
        element.type === "svg"),
  );
};

export const getSelectedImageElements = (
  elements: SceneElement[],
  selectedIds: string[],
): ImageElement[] => {
  return elements.filter(
    (element): element is ImageElement =>
      selectedIds.includes(element.id) && element.type === "image",
  );
};

export const getSelectedDrawElements = (
  elements: SceneElement[],
  selectedIds: string[],
): DrawElement[] => {
  return elements.filter(
    (element): element is DrawElement =>
      selectedIds.includes(element.id) && element.type === "draw",
  );
};

export const getSelectedLineElements = (
  elements: SceneElement[],
  selectedIds: string[],
): LineElement[] => {
  return elements.filter(
    (element): element is LineElement =>
      selectedIds.includes(element.id) && element.type === "line",
  );
};

export const getSharedValue = <Item, Value>(
  items: Item[],
  getValue: (item: Item) => Value,
): Value | undefined => {
  if (items.length === 0) {
    return undefined;
  }

  const firstValue = getValue(items[0]);
  return items.every((item) => getValue(item) === firstValue)
    ? firstValue
    : undefined;
};
