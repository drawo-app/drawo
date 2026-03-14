import type { Scene } from "@core/scene";
import type { SceneElement } from "@core/elements";
import { getElementBounds } from "./interaction/geometry";
import type { DragItemState, Bounds } from "./interaction/types";

export interface SmartGuide {
  axis: "x" | "y";
  value: number;
  start: number;
  end: number;
  movingPoint: {
    x: number;
    y: number;
  };
  targetPoint: {
    x: number;
    y: number;
  };
}

export interface SmartGuidesResult {
  offsetX: number;
  offsetY: number;
  guides: SmartGuide[];
}

const SMART_GUIDE_SCREEN_THRESHOLD = 8;

type AxisTarget = {
  bounds: Bounds;
  centerOnly?: boolean;
};

type AxisPoint = {
  value: number;
};

const getCombinedBounds = (boundsList: Bounds[]): Bounds | null => {
  if (boundsList.length === 0) {
    return null;
  }

  const left = Math.min(...boundsList.map((bounds) => bounds.x));
  const top = Math.min(...boundsList.map((bounds) => bounds.y));
  const right = Math.max(
    ...boundsList.map((bounds) => bounds.x + bounds.width),
  );
  const bottom = Math.max(
    ...boundsList.map((bounds) => bounds.y + bounds.height),
  );

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
};

const getTranslatedBounds = (
  element: SceneElement,
  targetX: number,
  targetY: number,
): Bounds => {
  const bounds = getElementBounds(element);

  return {
    ...bounds,
    x: bounds.x + (targetX - element.x),
    y: bounds.y + (targetY - element.y),
  };
};

const getAxisPoints = (
  axis: "x" | "y",
  bounds: Bounds,
  centerOnly = false,
): AxisPoint[] => {
  if (axis === "x") {
    if (centerOnly) {
      return [
        {
          value: bounds.x + bounds.width / 2,
        },
      ];
    }

    return [
      { value: bounds.x },
      { value: bounds.x + bounds.width / 2 },
      { value: bounds.x + bounds.width },
    ];
  }

  if (centerOnly) {
    return [
      {
        value: bounds.y + bounds.height / 2,
      },
    ];
  }

  return [
    { value: bounds.y },
    { value: bounds.y + bounds.height / 2 },
    { value: bounds.y + bounds.height },
  ];
};

const buildGuide = (
  axis: "x" | "y",
  movingBounds: Bounds,
  target: AxisTarget,
  value: number,
): SmartGuide => {
  const padding = 12;

  if (axis === "x") {
    const guideStart = target.centerOnly
      ? target.bounds.y
      : Math.min(movingBounds.y, target.bounds.y) - padding;
    const guideEnd = target.centerOnly
      ? target.bounds.y + target.bounds.height
      : Math.max(
          movingBounds.y + movingBounds.height,
          target.bounds.y + target.bounds.height,
        ) + padding;

    return {
      axis,
      value,
      start: guideStart,
      end: guideEnd,
      movingPoint: {
        x: value,
        y: movingBounds.y + movingBounds.height / 2,
      },
      targetPoint: {
        x: value,
        y: target.bounds.y + target.bounds.height / 2,
      },
    };
  }

  const guideStart = target.centerOnly
    ? target.bounds.x
    : Math.min(movingBounds.x, target.bounds.x) - padding;
  const guideEnd = target.centerOnly
    ? target.bounds.x + target.bounds.width
    : Math.max(
        movingBounds.x + movingBounds.width,
        target.bounds.x + target.bounds.width,
      ) + padding;

  return {
    axis,
    value,
    start: guideStart,
    end: guideEnd,
    movingPoint: {
      x: movingBounds.x + movingBounds.width / 2,
      y: value,
    },
    targetPoint: {
      x: target.bounds.x + target.bounds.width / 2,
      y: value,
    },
  };
};

const findBestGuide = (
  axis: "x" | "y",
  movingBounds: Bounds,
  targets: AxisTarget[],
  threshold: number,
): { delta: number; guide: SmartGuide } | null => {
  const movingPoints = getAxisPoints(axis, movingBounds);
  let bestMatch: { delta: number; guide: SmartGuide } | null = null;

  for (const target of targets) {
    const targetPoints = getAxisPoints(axis, target.bounds, target.centerOnly);

    for (const movingPoint of movingPoints) {
      for (const targetPoint of targetPoints) {
        const delta = targetPoint.value - movingPoint.value;

        if (Math.abs(delta) > threshold) {
          continue;
        }

        if (!bestMatch || Math.abs(delta) < Math.abs(bestMatch.delta)) {
          bestMatch = {
            delta,
            guide: buildGuide(axis, movingBounds, target, targetPoint.value),
          };
        }
      }
    }
  }

  return bestMatch;
};

export const getSmartGuidesForDrag = (
  scene: Scene,
  dragItems: DragItemState[],
  dx: number,
  dy: number,
): SmartGuidesResult => {
  if (dragItems.length === 0) {
    return {
      offsetX: 0,
      offsetY: 0,
      guides: [],
    };
  }

  const dragItemsById = new Map(dragItems.map((item) => [item.id, item]));
  const movingBoundsList = scene.elements.flatMap((element) => {
    const dragItem = dragItemsById.get(element.id);

    if (!dragItem) {
      return [];
    }

    return [getTranslatedBounds(element, dragItem.x + dx, dragItem.y + dy)];
  });
  const movingBounds = getCombinedBounds(movingBoundsList);

  if (!movingBounds) {
    return {
      offsetX: 0,
      offsetY: 0,
      guides: [],
    };
  }

  const selectedIdSet = new Set(dragItems.map((item) => item.id));
  const targets: AxisTarget[] = scene.elements
    .filter((element) => !selectedIdSet.has(element.id))
    .map((element) => ({
      bounds: getElementBounds(element),
    }));

  const threshold = SMART_GUIDE_SCREEN_THRESHOLD / scene.camera.zoom;
  const xGuide = findBestGuide("x", movingBounds, targets, threshold);
  const yGuide = findBestGuide("y", movingBounds, targets, threshold);

  return {
    offsetX: xGuide?.delta ?? 0,
    offsetY: yGuide?.delta ?? 0,
    guides: [xGuide?.guide, yGuide?.guide].filter(
      (guide): guide is SmartGuide => Boolean(guide),
    ),
  };
};