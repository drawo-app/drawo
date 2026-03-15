import type { Scene } from "@core/scene";
import {
  estimateTextHeight,
  estimateTextWidth,
  getTextStartX,
  type SceneElement,
} from "@core/elements";
import type { DragItemState, Bounds } from "../interaction/types";

export interface SmartGuide {
  axis: "x" | "y";
  value: number;
  start: number;
  end: number;
  movingKind: GuidePointKind;
  targetKind: GuidePointKind;
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

export type GuidePointKind = "start" | "center" | "end";

type AxisTarget = {
  bounds: Bounds;
  centerOnly?: boolean;
};

type AxisPoint = {
  value: number;
  kind: GuidePointKind;
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

const getSnapBounds = (element: SceneElement): Bounds => {
  if (element.type === "rectangle" || element.type === "circle") {
    const inset = Math.max(0, element.strokeWidth / 2);
    const width = Math.max(1, element.width - inset * 2);
    const height = Math.max(1, element.height - inset * 2);

    return {
      x: element.x + inset,
      y: element.y + inset,
      width,
      height,
    };
  }

  if (element.type === "image" || element.type === "draw") {
    return {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    };
  }

  if (element.type === "line") {
    const points = [
      { x: element.x, y: element.y },
      { x: element.x + element.width, y: element.y + element.height },
      ...(element.controlPoint ? [element.controlPoint] : []),
    ];
    const minX = Math.min(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxX = Math.max(...points.map((point) => point.x));
    const maxY = Math.max(...points.map((point) => point.y));

    return {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };
  }

  return {
    x: getTextStartX(element),
    y: element.y - element.fontSize,
    width: Math.max(16, estimateTextWidth(element)),
    height: Math.max(element.fontSize, estimateTextHeight(element)),
  };
};

const getTranslatedBounds = (
  element: SceneElement,
  targetX: number,
  targetY: number,
): Bounds => {
  const bounds = getSnapBounds(element);

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
          kind: "center",
        },
      ];
    }

    return [
      { value: bounds.x, kind: "start" },
      { value: bounds.x + bounds.width / 2, kind: "center" },
      { value: bounds.x + bounds.width, kind: "end" },
    ];
  }

  if (centerOnly) {
    return [
      {
        value: bounds.y + bounds.height / 2,
        kind: "center",
      },
    ];
  }

  return [
    { value: bounds.y, kind: "start" },
    { value: bounds.y + bounds.height / 2, kind: "center" },
    { value: bounds.y + bounds.height, kind: "end" },
  ];
};

const getGuidePointCoordinates = (
  axis: "x" | "y",
  bounds: Bounds,
  kind: GuidePointKind,
) => {
  if (axis === "x") {
    return {
      x:
        kind === "start"
          ? bounds.x
          : kind === "center"
            ? bounds.x + bounds.width / 2
            : bounds.x + bounds.width,
      y: bounds.y + bounds.height / 2,
    };
  }

  return {
    x: bounds.x + bounds.width / 2,
    y:
      kind === "start"
        ? bounds.y
        : kind === "center"
          ? bounds.y + bounds.height / 2
          : bounds.y + bounds.height,
  };
};

const buildGuide = (
  axis: "x" | "y",
  movingBounds: Bounds,
  target: AxisTarget,
  value: number,
  movingKind: GuidePointKind,
  targetKind: GuidePointKind,
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
      movingKind,
      targetKind,
      movingPoint: getGuidePointCoordinates(axis, movingBounds, movingKind),
      targetPoint: getGuidePointCoordinates(axis, target.bounds, targetKind),
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
    movingKind,
    targetKind,
    movingPoint: getGuidePointCoordinates(axis, movingBounds, movingKind),
    targetPoint: getGuidePointCoordinates(axis, target.bounds, targetKind),
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
            guide: buildGuide(
              axis,
              movingBounds,
              target,
              targetPoint.value,
              movingPoint.kind,
              targetPoint.kind,
            ),
          };
        }
      }
    }
  }

  return bestMatch;
};

export const getSmartGuidesForBounds = (
  scene: Scene,
  movingBounds: Bounds | null,
  excludedIds: string[],
): SmartGuidesResult => {
  if (!movingBounds) {
    return {
      offsetX: 0,
      offsetY: 0,
      guides: [],
    };
  }

  const selectedIdSet = new Set(excludedIds);
  const targets: AxisTarget[] = scene.elements
    .filter((element) => !selectedIdSet.has(element.id))
    .map((element) => ({
      bounds: getSnapBounds(element),
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

  return getSmartGuidesForBounds(
    scene,
    getCombinedBounds(movingBoundsList),
    dragItems.map((item) => item.id),
  );
};
