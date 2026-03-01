import type { Scene } from "./types";

export const updateElementPosition = (
  scene: Scene,
  id: string,
  x: number,
  y: number,
): Scene => ({
  ...scene,
  elements: scene.elements.map((element) => {
    if (element.id !== id) {
      return element;
    }

    return {
      ...element,
      x,
      y,
    };
  }),
});

export const updateRectangleElementBounds = (
  scene: Scene,
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
): Scene => ({
  ...scene,
  elements: scene.elements.map((element) => {
    if (element.id !== id) {
      return element;
    }

    if (element.type !== "rectangle" && element.type !== "circle") {
      if (element.type !== "draw") {
        return element;
      }

      const startWidth = Math.max(1, element.width);
      const startHeight = Math.max(1, element.height);
      const widthRatio = width / startWidth;
      const heightRatio = height / startHeight;

      return {
        ...element,
        x,
        y,
        width,
        height,
        points: element.points.map((point) => ({
          x: point.x * widthRatio,
          y: point.y * heightRatio,
        })),
      };
    }

    return {
      ...element,
      x,
      y,
      width,
      height,
    };
  }),
});

export const updateElementRotation = (
  scene: Scene,
  id: string,
  rotation: number,
): Scene => ({
  ...scene,
  elements: scene.elements.map((element) => {
    if (element.id !== id) {
      return element;
    }

    return {
      ...element,
      rotation,
    };
  }),
});

export const updateGroupElementsRotation = (
  scene: Scene,
  ids: string[],
  angleDeltaDegrees: number,
  centerX: number,
  centerY: number,
  startPositions: Map<
    string,
    {
      centerX: number;
      centerY: number;
      offsetX: number;
      offsetY: number;
      rotation: number;
    }
  >,
): Scene => {
  if (ids.length === 0) {
    return scene;
  }

  const targetIds = new Set(ids);
  const angleRad = (angleDeltaDegrees * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  return {
    ...scene,
    elements: scene.elements.map((element) => {
      if (!targetIds.has(element.id)) {
        return element;
      }

      const startPos = startPositions.get(element.id);
      if (!startPos) {
        return element;
      }

      const dx = startPos.centerX - centerX;
      const dy = startPos.centerY - centerY;
      const rotatedCenterX = centerX + dx * cos - dy * sin;
      const rotatedCenterY = centerY + dx * sin + dy * cos;

      return {
        ...element,
        x: rotatedCenterX + startPos.offsetX,
        y: rotatedCenterY + startPos.offsetY,
        rotation: startPos.rotation + angleDeltaDegrees,
      };
    }),
  };
};
