import type { CircleElement } from "./circle";
import type { DrawElement } from "./draw";
import type { RectangleElement } from "./rectangle";
import type { TextElement } from "./text";
import type { LineElement } from "./line";
import type { ImageElement } from "./image";

export type SceneElement =
  | RectangleElement
  | CircleElement
  | TextElement
  | DrawElement
  | LineElement
  | ImageElement;

export type { CircleElement } from "./circle";
export type { DrawElement, DrawPoint } from "./draw";
export type { RectangleElement } from "./rectangle";
export type { TextElement } from "./text";
export type { LineCap, LineElement } from "./line";
export type { ImageElement } from "./image";

export { hitTestCircle } from "./circle";
export { createElementId } from "./createId";
export { hitTestDraw } from "./draw";
export { hitTestRectangle } from "./rectangle";
export { hitTestLine } from "./line";
export { hitTestImage } from "./image";
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
