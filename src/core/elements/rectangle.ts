import { rotatePointAroundCenter } from "./mathUtils";

export interface RectangleElement {
  id: string;
  groupId?: string | null;
  type: "rectangle";
  rotation: number;
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: number;
  fillStyle: "solid" | "hachure" | "none";
  fill: string;
  opacity: number;
  stroke: string;
  strokeWidth: number;
  strokeStyle: "solid" | "dashed" | "none";

  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: "normal" | "italic";
  color: string;
  textAlign: CanvasTextAlign;
}

export const hitTestRectangle = (
  rect: RectangleElement,
  pointX: number,
  pointY: number,
): boolean => {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const pointInLocal = rotatePointAroundCenter(
    pointX,
    pointY,
    centerX,
    centerY,
    (-rect.rotation * Math.PI) / 180,
  );

  return (
    pointInLocal.x >= rect.x &&
    pointInLocal.x <= rect.x + rect.width &&
    pointInLocal.y >= rect.y &&
    pointInLocal.y <= rect.y + rect.height
  );
};
