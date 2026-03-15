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
