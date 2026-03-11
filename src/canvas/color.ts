interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export const clamp01 = (value: number): number =>
  Math.min(1, Math.max(0, value));

const parseHexColor = (value: string): RgbaColor | null => {
  const hex = value.trim().slice(1);

  if (hex.length === 3 || hex.length === 4) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;

    return { r, g, b, a };
  }

  if (hex.length === 6 || hex.length === 8) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;

    return { r, g, b, a };
  }

  return null;
};

const parseRgbColor = (value: string): RgbaColor | null => {
  const match = value
    .trim()
    .match(
      /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i,
    );

  if (!match) {
    return null;
  }

  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  const alphaRaw = match[4];
  const alpha = alphaRaw
    ? alphaRaw.endsWith("%")
      ? Number(alphaRaw.slice(0, -1)) / 100
      : Number(alphaRaw)
    : 1;

  return {
    r: Math.max(0, Math.min(255, r)),
    g: Math.max(0, Math.min(255, g)),
    b: Math.max(0, Math.min(255, b)),
    a: clamp01(alpha),
  };
};

export const parseColor = (value: string): RgbaColor | null => {
  if (value.trim().startsWith("#")) {
    return parseHexColor(value);
  }

  if (value.trim().toLowerCase().startsWith("rgb")) {
    return parseRgbColor(value);
  }

  return null;
};

const rgbToHsl = ({ r, g, b }: RgbaColor) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta === 0) {
    return { hue: 0, saturation: 0, lightness };
  }

  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  const hue =
    max === rn
      ? (gn - bn) / delta + (gn < bn ? 6 : 0)
      : max === gn
        ? (bn - rn) / delta + 2
        : (rn - gn) / delta + 4;

  return { hue: hue / 6, saturation, lightness };
};

const hueToRgb = (p: number, q: number, t: number): number => {
  let nextT = t;

  if (nextT < 0) {
    nextT += 1;
  }
  if (nextT > 1) {
    nextT -= 1;
  }
  if (nextT < 1 / 6) {
    return p + (q - p) * 6 * nextT;
  }
  if (nextT < 1 / 2) {
    return q;
  }
  if (nextT < 2 / 3) {
    return p + (q - p) * (2 / 3 - nextT) * 6;
  }

  return p;
};

const hslToRgb = (hue: number, saturation: number, lightness: number) => {
  if (saturation === 0) {
    const value = Math.round(lightness * 255);
    return { r: value, g: value, b: value };
  }

  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  return {
    r: Math.round(hueToRgb(p, q, hue + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, hue) * 255),
    b: Math.round(hueToRgb(p, q, hue - 1 / 3) * 255),
  };
};

export const invertLightnessPreservingHue = (value: string): string => {
  const parsed = parseColor(value);
  if (!parsed) {
    return value;
  }

  const { hue, saturation, lightness } = rgbToHsl(parsed);
  const nextLightness = clamp01(1 - lightness);
  const nextRgb = hslToRgb(hue, saturation, nextLightness);

  if (parsed.a < 1) {
    return `rgba(${nextRgb.r}, ${nextRgb.g}, ${nextRgb.b}, ${parsed.a})`;
  }

  return `rgb(${nextRgb.r}, ${nextRgb.g}, ${nextRgb.b})`;
};

export const normalizeRgbTriplet = (value: string): string | null => {
  const rawChannels = value.match(/\d+(?:\.\d+)?/g);
  if (!rawChannels || rawChannels.length < 3) {
    return null;
  }

  return rawChannels
    .slice(0, 3)
    .map((channel) => {
      const numeric = Number(channel);
      return Math.max(0, Math.min(255, Math.round(numeric)));
    })
    .join(", ");
};

export const parseColorForPicker = (value: string): string => {
  const parsed = parseColor(value);
  return parsed
    ? `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${parsed.a})`
    : "#2f3b52";
};
