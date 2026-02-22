import type { CircleElement } from "./circle";
import type { DrawElement } from "./draw";
import type { RectangleElement } from "./rectangle";
import type { TextElement } from "./text";

export type SceneElement =
  | RectangleElement
  | CircleElement
  | TextElement
  | DrawElement;

export type { CircleElement } from "./circle";
export type { DrawElement, DrawPoint } from "./draw";
export type { RectangleElement } from "./rectangle";
export type { TextElement } from "./text";

export { hitTestCircle } from "./circle";
export { hitTestDraw } from "./draw";
export { hitTestRectangle } from "./rectangle";
export {
  hitTestText,
  getTextFont,
  estimateTextWidth,
  getTextStartX,
} from "./text";
