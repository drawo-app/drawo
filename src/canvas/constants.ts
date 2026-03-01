export const HANDLE_SIZE = 9;
export const HANDLE_BORDER_RADIUS_PX = 2;
export const TEXT_SELECTION_PADDING_PX = 6;
export const SHAPE_TEXT_HORIZONTAL_PADDING_PX = 8;
export const MIN_GRID_SCREEN_SPACING = 12;
export const HANDLE_RESIZE_RADIUS_PX = 10;
export const HANDLE_ROTATE_RADIUS_PX = 20;
export const RADIUS_HANDLE_SIZE_PX = 12;
export const RADIUS_HANDLE_OFFSET_PX = 14;

export const DRAW_STROKE_OPTIONS = [1, 2, 4, 7, 12] as const;
export const MARKER_STROKE_OPTIONS = [10, 18] as const;
export const LASER_LIFETIME_MS = 600;
export const LASER_BASE_WIDTH_PX = 11;
export const LASER_MIN_WIDTH_PX = 0.3;

export const STROKE_COLORS = [
  "#2f3b52",
  "#DA3614",
  "#BD5C01",
  "#BA8501",
  "#2F973B",
  "#006EC3",
  "#3B01AE",
  "#FEFEFF",
  "multi",
] as const;

export interface DrawStrokePreview {
  width: number;
  height: number;
  viewBox: string;
  path: string;
  strokeWidth: number;
}

export const DRAW_STROKE_PREVIEWS: DrawStrokePreview[] = [
  {
    width: 556,
    height: 39,
    viewBox: "0 0 556 39",
    path: "M8.56738 26.2557L73.1859 16.7619C148.798 5.65298 225.666 6.20304 301.112 18.3929C354.366 26.9973 408.395 29.8127 462.255 26.7899L547.231 22.0209",
    strokeWidth: 3,
  },
  {
    width: 556,
    height: 47,
    viewBox: "0 0 556 47",
    path: "M11.6562 30.2854L75.5612 21.2533C150.321 10.687 226.23 11.2105 300.836 22.8068C353.497 30.992 406.868 33.6697 460.083 30.7966L544.142 26.2583",
    strokeWidth: 8,
  },
  {
    width: 556,
    height: 52,
    viewBox: "0 0 556 52",
    path: "M15.0752 33.351L78.1507 24.3201C151.946 13.7545 226.905 14.2778 300.545 25.8728C352.524 34.0571 405.222 36.7347 457.763 33.8612L540.724 29.3238",
    strokeWidth: 13,
  },
  {
    width: 556,
    height: 60,
    viewBox: "0 0 556 60",
    path: "M16.415 37.3698L79.1655 28.3394C152.582 17.7741 227.17 18.2974 300.431 29.8918C352.143 38.0758 404.577 40.7533 456.853 37.8796L539.384 33.3426",
    strokeWidth: 19,
  },
  {
    width: 556,
    height: 64,
    viewBox: "0 0 556 64",
    path: "M19.7637 40.0679L81.7016 31.0388C154.173 20.4742 227.831 20.9973 300.145 32.5904C351.189 40.7734 402.964 43.4509 454.58 40.5766L536.035 36.0408",
    strokeWidth: 24,
  },
];

export const MARKER_STROKE_PREVIEWS: DrawStrokePreview[] = [
  {
    width: 556,
    height: 52,
    viewBox: "0 0 556 52",
    path: "M16 34L86 24C162 13 238 14 314 26C368 34 422 36 476 33L540 30",
    strokeWidth: 12,
  },
  {
    width: 556,
    height: 68,
    viewBox: "0 0 556 68",
    path: "M18 44L88 33C165 20 242 21 319 33C373 41 427 43 482 40L544 36",
    strokeWidth: 22,
  },
];

export const getClosestDrawStrokeOption = (value: number): number => {
  const safeValue = Number.isFinite(value) ? Math.max(1, value) : 2;

  return DRAW_STROKE_OPTIONS.reduce((closest, option) => {
    return Math.abs(option - safeValue) < Math.abs(closest - safeValue)
      ? option
      : closest;
  }, DRAW_STROKE_OPTIONS[0]);
};

export const getClosestMarkerStrokeOption = (value: number): number => {
  const safeValue = Number.isFinite(value) ? Math.max(1, value) : 10;

  return MARKER_STROKE_OPTIONS.reduce((closest, option) => {
    return Math.abs(option - safeValue) < Math.abs(closest - safeValue)
      ? option
      : closest;
  }, MARKER_STROKE_OPTIONS[0]);
};
