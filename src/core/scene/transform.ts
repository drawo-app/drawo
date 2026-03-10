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

    if (element.type === "rectangle" || element.type === "circle") {
      return {
        ...element,
        x,
        y,
        width,
        height,
      };
    }

    if (element.type === "line") {
      const startUsesMaxX = element.width < 0;
      const startUsesMaxY = element.height < 0;
      const nextStartX = startUsesMaxX ? x + width : x;
      const nextStartY = startUsesMaxY ? y + height : y;
      const nextEndX = startUsesMaxX ? x : x + width;
      const nextEndY = startUsesMaxY ? y : y + height;

      const startWidth = element.width === 0 ? 1 : element.width;
      const startHeight = element.height === 0 ? 1 : element.height;
      const nextWidth = nextEndX - nextStartX;
      const nextHeight = nextEndY - nextStartY;
      const scaledControlPoint = element.controlPoint
        ? {
            x:
              nextStartX +
              ((element.controlPoint.x - element.x) / startWidth) * nextWidth,
            y:
              nextStartY +
              ((element.controlPoint.y - element.y) / startHeight) *
                nextHeight,
          }
        : null;

      return {
        ...element,
        x: nextStartX,
        y: nextStartY,
        width: nextEndX - nextStartX,
        height: nextEndY - nextStartY,
        controlPoint: scaledControlPoint,
      };
    }

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
