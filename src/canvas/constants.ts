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
  "#f8f8f8",
  "multi",
] as const;

export interface DrawStrokePreview {
  width: number;
  height: number;
  viewBox: string;
  path: string;
  fill?: string;
  strokeWidth?: number;
}

export const LINE_STROKELINECAPS: any[] = [
  "none",
  "line arrow",
  "triangle arrow",
  "inverted triangle",
  "circular arrow",
  "diamond arrow",
];

export const LINE_STROKELINECAPS_PREVIEWS: any[] = [
  {
    width: 104,
    height: 42,
    viewBox: "0 0 104 42",
    path: "M4.2959 21H98.4053",
    stroke: "currentColor",
    strokeWidth: 3,
    strokeLinecap: "round",
  },
  {
    width: 104,
    height: 42,
    viewBox: "0 0 104 42",
    path: "M4.94531 21L99.0547 21M99.0547 21L77.3142 5.43896M99.0547 21L77.3142 36.5611",
    stroke: "currentColor",
    strokeWidth: 3,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  {
    width: 104,
    height: 42,
    viewBox: "0 0 104 42",
    path: "M4.49805 20.9999L72.3752 21M75.4157 35.6733L96.6982 22.7079C97.9775 21.9286 97.9775 20.0713 96.6982 19.2919L75.4157 6.32664C74.0829 5.51472 72.3752 6.47404 72.3752 8.03465V33.9652C72.3752 35.5259 74.0829 36.4852 75.4157 35.6733Z",
    stroke: "currentColor",
    strokeWidth: 3,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  {
    width: 104,
    height: 42,
    viewBox: "0 0 104 42",
    path: "M4.46875 20.9999L72.3459 21M72.3459 21L96.4925 35.6783C97.8254 36.4885 99.5314 35.529 99.5314 33.9693V20.9999V8.03066C99.5314 6.4709 97.8253 5.51145 96.4925 6.32164L72.3459 21Z",
    stroke: "currentColor",
    strokeWidth: 3,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  {
    width: 104,
    height: 42,
    viewBox: "0 0 104 42",
    path: "M4.46875 21H71.0452M71.0452 21C71.0452 29.2351 77.7211 35.911 85.9562 35.911C94.1913 35.911 100.867 29.2351 100.867 21C100.867 12.7649 94.1913 6.08899 85.9562 6.08899C77.7211 6.08899 71.0452 12.7649 71.0452 21Z",
    stroke: "currentColor",
    strokeWidth: 3,
    strokeLinecap: "round",
  },
  {
    width: 104,
    height: 42,
    viewBox: "0 0 104 42",
    path: "M4.46875 21H68.9493M70.1209 23.8284L81.9189 35.6264C83.481 37.1885 86.0136 37.1885 87.5757 35.6264L99.3737 23.8284C100.936 22.2663 100.936 19.7337 99.3737 18.1716L87.5757 6.3736C86.0136 4.8115 83.481 4.8115 81.9189 6.3736L70.1209 18.1716C68.5588 19.7337 68.5588 22.2663 70.1209 23.8284Z",
    stroke: "currentColor",
    strokeWidth: 3,
    strokeLinecap: "round",
  },
];

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
    path: "M77.2295 17.8856C151.665 7.22826 227.276 7.75642 301.556 19.4521C353.083 27.5653 405.324 30.2196 457.408 27.371L537.374 22.9977C539.028 22.9072 540.442 24.175 540.533 25.8294L540.915 32.8188C541.006 34.4732 539.738 35.8877 538.084 35.9782L458.118 40.3515C405.121 43.25 351.965 40.5493 299.534 32.2938C226.534 20.7997 152.226 20.281 79.0723 30.7548L18.9659 39.3599C17.3257 39.5947 15.8058 38.4554 15.571 36.8152L14.5793 29.8865C14.3446 28.2464 15.4838 26.7265 17.1239 26.4917L77.2295 17.8856Z",
    fill: "currentColor",
  },

  {
    width: 556,
    height: 64,
    viewBox: "0 0 556 64",
    path: "M79.9707 15.2955C153.647 1.93246 228.529 2.59396 302.045 17.2577C352.241 27.2699 403.155 30.5458 453.913 27.0291L542.238 20.9107C545.041 20.7165 547.453 22.8686 547.579 25.6751L548.466 45.4967C548.588 48.2079 546.524 50.5209 543.817 50.7084L455.247 56.8438C402.774 60.4793 350.138 57.0937 298.246 46.7431C227.133 32.5588 154.7 31.9179 83.4326 44.844L14.859 57.2823C12.0204 57.7972 9.33625 55.8097 9.00056 52.9444L6.70458 33.3475C6.39743 30.7259 8.18106 28.3171 10.7782 27.846L79.9707 15.2955Z",
    fill: "currentColor",
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
