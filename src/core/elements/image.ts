import { rotatePointAroundCenter } from "./mathUtils";

export interface ImageElement {
  id: string;
  groupId?: string | null;
  assetId?: string | null;
  type: "image";
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  x: number;
  y: number;
  opacity: number;
  frame: boolean;
  width: number;
  height: number;
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  isAnimated?: boolean;
}

export const hitTestImage = (
  image: ImageElement,
  pointX: number,
  pointY: number,
): boolean => {
  const centerX = image.x + image.width / 2;
  const centerY = image.y + image.height / 2;
  const pointInLocal = rotatePointAroundCenter(
    pointX,
    pointY,
    centerX,
    centerY,
    (-image.rotation * Math.PI) / 180,
  );

  return (
    pointInLocal.x >= image.x &&
    pointInLocal.x <= image.x + image.width &&
    pointInLocal.y >= image.y &&
    pointInLocal.y <= image.y + image.height
  );
};
