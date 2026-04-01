import type { CircleElement } from "./circle";
import type { DrawElement } from "./draw";
import type { RectangleElement } from "./rectangle";
import type { TextElement } from "./text";
import type { LineElement } from "./line";
import type { ImageElement } from "./image";
import type { SvgElement } from "./svg";

export type SceneElement =
  | RectangleElement
  | CircleElement
  | TextElement
  | DrawElement
  | LineElement
  | ImageElement
  | SvgElement;

export type { CircleElement } from "./circle";
export type { DrawElement, DrawPoint } from "./draw";
export type { RectangleElement } from "./rectangle";
export type { TextElement } from "./text";
export {
  getLineCapPadding,
  getLinePathBounds,
  hasLinePathPoints,
  type LineCap,
  type LineElement,
} from "./line";
export { getDrawPadding } from "./draw";
export type { ImageElement } from "./image";
export type { SvgElement } from "./svg";

export { hitTestCircle } from "./circle";
export { createElementId } from "./createId";
export { hitTestDraw } from "./draw";
export { hitTestRectangle } from "./rectangle";
export { hitTestLine } from "./line";
export { hitTestImage } from "./image";
export { hitTestSvg } from "./svg";
export {
  hitTestText,
  getTextFont,
  getTextRunFont,
  getTextLineHeight,
  estimateTextWidth,
  estimateTextHeight,
  parseRichText,
  measureTextLineWidth,
  getTextStartX,
} from "./text";
