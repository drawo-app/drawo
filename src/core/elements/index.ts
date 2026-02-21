import type { CircleElement } from "./circle";
import type { RectangleElement } from "./rectangle";
import type { TextElement } from "./text";

export type SceneElement = RectangleElement | CircleElement | TextElement;

export type { CircleElement } from "./circle";
export type { RectangleElement } from "./rectangle";
export type { TextElement } from "./text";

export { hitTestCircle } from "./circle";
export { hitTestRectangle } from "./rectangle";
export {
  hitTestText,
  getTextFont,
  estimateTextWidth,
  getTextStartX,
} from "./text";
