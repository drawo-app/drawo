import { rotatePointAroundCenter } from "./mathUtils";

export interface SvgElement {
  id: string;
  groupId?: string | null;
  type: "svg";
  rotation: number;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  assetId: string;
  viewBox: string;
  svg: string;
  fillStyle: "solid" | "hachure" | "none";
  fill?: string | null;
  stroke?: string | null;
  strokeWidth: number;
  strokeStyle: "solid" | "dashed" | "none";
}

export const hitTestSvg = (
  svgElement: SvgElement,
  pointX: number,
  pointY: number,
): boolean => {
  const centerX = svgElement.x + svgElement.width / 2;
  const centerY = svgElement.y + svgElement.height / 2;
  const pointInLocal = rotatePointAroundCenter(
    pointX,
    pointY,
    centerX,
    centerY,
    (-svgElement.rotation * Math.PI) / 180,
  );

  return (
    pointInLocal.x >= svgElement.x &&
    pointInLocal.x <= svgElement.x + svgElement.width &&
    pointInLocal.y >= svgElement.y &&
    pointInLocal.y <= svgElement.y + svgElement.height
  );
};
