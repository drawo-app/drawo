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
  kind?: "alignment" | "spacing";
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
  segmentStart?: {
    x: number;
    y: number;
  };
  segmentEnd?: {
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
const GUIDE_DELTA_PRECISION = 1000;

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

  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const bounds of boundsList) {
    if (bounds.x < left) left = bounds.x;
    if (bounds.y < top) top = bounds.y;
    const r = bounds.x + bounds.width;
    const b = bounds.y + bounds.height;
    if (r > right) right = r;
    if (b > bottom) bottom = b;
  }

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

  if (
    element.type === "image" ||
    element.type === "draw" ||
    element.type === "svg"
  ) {
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
      kind: "alignment",
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
    kind: "alignment",
    movingKind,
    targetKind,
    movingPoint: getGuidePointCoordinates(axis, movingBounds, movingKind),
    targetPoint: getGuidePointCoordinates(axis, target.bounds, targetKind),
  };
};

const rangesOverlap = (
  startA: number,
  endA: number,
  startB: number,
  endB: number,
  padding = 0,
) => {
  return endA + padding >= startB && endB + padding >= startA;
};

const getAxisValueFromKind = (
  axis: "x" | "y",
  bounds: Bounds,
  kind: GuidePointKind,
) => {
  if (axis === "x") {
    if (kind === "start") {
      return bounds.x;
    }

    if (kind === "center") {
      return bounds.x + bounds.width / 2;
    }

    return bounds.x + bounds.width;
  }

  if (kind === "start") {
    return bounds.y;
  }

  if (kind === "center") {
    return bounds.y + bounds.height / 2;
  }

  return bounds.y + bounds.height;
};

const getMidpointOnOverlap = (
  movingBounds: Bounds,
  targetBounds: Bounds,
  axis: "x" | "y",
) => {
  if (axis === "x") {
    const overlapStart = Math.max(movingBounds.y, targetBounds.y);
    const overlapEnd = Math.min(
      movingBounds.y + movingBounds.height,
      targetBounds.y + targetBounds.height,
    );

    if (overlapEnd >= overlapStart) {
      return (overlapStart + overlapEnd) / 2;
    }

    return (
      movingBounds.y +
      movingBounds.height / 2 +
      targetBounds.y +
      targetBounds.height / 2
    ) / 2;
  }

  const overlapStart = Math.max(movingBounds.x, targetBounds.x);
  const overlapEnd = Math.min(
    movingBounds.x + movingBounds.width,
    targetBounds.x + targetBounds.width,
  );

  if (overlapEnd >= overlapStart) {
    return (overlapStart + overlapEnd) / 2;
  }

  return (
    movingBounds.x +
    movingBounds.width / 2 +
    targetBounds.x +
    targetBounds.width / 2
  ) / 2;
};

const createSpacingGuide = (
  axis: "x" | "y",
  movingBounds: Bounds,
  targetBounds: Bounds,
  delta: number,
  movingKind: GuidePointKind,
  targetKind: GuidePointKind,
): SmartGuide => {
  const nextMovingBounds =
    axis === "x"
      ? { ...movingBounds, x: movingBounds.x + delta }
      : { ...movingBounds, y: movingBounds.y + delta };
  const movingValue = getAxisValueFromKind(axis, nextMovingBounds, movingKind);
  const targetValue = getAxisValueFromKind(axis, targetBounds, targetKind);
  const segmentMid = getMidpointOnOverlap(nextMovingBounds, targetBounds, axis);

  if (axis === "x") {
    const segmentStart = {
      x: Math.min(movingValue, targetValue),
      y: segmentMid,
    };
    const segmentEnd = {
      x: Math.max(movingValue, targetValue),
      y: segmentMid,
    };

    return {
      axis,
      value: segmentMid,
      start: segmentStart.x,
      end: segmentEnd.x,
      kind: "spacing",
      movingKind,
      targetKind,
      movingPoint: { x: movingValue, y: segmentMid },
      targetPoint: { x: targetValue, y: segmentMid },
      segmentStart,
      segmentEnd,
    };
  }

  const segmentStart = {
    x: segmentMid,
    y: Math.min(movingValue, targetValue),
  };
  const segmentEnd = {
    x: segmentMid,
    y: Math.max(movingValue, targetValue),
  };

  return {
    axis,
    value: segmentMid,
    start: segmentStart.y,
    end: segmentEnd.y,
    kind: "spacing",
    movingKind,
    targetKind,
    movingPoint: { x: segmentMid, y: movingValue },
    targetPoint: { x: segmentMid, y: targetValue },
    segmentStart,
    segmentEnd,
  };
};

const findBestSpacingGuide = (
  axis: "x" | "y",
  movingBounds: Bounds,
  targets: Bounds[],
  threshold: number,
): { delta: number; guide: SmartGuide } | null => {
  if (targets.length < 2) {
    return null;
  }

  const sortedTargets = [...targets].sort((a, b) =>
    axis === "x" ? a.x - b.x : a.y - b.y,
  );
  let bestMatch: { delta: number; guide: SmartGuide } | null = null;

  for (let index = 0; index < sortedTargets.length - 1; index += 1) {
    const first = sortedTargets[index];
    const second = sortedTargets[index + 1];

    if (!first || !second) {
      continue;
    }

    const firstEnd = axis === "x" ? first.x + first.width : first.y + first.height;
    const secondStart = axis === "x" ? second.x : second.y;
    const gap = secondStart - firstEnd;

    if (gap <= 0) {
      continue;
    }

    const sameLane =
      axis === "x"
        ? rangesOverlap(
            first.y,
            first.y + first.height,
            second.y,
            second.y + second.height,
            threshold,
          )
        : rangesOverlap(
            first.x,
            first.x + first.width,
            second.x,
            second.x + second.width,
            threshold,
          );

    if (!sameLane) {
      continue;
    }

    const candidates =
      axis === "x"
        ? [
            {
              position: first.x - gap - movingBounds.width,
              targetBounds: first,
              movingKind: "end" as GuidePointKind,
              targetKind: "start" as GuidePointKind,
            },
            {
              position: second.x + second.width + gap,
              targetBounds: second,
              movingKind: "start" as GuidePointKind,
              targetKind: "end" as GuidePointKind,
            },
          ]
        : [
            {
              position: first.y - gap - movingBounds.height,
              targetBounds: first,
              movingKind: "end" as GuidePointKind,
              targetKind: "start" as GuidePointKind,
            },
            {
              position: second.y + second.height + gap,
              targetBounds: second,
              movingKind: "start" as GuidePointKind,
              targetKind: "end" as GuidePointKind,
            },
          ];

    for (const candidate of candidates) {
      const delta =
        axis === "x"
          ? candidate.position - movingBounds.x
          : candidate.position - movingBounds.y;

      if (Math.abs(delta) > threshold) {
        continue;
      }

      if (!bestMatch || Math.abs(delta) < Math.abs(bestMatch.delta)) {
        bestMatch = {
          delta,
          guide: createSpacingGuide(
            axis,
            movingBounds,
            candidate.targetBounds,
            delta,
            candidate.movingKind,
            candidate.targetKind,
          ),
        };
      }
    }
  }

  return bestMatch;
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
          const normalizedDelta =
            Math.round(delta * GUIDE_DELTA_PRECISION) / GUIDE_DELTA_PRECISION;
          const snappedMovingBounds =
            axis === "x"
              ? { ...movingBounds, x: movingBounds.x + normalizedDelta }
              : { ...movingBounds, y: movingBounds.y + normalizedDelta };

          bestMatch = {
            delta: normalizedDelta,
            guide: buildGuide(
              axis,
              snappedMovingBounds,
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

  const movingBounds = getCombinedBounds(movingBoundsList);
  if (!movingBounds) {
    return {
      offsetX: 0,
      offsetY: 0,
      guides: [],
    };
  }

  const selectedIdSet = new Set(dragItems.map((item) => item.id));
  const targetBounds = scene.elements
    .filter((element) => !selectedIdSet.has(element.id))
    .map((element) => getSnapBounds(element));
  const axisTargets: AxisTarget[] = targetBounds.map((bounds) => ({ bounds }));
  const threshold = SMART_GUIDE_SCREEN_THRESHOLD / scene.camera.zoom;

  const xBaseMatch = findBestGuide("x", movingBounds, axisTargets, threshold);
  const yBaseMatch = findBestGuide("y", movingBounds, axisTargets, threshold);
  const baseGuideX = xBaseMatch?.guide;
  const baseGuideY = yBaseMatch?.guide;
  const baseOffsetX = xBaseMatch?.delta ?? 0;
  const baseOffsetY = yBaseMatch?.delta ?? 0;

  const spacingGuideX = findBestSpacingGuide(
    "x",
    movingBounds,
    targetBounds,
    threshold,
  );
  const spacingGuideY = findBestSpacingGuide(
    "y",
    movingBounds,
    targetBounds,
    threshold,
  );

  const useSpacingGuideX = Boolean(
    spacingGuideX &&
      (!baseGuideX || Math.abs(spacingGuideX.delta) < Math.abs(baseOffsetX)),
  );
  const useSpacingGuideY = Boolean(
    spacingGuideY &&
      (!baseGuideY || Math.abs(spacingGuideY.delta) < Math.abs(baseOffsetY)),
  );

  const nextGuides: SmartGuide[] = [];

  const nextGuideX = useSpacingGuideX ? spacingGuideX?.guide : baseGuideX;
  const nextGuideY = useSpacingGuideY ? spacingGuideY?.guide : baseGuideY;

  if (nextGuideX) {
    nextGuides.push(nextGuideX);
  }

  if (nextGuideY) {
    nextGuides.push(nextGuideY);
  }

  return {
    offsetX: useSpacingGuideX ? (spacingGuideX?.delta ?? 0) : baseOffsetX,
    offsetY: useSpacingGuideY ? (spacingGuideY?.delta ?? 0) : baseOffsetY,
    guides: nextGuides,
  };
};
