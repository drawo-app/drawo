import {
  estimateTextHeight,
  estimateTextWidth,
  type DrawElement,
  type ImageElement,
  getTextStartX,
  type LineCap,
  type LineElement,
  type SceneElement,
} from "../elements";
import type { Scene } from "./types";

export type FlipAxis = "horizontal" | "vertical";

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const getSelectedIds = (scene: Scene): string[] => {
  return scene.selectedIds.length > 0
    ? scene.selectedIds
    : scene.selectedId
      ? [scene.selectedId]
      : [];
};

const getDrawPadding = (
  strokeWidth: number,
  drawMode: "draw" | "marker" | "quill",
): number => {
  if (drawMode === "marker") {
    return Math.max(6, strokeWidth * 0.65);
  }

  if (drawMode === "quill") {
    return Math.max(4, strokeWidth * 1.45);
  }

  return Math.max(3, strokeWidth / 2);
};

const getLineCapPadding = (cap: LineCap, strokeWidth: number): number => {
  if (
    cap === "line arrow" ||
    cap === "triangle arrow" ||
    cap === "inverted triangle" ||
    cap === "diamond arrow"
  ) {
    return Math.max(8, strokeWidth * 1.5);
  }

  if (cap === "circular arrow") {
    return Math.max(4, strokeWidth * 0.75);
  }

  return 0;
};

const getElementBounds = (element: SceneElement): Bounds => {
  if (
    element.type === "rectangle" ||
    element.type === "circle" ||
    element.type === "image"
  ) {
    return {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    };
  }

  if (element.type === "draw") {
    const padding = getDrawPadding(
      element.strokeWidth,
      element.drawMode ?? "draw",
    );

    return {
      x: element.x - padding,
      y: element.y - padding,
      width: element.width + padding * 2,
      height: element.height + padding * 2,
    };
  }

  if (element.type === "line") {
    const startX = element.x;
    const startY = element.y;
    const endX = element.x + element.width;
    const endY = element.y + element.height;
    const minX = Math.min(startX, endX);
    const minY = Math.min(startY, endY);
    const maxX = Math.max(startX, endX);
    const maxY = Math.max(startY, endY);
    const strokePadding = Math.max(2, element.strokeWidth / 2);
    const capPadding = Math.max(
      getLineCapPadding(element.startCap, element.strokeWidth),
      getLineCapPadding(element.endCap, element.strokeWidth),
    );
    const padding = strokePadding + capPadding;

    return {
      x: minX - padding,
      y: minY - padding,
      width: Math.max(1, maxX - minX) + padding * 2,
      height: Math.max(1, maxY - minY) + padding * 2,
    };
  }

  return {
    x: getTextStartX(element),
    y: element.y - element.fontSize,
    width: Math.max(16, estimateTextWidth(element)),
    height: estimateTextHeight(element),
  };
};

const translateElement = (
  element: SceneElement,
  dx: number,
  dy: number,
): SceneElement => {
  if (element.type === "line") {
    return {
      ...element,
      x: element.x + dx,
      y: element.y + dy,
      controlPoint: element.controlPoint
        ? {
            x: element.controlPoint.x + dx,
            y: element.controlPoint.y + dy,
          }
        : null,
    };
  }

  return {
    ...element,
    x: element.x + dx,
    y: element.y + dy,
  };
};

const isFlippableElement = (
  element: SceneElement,
): element is Exclude<SceneElement, { type: "text" }> => {
  return element.type !== "text";
};

const flipDrawElementLocally = (
  element: DrawElement,
  axis: FlipAxis,
): DrawElement => ({
  ...element,
  points: element.points.map((point) => ({
    ...point,
    x: axis === "horizontal" ? element.width - point.x : point.x,
    y: axis === "vertical" ? element.height - point.y : point.y,
  })),
});

const flipLineElementLocally = (
  element: LineElement,
  axis: FlipAxis,
): LineElement => {
  if (axis === "horizontal") {
    return {
      ...element,
      x: element.x + element.width,
      width: -element.width,
      controlPoint: element.controlPoint
        ? {
            x: element.x * 2 + element.width - element.controlPoint.x,
            y: element.controlPoint.y,
          }
        : null,
    };
  }

  return {
    ...element,
    y: element.y + element.height,
    height: -element.height,
    controlPoint: element.controlPoint
      ? {
          x: element.controlPoint.x,
          y: element.y * 2 + element.height - element.controlPoint.y,
        }
      : null,
  };
};

const flipElementLocally = (
  element: Exclude<SceneElement, { type: "text" }>,
  axis: FlipAxis,
): Exclude<SceneElement, { type: "text" }> => {
  if (element.type === "draw") {
    return {
      ...flipDrawElementLocally(element, axis),
      rotation: -element.rotation,
    };
  }

  if (element.type === "line") {
    return {
      ...flipLineElementLocally(element, axis),
      rotation: -element.rotation,
    };
  }

  if (element.type === "image") {
    const imageElement: ImageElement = {
      ...element,
      rotation: -element.rotation,
      flipX: axis === "horizontal" ? !element.flipX : element.flipX,
      flipY: axis === "vertical" ? !element.flipY : element.flipY,
    };

    return imageElement;
  }

  return {
    ...element,
    rotation: -element.rotation,
  };
};

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

    if (
      element.type === "rectangle" ||
      element.type === "circle" ||
      element.type === "image"
    ) {
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
              ((element.controlPoint.y - element.y) / startHeight) * nextHeight,
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

export const translateSelectedElements = (
  scene: Scene,
  dx: number,
  dy: number,
): Scene => {
  if (dx === 0 && dy === 0) {
    return scene;
  }

  const selectedIds = getSelectedIds(scene);

  if (selectedIds.length === 0) {
    return scene;
  }

  const selectedIdSet = new Set(selectedIds);

  return {
    ...scene,
    elements: scene.elements.map((element) =>
      selectedIdSet.has(element.id)
        ? translateElement(element, dx, dy)
        : element,
    ),
  };
};

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

export const alignSelectedElements = (
  scene: Scene,
  alignment: "left" | "center" | "right" | "top" | "middle" | "bottom",
): Scene => {
  const selectedIds = getSelectedIds(scene);

  if (selectedIds.length < 2) {
    return scene;
  }

  const selectedIdSet = new Set(selectedIds);
  const selectedBounds = scene.elements
    .filter((element) => selectedIdSet.has(element.id))
    .map((element) => ({
      id: element.id,
      bounds: getElementBounds(element),
    }));

  if (selectedBounds.length < 2) {
    return scene;
  }

  const selectionLeft = Math.min(
    ...selectedBounds.map((entry) => entry.bounds.x),
  );
  const selectionTop = Math.min(
    ...selectedBounds.map((entry) => entry.bounds.y),
  );
  const selectionRight = Math.max(
    ...selectedBounds.map((entry) => entry.bounds.x + entry.bounds.width),
  );
  const selectionBottom = Math.max(
    ...selectedBounds.map((entry) => entry.bounds.y + entry.bounds.height),
  );
  const selectionCenterX = (selectionLeft + selectionRight) / 2;
  const selectionCenterY = (selectionTop + selectionBottom) / 2;
  const boundsById = new Map(
    selectedBounds.map((entry) => [entry.id, entry.bounds]),
  );

  return {
    ...scene,
    elements: scene.elements.map((element) => {
      if (!selectedIdSet.has(element.id)) {
        return element;
      }

      const bounds = boundsById.get(element.id);
      if (!bounds) {
        return element;
      }

      let dx = 0;
      let dy = 0;

      if (alignment === "left") {
        dx = selectionLeft - bounds.x;
      } else if (alignment === "center") {
        dx = selectionCenterX - (bounds.x + bounds.width / 2);
      } else if (alignment === "right") {
        dx = selectionRight - (bounds.x + bounds.width);
      } else if (alignment === "top") {
        dy = selectionTop - bounds.y;
      } else if (alignment === "middle") {
        dy = selectionCenterY - (bounds.y + bounds.height / 2);
      } else {
        dy = selectionBottom - (bounds.y + bounds.height);
      }

      return translateElement(element, dx, dy);
    }),
  };
};

export const flipSelectedElements = (scene: Scene, axis: FlipAxis): Scene => {
  const selectedIds = getSelectedIds(scene);

  if (selectedIds.length === 0) {
    return scene;
  }

  const selectedIdSet = new Set(selectedIds);
  const flippableElements = scene.elements.filter(
    (element): element is Exclude<SceneElement, { type: "text" }> =>
      selectedIdSet.has(element.id) && isFlippableElement(element),
  );

  if (flippableElements.length === 0) {
    return scene;
  }

  const boundsById = new Map(
    flippableElements.map((element) => [element.id, getElementBounds(element)]),
  );
  const selectionLeft = Math.min(
    ...flippableElements.map((element) => boundsById.get(element.id)?.x ?? 0),
  );
  const selectionTop = Math.min(
    ...flippableElements.map((element) => boundsById.get(element.id)?.y ?? 0),
  );
  const selectionRight = Math.max(
    ...flippableElements.map((element) => {
      const bounds = boundsById.get(element.id);
      return (bounds?.x ?? 0) + (bounds?.width ?? 0);
    }),
  );
  const selectionBottom = Math.max(
    ...flippableElements.map((element) => {
      const bounds = boundsById.get(element.id);
      return (bounds?.y ?? 0) + (bounds?.height ?? 0);
    }),
  );

  return {
    ...scene,
    elements: scene.elements.map((element) => {
      if (!selectedIdSet.has(element.id) || !isFlippableElement(element)) {
        return element;
      }

      const bounds = boundsById.get(element.id);
      if (!bounds) {
        return element;
      }

      const nextBoundsX =
        axis === "horizontal"
          ? selectionLeft + selectionRight - (bounds.x + bounds.width)
          : bounds.x;
      const nextBoundsY =
        axis === "vertical"
          ? selectionTop + selectionBottom - (bounds.y + bounds.height)
          : bounds.y;
      const dx = nextBoundsX - bounds.x;
      const dy = nextBoundsY - bounds.y;

      return translateElement(flipElementLocally(element, axis), dx, dy);
    }),
  };
};
