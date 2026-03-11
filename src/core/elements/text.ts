export interface TextElement {
  id: string;
  groupId?: string | null;
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

export interface RichTextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
}

export interface RichTextLine {
  runs: RichTextRun[];
}

interface StoredRichTextLeaf {
  text?: unknown;
  bold?: unknown;
  italic?: unknown;
  strikethrough?: unknown;
}

interface StoredRichTextBlock {
  type?: unknown;
  children?: unknown;
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

const isStoredBlockArray = (value: unknown): value is StoredRichTextBlock[] => {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item !== null && typeof item === "object" && !Array.isArray(item),
    )
  );
};

const parsePlainTextToLines = (text: string): RichTextLine[] => {
  const lines = text.split("\n");

  return (lines.length > 0 ? lines : [""]).map((line) => ({
    runs: [{ text: line }],
  }));
};

const parseStoredBlocksToLines = (
  blocks: StoredRichTextBlock[],
): RichTextLine[] => {
  const lines: RichTextLine[] = [];

  for (const block of blocks) {
    const children = Array.isArray(block.children) ? block.children : [];
    const runs: RichTextRun[] = [];

    for (const child of children as StoredRichTextLeaf[]) {
      const text = typeof child.text === "string" ? child.text : "";
      const bold =
        child.bold === true ? true : child.bold === false ? false : undefined;
      const italic =
        child.italic === true
          ? true
          : child.italic === false
            ? false
            : undefined;
      const strikethrough =
        child.strikethrough === true
          ? true
          : child.strikethrough === false
            ? false
            : undefined;

      runs.push({ text, bold, italic, strikethrough });
    }

    lines.push({
      runs: runs.length > 0 ? runs : [{ text: "" }],
    });
  }

  return lines.length > 0 ? lines : [{ runs: [{ text: "" }] }];
};

export const parseRichText = (text: string): RichTextLine[] => {
  if (!text.trim()) {
    return [{ runs: [{ text: "" }] }];
  }

  try {
    const parsed = JSON.parse(text) as unknown;

    if (isStoredBlockArray(parsed)) {
      return parseStoredBlocksToLines(parsed);
    }
  } catch {
    return parsePlainTextToLines(text);
  }

  return parsePlainTextToLines(text);
};

export const getTextLineHeight = (fontSize: number): number => {
  return fontSize * 1.2;
};

export const estimateTextHeight = (textElement: TextElement): number => {
  const lineCount = Math.max(1, parseRichText(textElement.text).length);
  return (
    textElement.fontSize +
    (lineCount - 1) * getTextLineHeight(textElement.fontSize)
  );
};

export const getTextRunFont = (
  textElement: Pick<
    TextElement,
    "fontFamily" | "fontSize" | "fontWeight" | "fontStyle"
  >,
  run: Pick<RichTextRun, "bold" | "italic">,
): string => {
  const fontWeight =
    run.bold === true
      ? "700"
      : run.bold === false
        ? "400"
        : textElement.fontWeight;
  const fontStyle =
    run.italic === true
      ? "italic"
      : run.italic === false
        ? "normal"
        : textElement.fontStyle;
  return `${fontStyle} ${fontWeight} ${textElement.fontSize}px ${textElement.fontFamily}`;
};

export const measureTextLineWidth = (
  ctx: CanvasRenderingContext2D,
  textElement: Pick<
    TextElement,
    "fontFamily" | "fontSize" | "fontWeight" | "fontStyle"
  >,
  line: RichTextLine,
): number => {
  let width = 0;

  for (const run of line.runs) {
    if (!run.text) {
      continue;
    }

    ctx.font = getTextRunFont(textElement, run);
    width += ctx.measureText(run.text).width;
  }

  return width;
};

export const estimateTextWidth = (textElement: TextElement): number => {
  const longestLineLength = parseRichText(textElement.text)
    .map((line) => line.runs.reduce((sum, run) => sum + run.text.length, 0))
    .reduce((max, current) => Math.max(max, current), 0);

  return longestLineLength * textElement.fontSize * 0.6;
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
  const height = estimateTextHeight(textElement);
  const startX = getTextStartX(textElement);
  const topY = textElement.y - textElement.fontSize;
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
