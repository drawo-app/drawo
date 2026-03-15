import type {
  RichTextDocument,
  RichTextLeaf,
  RichTextParagraph,
} from "@features/canvas/types";

export const EMPTY_RICH_TEXT_DOCUMENT: RichTextDocument = [
  { type: "paragraph", children: [{ text: "" }] },
];

const isRichTextLeaf = (value: unknown): value is RichTextLeaf => {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as { text?: unknown }).text === "string"
  );
};

const isRichTextParagraph = (value: unknown): value is RichTextParagraph => {
  if (
    value === null ||
    typeof value !== "object" ||
    (value as { type?: unknown }).type !== "paragraph"
  ) {
    return false;
  }

  const children = (value as { children?: unknown }).children;
  return Array.isArray(children) && children.every(isRichTextLeaf);
};

export const deserializeRichTextDocument = (
  value: string,
): RichTextDocument => {
  if (!value.trim()) {
    return EMPTY_RICH_TEXT_DOCUMENT;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed) && parsed.every(isRichTextParagraph)) {
      return parsed.length > 0 ? parsed : EMPTY_RICH_TEXT_DOCUMENT;
    }
  } catch {
    const lines = value.split("\n");

    return (lines.length > 0 ? lines : [""]).map((line) => ({
      type: "paragraph",
      children: [{ text: line }],
    }));
  }

  return EMPTY_RICH_TEXT_DOCUMENT;
};

export const serializeRichTextDocument = (
  document: RichTextDocument,
): string => {
  return JSON.stringify(document);
};
