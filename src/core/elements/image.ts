export interface ImageElement {
  id: string;
  groupId?: string | null;
  type: "image";
  rotation: number;
  x: number;
  y: number;
  opacity: number;
  frame: boolean;
  width: number;
  height: number;
  src: string;
  naturalWidth: number;
  naturalHeight: number;
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
