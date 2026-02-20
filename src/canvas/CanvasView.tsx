import { useRef, useEffect, useMemo, useState } from "react";
import type { NewElementType, Scene } from "../core/scene";
import { estimateTextWidth, getTextFont } from "../core/elements";
import { findHitElement } from "../core/hitTest";
import type { TextElement } from "../core/elements";

type ResizeHandle = "nw" | "ne" | "se" | "sw";

interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CanvasViewProps {
  scene: Scene;
  onPointerDown: (
    x: number,
    y: number,
    altKey: boolean,
    shiftKey: boolean,
  ) => void;
  onPointerMove: (x: number, y: number, shiftKey: boolean) => void;
  onPointerUp: () => void;
  onWheelPan: (deltaX: number, deltaY: number) => void;
  onWheelZoom: (screenX: number, screenY: number, deltaY: number) => void;
  onCreateElement: (type: NewElementType, x: number, y: number) => void;
  onSelectElements: (ids: string[]) => void;
  onGroupResizeStart: (
    handle: ResizeHandle,
    pointerX: number,
    pointerY: number,
    bounds: ElementBounds,
    ids: string[],
  ) => void;
  onResizeStart: (
    id: string,
    handle: ResizeHandle,
    pointerX: number,
    pointerY: number,
    startBounds?: ElementBounds,
  ) => void;
  onRotateStart: (
    id: string,
    centerX: number,
    centerY: number,
    pointerX: number,
    pointerY: number,
  ) => void;
  onTextCommit: (id: string, text: string) => void;
}

interface EditingTextState {
  id: string;
  value: string;
  anchorX: number;
  anchorY: number;
  left: number;
  top: number;
  width: number;
  style: Pick<
    TextElement,
    | "fontFamily"
    | "fontSize"
    | "fontWeight"
    | "fontStyle"
    | "color"
    | "textAlign"
  >;
}

interface MarqueeSelection {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const getAlignedStartX = (
  anchorX: number,
  width: number,
  textAlign: CanvasTextAlign,
): number => {
  if (textAlign === "center") {
    return anchorX - width / 2;
  }

  if (textAlign === "right" || textAlign === "end") {
    return anchorX - width;
  }

  return anchorX;
};

const HANDLE_SIZE = 9;
const HANDLE_BORDER_RADIUS_PX = 2;
const TEXT_SELECTION_PADDING_PX = 6;
const MIN_GRID_SCREEN_SPACING = 12;
const HANDLE_RESIZE_RADIUS_PX = 10;
const HANDLE_ROTATE_RADIUS_PX = 20;

interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const parseHexColor = (value: string): RgbaColor | null => {
  const hex = value.trim().slice(1);

  if (hex.length === 3 || hex.length === 4) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;

    return { r, g, b, a };
  }

  if (hex.length === 6 || hex.length === 8) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;

    return { r, g, b, a };
  }

  return null;
};

const parseRgbColor = (value: string): RgbaColor | null => {
  const match = value
    .trim()
    .match(
      /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i,
    );

  if (!match) {
    return null;
  }

  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  const alphaRaw = match[4];
  const alpha = alphaRaw
    ? alphaRaw.endsWith("%")
      ? Number(alphaRaw.slice(0, -1)) / 100
      : Number(alphaRaw)
    : 1;

  return {
    r: Math.max(0, Math.min(255, r)),
    g: Math.max(0, Math.min(255, g)),
    b: Math.max(0, Math.min(255, b)),
    a: clamp01(alpha),
  };
};

const parseColor = (value: string): RgbaColor | null => {
  if (value.trim().startsWith("#")) {
    return parseHexColor(value);
  }

  if (value.trim().toLowerCase().startsWith("rgb")) {
    return parseRgbColor(value);
  }

  return null;
};

const rgbToHsl = ({ r, g, b }: RgbaColor) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta === 0) {
    return { hue: 0, saturation: 0, lightness };
  }

  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let hue = 0;
  if (max === rn) {
    hue = (gn - bn) / delta + (gn < bn ? 6 : 0);
  } else if (max === gn) {
    hue = (bn - rn) / delta + 2;
  } else {
    hue = (rn - gn) / delta + 4;
  }

  return { hue: hue / 6, saturation, lightness };
};

const hueToRgb = (p: number, q: number, t: number): number => {
  let nextT = t;

  if (nextT < 0) {
    nextT += 1;
  }
  if (nextT > 1) {
    nextT -= 1;
  }
  if (nextT < 1 / 6) {
    return p + (q - p) * 6 * nextT;
  }
  if (nextT < 1 / 2) {
    return q;
  }
  if (nextT < 2 / 3) {
    return p + (q - p) * (2 / 3 - nextT) * 6;
  }

  return p;
};

const hslToRgb = (hue: number, saturation: number, lightness: number) => {
  if (saturation === 0) {
    const value = Math.round(lightness * 255);
    return { r: value, g: value, b: value };
  }

  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  return {
    r: Math.round(hueToRgb(p, q, hue + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, hue) * 255),
    b: Math.round(hueToRgb(p, q, hue - 1 / 3) * 255),
  };
};

const invertLightnessPreservingHue = (value: string): string => {
  const parsed = parseColor(value);
  if (!parsed) {
    return value;
  }

  const { hue, saturation, lightness } = rgbToHsl(parsed);
  const nextLightness = clamp01(1 - lightness);
  const nextRgb = hslToRgb(hue, saturation, nextLightness);

  if (parsed.a < 1) {
    return `rgba(${nextRgb.r}, ${nextRgb.g}, ${nextRgb.b}, ${parsed.a})`;
  }

  return `rgb(${nextRgb.r}, ${nextRgb.g}, ${nextRgb.b})`;
};

const getResizeCursor = (handle: ResizeHandle): string => {
  if (handle === "nw" || handle === "se") {
    return "nwse-resize";
  }

  return "nesw-resize";
};

const getRotateCursor = (handle: ResizeHandle): string => {
  switch (handle) {
    case "nw":
      return "rotate-down-left";
    case "ne":
      return "rotate-down-right";
    case "sw":
      return "rotate-up-left";
    case "se":
      return "rotate-up-right";
    default:
      return "nesw-resize";
  }
};
const getHandleCenter = (bounds: ElementBounds, handle: ResizeHandle) => {
  if (handle === "nw") {
    return { x: bounds.x, y: bounds.y };
  }

  if (handle === "ne") {
    return { x: bounds.x + bounds.width, y: bounds.y };
  }

  if (handle === "sw") {
    return { x: bounds.x, y: bounds.y + bounds.height };
  }

  return { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
};

const rotatePointAroundCenter = (
  pointX: number,
  pointY: number,
  centerX: number,
  centerY: number,
  angleRadians: number,
) => {
  const cos = Math.cos(angleRadians);
  const sin = Math.sin(angleRadians);
  const dx = pointX - centerX;
  const dy = pointY - centerY;

  return {
    x: dx * cos - dy * sin + centerX,
    y: dx * sin + dy * cos + centerY,
  };
};

const getBoundsCenter = (bounds: ElementBounds) => ({
  x: bounds.x + bounds.width / 2,
  y: bounds.y + bounds.height / 2,
});

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const limitedRadius = Math.max(0, Math.min(radius, width / 2, height / 2));

  ctx.beginPath();
  ctx.moveTo(x + limitedRadius, y);
  ctx.lineTo(x + width - limitedRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + limitedRadius);
  ctx.lineTo(x + width, y + height - limitedRadius);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - limitedRadius,
    y + height,
  );
  ctx.lineTo(x + limitedRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - limitedRadius);
  ctx.lineTo(x, y + limitedRadius);
  ctx.quadraticCurveTo(x, y, x + limitedRadius, y);
  ctx.closePath();
};

type CornerAction = {
  handle: ResizeHandle;
  mode: "resize" | "rotate";
};

const findCornerAction = (
  bounds: ElementBounds,
  pointX: number,
  pointY: number,
  zoom: number,
): CornerAction | null => {
  const resizeRadius = HANDLE_RESIZE_RADIUS_PX / zoom;
  const rotateRadius = HANDLE_ROTATE_RADIUS_PX / zoom;
  const handles: ResizeHandle[] = ["nw", "ne", "se", "sw"];

  for (const handle of handles) {
    const center = getHandleCenter(bounds, handle);
    const dx = pointX - center.x;
    const dy = pointY - center.y;
    const distance = Math.hypot(dx, dy);

    if (distance <= resizeRadius) {
      return { handle, mode: "resize" };
    }

    if (distance <= rotateRadius) {
      return { handle, mode: "rotate" };
    }
  }

  return null;
};

const findResizeHandle = (
  bounds: ElementBounds,
  pointX: number,
  pointY: number,
  zoom: number,
): ResizeHandle | null => {
  const resizeRadius = HANDLE_RESIZE_RADIUS_PX / zoom;
  const handles: ResizeHandle[] = ["nw", "ne", "se", "sw"];

  for (const handle of handles) {
    const center = getHandleCenter(bounds, handle);
    const distance = Math.hypot(pointX - center.x, pointY - center.y);

    if (distance <= resizeRadius) {
      return handle;
    }
  }

  return null;
};

export const CanvasView = ({
  scene,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheelPan,
  onWheelZoom,
  onCreateElement,
  onSelectElements,
  onGroupResizeStart,
  onResizeStart,
  onRotateStart,
  onTextCommit,
}: CanvasViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [editingText, setEditingText] = useState<EditingTextState | null>(null);
  const [canvasSize, setCanvasSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const [canvasCursor, setCanvasCursor] = useState("default");
  const [activeResizeHandle, setActiveResizeHandle] =
    useState<ResizeHandle | null>(null);
  const [activeRotatingHandle, setActiveRotatingHandle] =
    useState<ResizeHandle | null>(null);
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [isDuplicateDragging, setIsDuplicateDragging] = useState(false);
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [marqueeSelection, setMarqueeSelection] =
    useState<MarqueeSelection | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const selectedIds =
    scene.selectedIds.length > 0
      ? scene.selectedIds
      : scene.selectedId
        ? [scene.selectedId]
        : [];
  const canTransformSelection = selectedIds.length === 1;
  const selectedElementId = canTransformSelection ? selectedIds[0] : null;
  const camera = scene.camera;
  const isDarkMode = scene.settings.theme === "dark";
  const toThemeColor = (color: string): string =>
    isDarkMode ? invertLightnessPreservingHue(color) : color;

  const screenToWorld = (screenX: number, screenY: number) => {
    return {
      x: screenX / camera.zoom + camera.x,
      y: screenY / camera.zoom + camera.y,
    };
  };

  const worldToScreen = (worldX: number, worldY: number) => {
    return {
      x: (worldX - camera.x) * camera.zoom,
      y: (worldY - camera.y) * camera.zoom,
    };
  };

  const selectedText = useMemo(() => {
    if (!editingText) {
      return null;
    }

    const element = scene.elements.find((item) => item.id === editingText.id);
    if (!element || element.type !== "text") {
      return null;
    }

    return element;
  }, [scene.elements, editingText]);

  const getElementBounds = (
    elementId: string,
    ctx?: CanvasRenderingContext2D,
    includeTextPadding: boolean = true,
  ): ElementBounds | null => {
    const element = scene.elements.find((item) => item.id === elementId);
    if (!element) {
      return null;
    }

    if (element.type === "rectangle") {
      return {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
      };
    }

    const measuredWidth = ctx
      ? ctx.measureText(element.text || " ").width
      : estimateTextWidth(element);
    const width = Math.max(16, measuredWidth);
    const startX = getAlignedStartX(element.x, width, element.textAlign);

    const baseBounds = {
      x: startX,
      y: element.y - element.fontSize,
      width,
      height: element.fontSize,
    };

    if (!includeTextPadding) {
      return baseBounds;
    }

    const padding = TEXT_SELECTION_PADDING_PX / camera.zoom;

    return {
      x: baseBounds.x - padding,
      y: baseBounds.y - padding,
      width: baseBounds.width + padding * 2,
      height: baseBounds.height + padding * 2,
    };
  };

  const drawResizeHandles = (
    ctx: CanvasRenderingContext2D,
    bounds: ElementBounds,
    zoom: number,
  ) => {
    const handleSize = HANDLE_SIZE / zoom;
    const handleHalf = handleSize / 2;
    const handleRadius = HANDLE_BORDER_RADIUS_PX / zoom;
    const handles: ResizeHandle[] = ["nw", "ne", "se", "sw"];
    ctx.fillStyle = toThemeColor("#ffffff");
    ctx.strokeStyle = isDarkMode ? "#b19eff" : "#7C5CFF";
    ctx.lineWidth = 1 / zoom;

    for (const handle of handles) {
      const center = getHandleCenter(bounds, handle);
      const handleX = center.x - handleHalf;
      const handleY = center.y - handleHalf;

      drawRoundedRect(
        ctx,
        handleX,
        handleY,
        handleSize,
        handleSize,
        handleRadius,
      );
      ctx.fill();
      ctx.stroke();
    }
  };

  const getSelectionBounds = (
    ids: string[],
    ctx?: CanvasRenderingContext2D,
    includeTextPadding: boolean = true,
  ): ElementBounds | null => {
    if (ids.length === 0) {
      return null;
    }

    const elementBounds = ids
      .map((id) => getElementBounds(id, ctx, includeTextPadding))
      .filter((value): value is ElementBounds => value !== null);

    if (elementBounds.length === 0) {
      return null;
    }

    const minX = Math.min(...elementBounds.map((bounds) => bounds.x));
    const minY = Math.min(...elementBounds.map((bounds) => bounds.y));
    const maxX = Math.max(
      ...elementBounds.map((bounds) => bounds.x + bounds.width),
    );
    const maxY = Math.max(
      ...elementBounds.map((bounds) => bounds.y + bounds.height),
    );

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  };

  const getHoverCornerAction = (
    pointX: number,
    pointY: number,
  ): CornerAction | null => {
    if (editingText) {
      return null;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    if (selectedIds.length > 1) {
      const selectionBounds = getSelectionBounds(selectedIds, ctx, true);
      if (!selectionBounds) {
        return null;
      }

      const handle = findResizeHandle(
        selectionBounds,
        pointX,
        pointY,
        camera.zoom,
      );

      return handle ? { handle, mode: "resize" } : null;
    }

    if (!selectedElementId) {
      return null;
    }

    const selectedElement = scene.elements.find(
      (element) => element.id === selectedElementId,
    );

    if (selectedElement?.type === "text") {
      ctx.font = getTextFont(selectedElement);
    }

    const bounds = getElementBounds(selectedElementId, ctx);
    if (!bounds) {
      return null;
    }

    const rotation = ((selectedElement?.rotation ?? 0) * Math.PI) / 180;
    const center = getBoundsCenter(bounds);
    const localPoint = rotatePointAroundCenter(
      pointX,
      pointY,
      center.x,
      center.y,
      -rotation,
    );

    return findCornerAction(bounds, localPoint.x, localPoint.y, camera.zoom);
  };

  const resolveIdleCursor = (
    pointX: number,
    pointY: number,
    altKey: boolean,
  ): string => {
    const cornerAction = getHoverCornerAction(pointX, pointY);
    if (cornerAction) {
      return cornerAction.mode === "resize"
        ? getResizeCursor(cornerAction.handle)
        : getRotateCursor(cornerAction.handle);
    }

    const hitId = findHitElement(scene.elements, pointX, pointY);
    if (hitId) {
      return altKey ? "clone" : "grab";
    }

    return "default";
  };

  const getMarqueeBounds = (selection: MarqueeSelection): ElementBounds => {
    const x = Math.min(selection.startX, selection.currentX);
    const y = Math.min(selection.startY, selection.currentY);
    const width = Math.abs(selection.currentX - selection.startX);
    const height = Math.abs(selection.currentY - selection.startY);

    return { x, y, width, height };
  };

  const intersectsBounds = (a: ElementBounds, b: ElementBounds): boolean => {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  };

  const getElementsInsideMarquee = (selection: MarqueeSelection): string[] => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const marqueeBounds = getMarqueeBounds(selection);

    return scene.elements
      .filter((element) => {
        if (element.type === "text" && ctx) {
          ctx.font = getTextFont(element);
        }

        const elementBounds = getElementBounds(element.id, ctx, true);
        if (!elementBounds) {
          return false;
        }

        return intersectsBounds(marqueeBounds, elementBounds);
      })
      .map((element) => element.id);
  };

  const beginTextEditing = (element: TextElement) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.font = getTextFont(element);
    const measuredWidth = Math.max(
      16,
      Math.ceil(ctx.measureText(element.text || " ").width),
    );

    const startX = getAlignedStartX(
      element.x,
      measuredWidth,
      element.textAlign,
    );

    const screenPosition = worldToScreen(startX, element.y - element.fontSize);

    setEditingText({
      id: element.id,
      value: element.text,
      anchorX: element.x,
      anchorY: element.y - element.fontSize,
      left: screenPosition.x,
      top: screenPosition.y,
      width: measuredWidth * camera.zoom,
      style: {
        fontFamily: element.fontFamily,
        fontSize: element.fontSize,
        fontWeight: element.fontWeight,
        fontStyle: element.fontStyle,
        color: element.color,
        textAlign: element.textAlign,
      },
    });
  };

  const commitEditingText = (nextValue?: string) => {
    if (!editingText) {
      return;
    }

    const inputValue = inputRef.current?.value;
    onTextCommit(editingText.id, nextValue ?? inputValue ?? editingText.value);
    setEditingText(null);
  };

  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const handleNativeWheel = (event: WheelEvent) => {
      const rect = canvas.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;

      event.preventDefault();

      if (event.ctrlKey || event.metaKey) {
        onWheelZoom(screenX, screenY, event.deltaY);
        return;
      }

      const horizontalDelta =
        event.shiftKey && Math.abs(event.deltaX) < Math.abs(event.deltaY)
          ? event.deltaY
          : event.deltaX;
      const verticalDelta =
        event.shiftKey && Math.abs(event.deltaX) < Math.abs(event.deltaY)
          ? 0
          : event.deltaY;

      onWheelPan(horizontalDelta, verticalDelta);
    };

    canvas.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => {
      canvas.removeEventListener("wheel", handleNativeWheel);
    };
  }, [onWheelPan, onWheelZoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = toThemeColor("#F4F5F4");
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.setTransform(
      camera.zoom,
      0,
      0,
      camera.zoom,
      -camera.x * camera.zoom,
      -camera.y * camera.zoom,
    );

    if (scene.settings.showGrid) {
      const gridSize = Math.max(4, scene.settings.gridSize);
      const dotSize = 2 / camera.zoom;
      const dotOffset = dotSize / 2;
      const visualStepMultiplier = Math.max(
        1,
        Math.ceil(MIN_GRID_SCREEN_SPACING / (gridSize * camera.zoom)),
      );
      const renderGridStep = gridSize * visualStepMultiplier;
      const worldLeft = camera.x;
      const worldTop = camera.y;
      const worldRight = camera.x + canvas.width / camera.zoom;
      const worldBottom = camera.y + canvas.height / camera.zoom;
      const startX = Math.floor(worldLeft / renderGridStep) * renderGridStep;
      const startY = Math.floor(worldTop / renderGridStep) * renderGridStep;

      ctx.fillStyle = toThemeColor("#B3B2B370");

      for (let x = startX; x <= worldRight; x += renderGridStep) {
        for (let y = startY; y <= worldBottom; y += renderGridStep) {
          ctx.fillRect(x - dotOffset, y - dotOffset, dotSize, dotSize);
        }
      }
    }

    for (const element of scene.elements) {
      const isSelected = selectedIds.includes(element.id);
      const isMultiSelection = selectedIds.length > 1;
      const rotationRadians = (element.rotation * Math.PI) / 180;

      if (element.type === "rectangle") {
        const bounds = {
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
        };
        const center = getBoundsCenter(bounds);

        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.rotate(rotationRadians);
        ctx.translate(-center.x, -center.y);

        ctx.fillStyle = toThemeColor(element.fill);
        ctx.fillRect(element.x, element.y, element.width, element.height);

        ctx.strokeStyle = isSelected
          ? isMultiSelection
            ? "rgba(124, 92, 255, 0.45)"
            : "#7C5CFF"
          : toThemeColor(element.stroke);
        ctx.lineWidth =
          (isSelected ? 1 / camera.zoom : element.strokeWidth) / camera.zoom;
        ctx.strokeRect(element.x, element.y, element.width, element.height);
        if (isSelected && canTransformSelection) {
          drawResizeHandles(ctx, bounds, camera.zoom);
        }

        ctx.restore();
        continue;
      }

      if (editingText?.id === element.id) {
        continue;
      }

      ctx.font = getTextFont(element);
      const measuredWidth = ctx.measureText(element.text).width;
      const textWidth = Math.max(16, measuredWidth);
      const textBoundsWithoutPadding = {
        x: getAlignedStartX(element.x, textWidth, element.textAlign),
        y: element.y - element.fontSize,
        width: textWidth,
        height: element.fontSize,
      };
      const textCenter = getBoundsCenter(textBoundsWithoutPadding);

      ctx.save();
      ctx.translate(textCenter.x, textCenter.y);
      ctx.rotate(rotationRadians);
      ctx.translate(-textCenter.x, -textCenter.y);

      ctx.fillStyle = toThemeColor(element.color);
      ctx.textAlign = element.textAlign;
      ctx.textBaseline = "alphabetic";
      ctx.fillText(element.text, element.x, element.y);

      if (isSelected) {
        const textBounds = getElementBounds(element.id, ctx, true);
        if (!textBounds) {
          ctx.restore();
          continue;
        }

        ctx.strokeStyle =
          selectedIds.length > 1 ? "rgba(124, 92, 255, 0.45)" : "#7C5CFF";
        ctx.lineWidth = 1 / camera.zoom;
        ctx.strokeRect(
          textBounds.x,
          textBounds.y,
          textBounds.width,
          textBounds.height,
        );

        if (canTransformSelection) {
          drawResizeHandles(ctx, textBounds, camera.zoom);
        }
      }

      ctx.restore();
    }

    if (selectedIds.length > 1) {
      const groupBounds = getSelectionBounds(selectedIds, ctx, true);
      if (groupBounds) {
        ctx.save();
        ctx.strokeStyle = "#7C5CFF";
        ctx.lineWidth = 1 / camera.zoom;
        ctx.setLineDash([6 / camera.zoom, 4 / camera.zoom]);
        ctx.strokeRect(
          groupBounds.x,
          groupBounds.y,
          groupBounds.width,
          groupBounds.height,
        );
        ctx.setLineDash([]);
        drawResizeHandles(ctx, groupBounds, camera.zoom);
        ctx.restore();
      }
    }

    if (marqueeSelection) {
      const marqueeBounds = getMarqueeBounds(marqueeSelection);
      const marqueeRadius = 8 / camera.zoom;
      ctx.fillStyle = "rgba(124, 92, 255, 0.12)";
      ctx.strokeStyle = "#7C5CFF";
      ctx.lineWidth = 1 / camera.zoom;
      drawRoundedRect(
        ctx,
        marqueeBounds.x,
        marqueeBounds.y,
        marqueeBounds.width,
        marqueeBounds.height,
        marqueeRadius,
      );
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }, [scene, editingText, canvasSize, camera, marqueeSelection]);

  useEffect(() => {
    if (!editingText) {
      return;
    }

    const input = inputRef.current;
    if (!input) {
      return;
    }

    input.focus();
    input.select();
  }, [editingText?.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || editingText) {
        return;
      }

      const selectedElement = scene.elements.find(
        (element) => element.id === selectedElementId,
      );

      if (!selectedElement || selectedElement.type !== "text") {
        return;
      }

      event.preventDefault();
      beginTextEditing(selectedElement);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [scene.elements, selectedElementId, editingText]);

  useEffect(() => {
    if (editingText && !selectedText) {
      setEditingText(null);
    }
  }, [editingText, selectedText]);

  useEffect(() => {
    const handleAltStateChange = (event: KeyboardEvent) => {
      if (event.key !== "Alt") {
        return;
      }

      setIsAltPressed(event.type === "keydown");
    };

    const handleBlur = () => {
      setIsAltPressed(false);
    };

    window.addEventListener("keydown", handleAltStateChange);
    window.addEventListener("keyup", handleAltStateChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleAltStateChange);
      window.removeEventListener("keyup", handleAltStateChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  useEffect(() => {
    if (activeRotatingHandle || activeResizeHandle || isDraggingElement) {
      return;
    }

    const lastPointer = lastPointerRef.current;
    if (!lastPointer) {
      return;
    }

    setCanvasCursor(
      resolveIdleCursor(lastPointer.x, lastPointer.y, isAltPressed),
    );
  }, [
    activeResizeHandle,
    activeRotatingHandle,
    editingText,
    isAltPressed,
    isDraggingElement,
    scene.elements,
    selectedElementId,
    selectedIds,
  ]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const pointer = screenToWorld(screenX, screenY);
    lastPointerRef.current = pointer;

    if (selectedIds.length > 1 && !editingText) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const groupBounds = getSelectionBounds(selectedIds, ctx, true);
        if (groupBounds) {
          const groupHandle = findResizeHandle(
            groupBounds,
            pointer.x,
            pointer.y,
            camera.zoom,
          );

          if (groupHandle) {
            onGroupResizeStart(
              groupHandle,
              pointer.x,
              pointer.y,
              groupBounds,
              selectedIds,
            );
            setActiveResizeHandle(groupHandle);
            setActiveRotatingHandle(null);
            setIsDraggingElement(false);
            setIsDuplicateDragging(false);
            setMarqueeSelection(null);
            setCanvasCursor(getResizeCursor(groupHandle));
            canvas.setPointerCapture(e.pointerId);
            return;
          }
        }
      }
    }

    if (selectedElementId && !editingText) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const selectedElement = scene.elements.find(
          (element) => element.id === selectedElementId,
        );

        if (selectedElement?.type === "text") {
          ctx.font = getTextFont(selectedElement);
        }

        const bounds = getElementBounds(selectedElementId, ctx, true);
        if (bounds) {
          const selectedElement = scene.elements.find(
            (element) => element.id === selectedElementId,
          );
          const rotationRadians =
            ((selectedElement?.rotation ?? 0) * Math.PI) / 180;
          const center = getBoundsCenter(bounds);
          const localPoint = rotatePointAroundCenter(
            pointer.x,
            pointer.y,
            center.x,
            center.y,
            -rotationRadians,
          );

          const cornerAction = findCornerAction(
            bounds,
            localPoint.x,
            localPoint.y,
            camera.zoom,
          );
          if (cornerAction?.mode === "rotate") {
            onRotateStart(
              selectedElementId,
              center.x,
              center.y,
              pointer.x,
              pointer.y,
            );
            setActiveRotatingHandle(cornerAction.handle);
            setActiveResizeHandle(null);
            setIsDraggingElement(false);
            setIsDuplicateDragging(false);
            setCanvasCursor(getRotateCursor(cornerAction.handle));
            canvas.setPointerCapture(e.pointerId);
            return;
          }

          if (cornerAction?.mode === "resize") {
            const contentBounds = getElementBounds(
              selectedElementId,
              ctx,
              false,
            );

            onResizeStart(
              selectedElementId,
              cornerAction.handle,
              pointer.x,
              pointer.y,
              contentBounds ?? bounds,
            );
            setActiveResizeHandle(cornerAction.handle);
            setActiveRotatingHandle(null);
            setIsDraggingElement(false);
            setIsDuplicateDragging(false);
            setCanvasCursor(getResizeCursor(cornerAction.handle));
            canvas.setPointerCapture(e.pointerId);
            return;
          }
        }
      }
    }

    if (editingText) {
      commitEditingText();
    }

    const hitId = findHitElement(scene.elements, pointer.x, pointer.y);

    if (!hitId) {
      setActiveRotatingHandle(null);
      setActiveResizeHandle(null);
      setIsDraggingElement(false);
      setIsDuplicateDragging(false);
      setMarqueeSelection({
        startX: pointer.x,
        startY: pointer.y,
        currentX: pointer.x,
        currentY: pointer.y,
      });
      setCanvasCursor("default");
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    const dragging = Boolean(hitId);
    const duplicateDragging = dragging && e.altKey;
    setActiveRotatingHandle(null);
    setActiveResizeHandle(null);
    setMarqueeSelection(null);
    setIsDraggingElement(dragging);
    setIsDuplicateDragging(duplicateDragging);
    setCanvasCursor(
      dragging ? (duplicateDragging ? "clone" : "grabbing") : "default",
    );

    onPointerDown(pointer.x, pointer.y, e.altKey, e.shiftKey);
    canvas.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const pointer = screenToWorld(screenX, screenY);
    lastPointerRef.current = pointer;

    if (marqueeSelection) {
      setMarqueeSelection((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          currentX: pointer.x,
          currentY: pointer.y,
        };
      });
      setCanvasCursor("default");
      return;
    }

    onPointerMove(pointer.x, pointer.y, e.shiftKey);

    if (activeRotatingHandle) {
      setCanvasCursor(getRotateCursor(activeRotatingHandle));
      return;
    }

    if (activeResizeHandle) {
      setCanvasCursor(getResizeCursor(activeResizeHandle));
      return;
    }

    if (isDraggingElement) {
      setCanvasCursor(isDuplicateDragging ? "clone" : "grabbing");
      return;
    }

    setCanvasCursor(resolveIdleCursor(pointer.x, pointer.y, e.altKey));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (marqueeSelection) {
      const selectedInMarquee = getElementsInsideMarquee(marqueeSelection);
      onSelectElements(selectedInMarquee);
      setMarqueeSelection(null);
      setActiveRotatingHandle(null);
      setActiveResizeHandle(null);
      setIsDraggingElement(false);
      setIsDuplicateDragging(false);

      const rect = canvas?.getBoundingClientRect();
      if (rect) {
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const pointer = screenToWorld(screenX, screenY);
        lastPointerRef.current = pointer;
        setCanvasCursor(resolveIdleCursor(pointer.x, pointer.y, e.altKey));
      } else {
        setCanvasCursor("default");
      }

      return;
    }

    onPointerUp();

    setActiveRotatingHandle(null);
    setActiveResizeHandle(null);
    setIsDraggingElement(false);
    setIsDuplicateDragging(false);

    const rect = canvas?.getBoundingClientRect();
    if (rect) {
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const pointer = screenToWorld(screenX, screenY);
      lastPointerRef.current = pointer;
      setCanvasCursor(resolveIdleCursor(pointer.x, pointer.y, e.altKey));
    } else {
      setCanvasCursor("default");
    }
  };

  const handlePointerLeave = () => {
    lastPointerRef.current = null;

    if (marqueeSelection) {
      setCanvasCursor("default");
      return;
    }

    if (activeRotatingHandle) {
      setCanvasCursor(getRotateCursor(activeRotatingHandle));
      return;
    }

    if (activeResizeHandle) {
      setCanvasCursor(getResizeCursor(activeResizeHandle));
      return;
    }

    if (isDraggingElement) {
      setCanvasCursor(isDuplicateDragging ? "clone" : "grabbing");
      return;
    }

    setCanvasCursor("default");
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const pointer = screenToWorld(screenX, screenY);
    const hitId = findHitElement(scene.elements, pointer.x, pointer.y);

    if (!hitId) {
      return;
    }

    const element = scene.elements.find((item) => item.id === hitId);
    if (!element || element.type !== "text") {
      return;
    }

    beginTextEditing(element);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;

    setEditingText((current) => {
      if (!current) {
        return current;
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) {
        return { ...current, value: nextValue };
      }

      const tempTextElement: TextElement = {
        id: current.id,
        type: "text",
        rotation: 0,
        x: 0,
        y: 0,
        text: nextValue,
        fontFamily: current.style.fontFamily,
        fontSize: current.style.fontSize,
        fontWeight: current.style.fontWeight,
        fontStyle: current.style.fontStyle,
        color: current.style.color,
        textAlign: current.style.textAlign,
      };

      ctx.font = getTextFont(tempTextElement);
      const nextWidth = Math.max(
        16,
        Math.ceil(ctx.measureText(nextValue || " ").width),
      );

      const nextStartX = getAlignedStartX(
        current.anchorX,
        nextWidth,
        current.style.textAlign,
      );
      const nextScreen = worldToScreen(nextStartX, current.anchorY);

      return {
        ...current,
        value: nextValue,
        left: nextScreen.x,
        top: nextScreen.y,
        width: nextWidth * camera.zoom,
      };
    });
  };

  const handleInputBlur = () => {
    commitEditingText();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitEditingText((e.target as HTMLInputElement).value);
      return;
    }

    if (e.key === "Escape") {
      setEditingText(null);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLCanvasElement>) => {
    if (
      event.dataTransfer.types.includes("application/x-drawo-element") ||
      event.dataTransfer.types.includes("text/plain")
    ) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLCanvasElement>) => {
    const rawType =
      event.dataTransfer.getData("application/x-drawo-element") ||
      event.dataTransfer.getData("text/plain");

    if (rawType !== "rectangle" && rawType !== "text") {
      return;
    }

    event.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    const worldPoint = screenToWorld(screenX, screenY);

    onCreateElement(rawType, worldPoint.x, worldPoint.y);
  };

  return (
    <div
      style={{
        position: "relative",
        width: canvasSize.width,
        height: canvasSize.height,
      }}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onDoubleClick={handleDoubleClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          display: "block",
          cursor:
            'url("/cursors/' +
            canvasCursor +
            '.svg")' +
            (["default", "pointer"].includes(canvasCursor) ? "" : " 12 12") +
            ', url("/cursors/default.svg"), auto',
          touchAction: "none",
        }}
      />

      {editingText && (
        <input
          ref={inputRef}
          value={editingText.value}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          style={{
            position: "absolute",
            left: editingText.left,
            top: editingText.top,
            width: editingText.width,
            margin: 0,
            padding: 0,
            border: "none",
            outline: "none",
            cursor: 'url("/cursors/text.svg") 12 12, auto',
            background: "transparent",
            boxShadow: "none",
            color: toThemeColor(editingText.style.color),
            fontFamily: editingText.style.fontFamily,
            fontSize: editingText.style.fontSize * camera.zoom,
            fontWeight: editingText.style.fontWeight,
            fontStyle: editingText.style.fontStyle,
            textAlign: editingText.style.textAlign,
            lineHeight: `${editingText.style.fontSize * camera.zoom}px`,
          }}
        />
      )}
    </div>
  );
};
