const SVG_NS = "http://www.w3.org/2000/svg";

const parseViewBox = (value: string): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  const parts = normalized.split(" ");

  if (parts.length !== 4) {
    return null;
  }

  const numericParts = parts.map((part) => Number.parseFloat(part));
  if (numericParts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  if (numericParts[2] <= 0 || numericParts[3] <= 0) {
    return null;
  }

  return numericParts.join(" ");
};

const normalizeColor = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const removeNonGraphicRootAttrs = (svgRoot: SVGElement) => {
  svgRoot.removeAttribute("x");
  svgRoot.removeAttribute("y");
  svgRoot.removeAttribute("xmlns:xlink");
};

const applyColorOverride = (
  svgRoot: SVGElement,
  fillOverride?: string | null,
  strokeOverride?: string | null,
  strokeWidthOverride?: number | null,
  strokeStyleOverride?: "solid" | "dashed" | "none" | null,
) => {
  const normalizedFill = normalizeColor(fillOverride);
  const normalizedStroke = normalizeColor(strokeOverride);
  const normalizedStrokeWidth =
    typeof strokeWidthOverride === "number" && Number.isFinite(strokeWidthOverride)
      ? Math.max(0, strokeWidthOverride)
      : null;
  if (!normalizedFill && !normalizedStroke && normalizedStrokeWidth === null) {
    return;
  }

  const applyToElement = (element: Element) => {
    if (normalizedFill && element.getAttribute("fill") !== "none") {
      element.setAttribute("fill", normalizedFill);
    }
    if (
      normalizedStroke &&
      strokeStyleOverride !== "none" &&
      element.getAttribute("stroke") !== "none"
    ) {
      element.setAttribute("stroke", normalizedStroke);
    }
    if (strokeStyleOverride === "none") {
      element.setAttribute("stroke", "none");
    } else if (
      normalizedStrokeWidth !== null &&
      element.getAttribute("stroke") !== "none"
    ) {
      element.setAttribute("stroke-width", String(normalizedStrokeWidth));
      if (strokeStyleOverride === "dashed") {
        element.setAttribute(
          "stroke-dasharray",
          `${Math.max(2, normalizedStrokeWidth * 4)} ${Math.max(
            2,
            normalizedStrokeWidth * 2,
          )}`,
        );
      } else {
        element.removeAttribute("stroke-dasharray");
      }
    }
  };

  applyToElement(svgRoot);
  svgRoot.querySelectorAll("*").forEach((node) => applyToElement(node));
};

export const normalizeSvgMarkup = (
  svgSource: string,
  fallbackViewBox: string,
): { svg: string; viewBox: string } => {
  if (typeof window === "undefined") {
    return {
      svg: svgSource.trim(),
      viewBox: parseViewBox(fallbackViewBox) ?? "0 0 24 24",
    };
  }

  const parser = new window.DOMParser();
  const document = parser.parseFromString(svgSource, "image/svg+xml");
  const parseError = document.querySelector("parsererror");
  if (parseError) {
    return {
      svg: svgSource.trim(),
      viewBox: parseViewBox(fallbackViewBox) ?? "0 0 24 24",
    };
  }

  const root = document.documentElement;
  const isSvgRoot = root.tagName.toLowerCase() === "svg";
  const svgRoot = isSvgRoot
    ? root
    : (() => {
        const wrapper = document.createElementNS(SVG_NS, "svg");
        wrapper.append(...Array.from(document.childNodes));
        return wrapper;
      })();

  const normalizedViewBox =
    parseViewBox(svgRoot.getAttribute("viewBox") ?? "") ??
    parseViewBox(fallbackViewBox) ??
    "0 0 24 24";

  svgRoot.setAttribute("xmlns", SVG_NS);
  svgRoot.setAttribute("viewBox", normalizedViewBox);
  svgRoot.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svgRoot.removeAttribute("width");
  svgRoot.removeAttribute("height");
  removeNonGraphicRootAttrs(svgRoot);

  return {
    svg: svgRoot.outerHTML.replace(/\s{2,}/g, " ").trim(),
    viewBox: normalizedViewBox,
  };
};

export const toSvgDataUri = (
  svgMarkup: string,
  options?: {
    fill?: string | null;
    stroke?: string | null;
    strokeWidth?: number | null;
    strokeStyle?: "solid" | "dashed" | "none" | null;
  },
): string => {
  if (typeof window === "undefined") {
    return "";
  }

  const parser = new window.DOMParser();
  const document = parser.parseFromString(svgMarkup, "image/svg+xml");
  const root = document.documentElement;
  if (root.tagName.toLowerCase() !== "svg") {
    return "";
  }

  applyColorOverride(
    root,
    options?.fill,
    options?.stroke,
    options?.strokeWidth,
    options?.strokeStyle,
  );
  const serialized = root.outerHTML;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
};
