import { hitTestRectangle, hitTestText, type SceneElement } from "./elements";

export const hitTestElement = (
  element: SceneElement,
  pointX: number,
  pointY: number,
): boolean => {
  if (element.type === "rectangle") {
    return hitTestRectangle(element, pointX, pointY);
  }

  return hitTestText(element, pointX, pointY);
};

export const findHitElement = (
  elements: SceneElement[],
  pointX: number,
  pointY: number,
): string | null => {
  for (let i = elements.length - 1; i >= 0; i--) {
    if (hitTestElement(elements[i], pointX, pointY)) {
      return elements[i].id;
    }
  }
  return null;
};
