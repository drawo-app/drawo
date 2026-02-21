export interface CircleElement {
  id: string;
  type: "circle";
  rotation: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
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

export const hitTestCircle = (
  circle: CircleElement,
  pointX: number,
  pointY: number,
): boolean => {
  const centerX = circle.x + circle.width / 2;
  const centerY = circle.y + circle.height / 2;
  const pointInLocal = rotatePointAroundCenter(
    pointX,
    pointY,
    centerX,
    centerY,
    (-circle.rotation * Math.PI) / 180,
  );

  const radiusX = Math.max(1, circle.width / 2);
  const radiusY = Math.max(1, circle.height / 2);
  const normalizedX = (pointInLocal.x - centerX) / radiusX;
  const normalizedY = (pointInLocal.y - centerY) / radiusY;

  return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
};