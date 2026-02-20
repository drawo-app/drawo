export interface TextElement {
  id: string;
  type: "text";
  rotation: number;
  x: number;
  y: number;
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

export const getTextFont = (textElement: TextElement): string => {
  return `${textElement.fontStyle} ${textElement.fontWeight} ${textElement.fontSize}px ${textElement.fontFamily}`;
};

export const estimateTextWidth = (textElement: TextElement): number => {
  return textElement.text.length * textElement.fontSize * 0.6;
};

export const getTextStartX = (textElement: TextElement): number => {
  const width = estimateTextWidth(textElement);

  if (textElement.textAlign === "center") {
    return textElement.x - width / 2;
  }

  if (textElement.textAlign === "right" || textElement.textAlign === "end") {
    return textElement.x - width;
  }

  return textElement.x;
};

export const hitTestText = (
  textElement: TextElement,
  pointX: number,
  pointY: number,
): boolean => {
  const width = estimateTextWidth(textElement);
  const height = textElement.fontSize;
  const startX = getTextStartX(textElement);
  const topY = textElement.y - height;
  const centerX = startX + width / 2;
  const centerY = topY + height / 2;
  const pointInLocal = rotatePointAroundCenter(
    pointX,
    pointY,
    centerX,
    centerY,
    (-textElement.rotation * Math.PI) / 180,
  );

  return (
    pointInLocal.x >= startX &&
    pointInLocal.x <= startX + width &&
    pointInLocal.y >= topY &&
    pointInLocal.y <= topY + height
  );
};
