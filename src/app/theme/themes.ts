import type { Scene, SceneSettings } from "@core/scene";

export type ThemeMode = SceneSettings["theme"];
export type ColorScheme = SceneSettings["colorScheme"];

export interface ThemeDrawDefaults {
  drawStroke: string;
  markerStroke: string;
  quillStroke: string;
  canvas: string;
  drawStrokeWidth: number;
  markerStrokeWidth: number;
  quillStrokeWidth: number;
}

export interface ThemeShapeDefaults {
  fill: string;
  stroke: string;
  textColor: string;
  lineStroke: string;
}

export interface ThemePreset {
  drawDefaults: ThemeDrawDefaults;
  shapeDefaults: ThemeShapeDefaults;
  strokeColors: readonly string[];
  shapeColors: readonly [readonly string[], readonly string[]];
}

type ThemeModeVariant = "light" | "dark";

const makeStrokeColors = (accents: readonly string[]): readonly string[] => [
  ...accents,
  "#f8f8f8",
  "multi",
];

const makeShapeColors = (
  vividRow: readonly string[],
  lightRow: readonly string[],
): readonly [readonly string[], readonly string[]] => [
  [...vividRow],
  [...lightRow, "multi"],
];

const makePreset = (preset: ThemePreset): ThemePreset => preset;

type SchemePresets = Record<ThemeModeVariant, ThemePreset>;

export const SCHEME_PRESETS: Record<ColorScheme, SchemePresets> = {
  drawo: {
    light: makePreset({
      drawDefaults: {
        drawStroke: "#1e1e1e",
        markerStroke: "#BA8501",
        quillStroke: "#3B01AE",
        canvas: "#F5F4F4",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#f5f5f5",
        stroke: "#cccccc",
        textColor: "#2f3b52",
        lineStroke: "#2f3b52",
      },
      strokeColors: makeStrokeColors([
        "#1e1e1e",
        "#DA3614",
        "#BD5C01",
        "#BA8501",
        "#2F973B",
        "#006EC3",
        "#3B01AE",
      ]),
      shapeColors: makeShapeColors(
        [
          "#1e1e1e",
          "#757575",
          "#f24822",
          "#ff9e42",
          "#ffc943",
          "#66d575",
          "#5ad8cc",
          "#3dadff",
          "#874fff",
          "#f849c1",
          "#ffffff",
        ],
        [
          "#b3b3b3",
          "#d9d9d9",
          "#ffc7c2",
          "#ffe0c2",
          "#ffecbd",
          "#cdf4d3",
          "#c6faf6",
          "#c2e5ff",
          "#dcccff",
          "#ffc2ec",
        ],
      ),
    }),
    dark: makePreset({
      drawDefaults: {
        drawStroke: "#1e1e1e",
        markerStroke: "#BA8501",
        quillStroke: "#3B01AE",
        canvas: "#161617",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#2a2a2a",
        stroke: "#4a4a4a",
        textColor: "#1f2024",
        lineStroke: "#d7def0",
      },
      strokeColors: makeStrokeColors([
        "#1e1e1e",
        "#DA3614",
        "#BD5C01",
        "#BA8501",
        "#2F973B",
        "#006EC3",
        "#3B01AE",
      ]),
      shapeColors: makeShapeColors(
        [
          "#1e1e1e",
          "#757575",
          "#f24822",
          "#ff9e42",
          "#ffc943",
          "#66d575",
          "#5ad8cc",
          "#3dadff",
          "#874fff",
          "#f849c1",
          "#ffffff",
        ],
        [
          "#b3b3b3",
          "#d9d9d9",
          "#ffc7c2",
          "#ffe0c2",
          "#ffecbd",
          "#cdf4d3",
          "#c6faf6",
          "#c2e5ff",
          "#dcccff",
          "#ffc2ec",
        ],
      ),
    }),
  },
  catppuccin: {
    light: makePreset({
      drawDefaults: {
        drawStroke: "#11111b",
        markerStroke: "#fe640b",
        quillStroke: "#1e66f5",
        canvas: "#eff1f5",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#eff1f5",
        stroke: "#bcc0cc",
        textColor: "#4c4f69",
        lineStroke: "#4c4f69",
      },
      strokeColors: makeStrokeColors([
        "#11111b",
        "#d20f39",
        "#fe640b",
        "#40a02b",
        "#1e66f5",
        "#04a5e5",
        "#7287fd",
      ]),
      shapeColors: makeShapeColors(
        [
          "#11111b",
          "#7c7f93",
          "#d20f39",
          "#fe640b",
          "#df8e1d",
          "#40a02b",
          "#179299",
          "#1e66f5",
          "#7287fd",
          "#8839ef",
          "#ffffff",
        ],
        [
          "#b3b3b3",
          "#d9d9d9",
          "#e78284",
          "#ef9f76",
          "#ffecbd",
          "#cdf4d3",
          "#c6faf6",
          "#c2e5ff",
          "#dcccff",
          "#ffc2ec",
        ],
      ),
    }),
    dark: makePreset({
      drawDefaults: {
        drawStroke: "#cdd6f4",
        markerStroke: "#f9e2af",
        quillStroke: "#89b4fa",
        canvas: "#11111b",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#313244",
        stroke: "#585b70",
        textColor: "#cdd6f4",
        lineStroke: "#cdd6f4",
      },
      strokeColors: makeStrokeColors([
        "#cdd6f4",
        "#f38ba8",
        "#fab387",
        "#a6e3a1",
        "#89b4fa",
        "#89dceb",
        "#b4befe",
      ]),
      shapeColors: makeShapeColors(
        [
          "#cdd6f4",
          "#f5e0dc",
          "#f38ba8",
          "#fab387",
          "#f9e2af",
          "#a6e3a1",
          "#89dceb",
          "#89b4fa",
          "#b4befe",
          "#cba6f7",
          "#181825",
        ],
        [
          "#11111b",
          "#7c7f93",
          "#d20f39",
          "#fe640b",
          "#df8e1d",
          "#40a02b",
          "#179299",
          "#1e66f5",
          "#7287fd",
          "#8839ef",
        ],
      ),
    }),
  },
  nord: {
    light: makePreset({
      drawDefaults: {
        drawStroke: "#2e3440",
        markerStroke: "#ebcb8b",
        quillStroke: "#5e81ac",
        canvas: "#eceff4",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#e5e9f0",
        stroke: "#d8dee9",
        textColor: "#2e3440",
        lineStroke: "#2e3440",
      },
      strokeColors: makeStrokeColors([
        "#2e3440",
        "#bf616a",
        "#d08770",
        "#ebcb8b",
        "#a3be8c",
        "#88c0d0",
        "#5e81ac",
      ]),
      shapeColors: makeShapeColors(
        [
          "#2e3440",
          "#4c566a",
          "#bf616a",
          "#d08770",
          "#ebcb8b",
          "#a3be8c",
          "#8fbcbb",
          "#88c0d0",
          "#81a1c1",
          "#b48ead",
          "#ffffff",
        ],
        [
          "#d8dee9",
          "#e5e9f0",
          "#efc0c5",
          "#f1c8b3",
          "#f3e4bc",
          "#d4e4cc",
          "#c8e3df",
          "#c9e2e9",
          "#d2dcea",
          "#dfd3e8",
        ],
      ),
    }),
    dark: makePreset({
      drawDefaults: {
        drawStroke: "#eceff4",
        markerStroke: "#ebcb8b",
        quillStroke: "#88c0d0",
        canvas: "#2e3440",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#3b4252",
        stroke: "#4c566a",
        textColor: "#eceff4",
        lineStroke: "#eceff4",
      },
      strokeColors: makeStrokeColors([
        "#eceff4",
        "#bf616a",
        "#d08770",
        "#ebcb8b",
        "#a3be8c",
        "#88c0d0",
        "#81a1c1",
      ]),
      shapeColors: makeShapeColors(
        [
          "#eceff4",
          "#d8dee9",
          "#bf616a",
          "#d08770",
          "#ebcb8b",
          "#a3be8c",
          "#8fbcbb",
          "#88c0d0",
          "#81a1c1",
          "#b48ead",
          "#2e3440",
        ],
        [
          "#4c566a",
          "#434c5e",
          "#8f4c57",
          "#9f6a58",
          "#aa9868",
          "#7f9974",
          "#6d9493",
          "#6b93a3",
          "#6883a1",
          "#876f9b",
        ],
      ),
    }),
  },
  solarized: {
    light: makePreset({
      drawDefaults: {
        drawStroke: "#586e75",
        markerStroke: "#b58900",
        quillStroke: "#268bd2",
        canvas: "#fdf6e3",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#eee8d5",
        stroke: "#93a1a1",
        textColor: "#586e75",
        lineStroke: "#586e75",
      },
      strokeColors: makeStrokeColors([
        "#586e75",
        "#dc322f",
        "#cb4b16",
        "#b58900",
        "#859900",
        "#2aa198",
        "#268bd2",
      ]),
      shapeColors: makeShapeColors(
        [
          "#586e75",
          "#657b83",
          "#dc322f",
          "#cb4b16",
          "#b58900",
          "#859900",
          "#2aa198",
          "#268bd2",
          "#6c71c4",
          "#d33682",
          "#fdf6e3",
        ],
        [
          "#93a1a1",
          "#eee8d5",
          "#efb0ac",
          "#e8bea9",
          "#dfcf9f",
          "#c9d79d",
          "#a6d7d2",
          "#a9d0e8",
          "#b9bde5",
          "#e1b3cf",
        ],
      ),
    }),
    dark: makePreset({
      drawDefaults: {
        drawStroke: "#93a1a1",
        markerStroke: "#b58900",
        quillStroke: "#2aa198",
        canvas: "#002b36",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#073642",
        stroke: "#586e75",
        textColor: "#93a1a1",
        lineStroke: "#93a1a1",
      },
      strokeColors: makeStrokeColors([
        "#93a1a1",
        "#dc322f",
        "#cb4b16",
        "#b58900",
        "#859900",
        "#2aa198",
        "#268bd2",
      ]),
      shapeColors: makeShapeColors(
        [
          "#93a1a1",
          "#839496",
          "#dc322f",
          "#cb4b16",
          "#b58900",
          "#859900",
          "#2aa198",
          "#268bd2",
          "#6c71c4",
          "#d33682",
          "#002b36",
        ],
        [
          "#586e75",
          "#073642",
          "#7e3a3a",
          "#7b4a39",
          "#77643f",
          "#5f733f",
          "#2f6f6a",
          "#2f5f88",
          "#4d4f83",
          "#7d3f66",
        ],
      ),
    }),
  },
  gruvbox: {
    light: makePreset({
      drawDefaults: {
        drawStroke: "#3c3836",
        markerStroke: "#d79921",
        quillStroke: "#458588",
        canvas: "#fbf1c7",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#f2e5bc",
        stroke: "#d5c4a1",
        textColor: "#3c3836",
        lineStroke: "#3c3836",
      },
      strokeColors: makeStrokeColors([
        "#3c3836",
        "#cc241d",
        "#d65d0e",
        "#d79921",
        "#98971a",
        "#458588",
        "#b16286",
      ]),
      shapeColors: makeShapeColors(
        [
          "#3c3836",
          "#665c54",
          "#cc241d",
          "#d65d0e",
          "#d79921",
          "#98971a",
          "#689d6a",
          "#458588",
          "#076678",
          "#b16286",
          "#f9f5d7",
        ],
        [
          "#a89984",
          "#d5c4a1",
          "#f2b6b2",
          "#f2c39b",
          "#f0d4a2",
          "#ccd79d",
          "#bfd6b9",
          "#b7d1d1",
          "#b9c8d8",
          "#d8bfd8",
        ],
      ),
    }),
    dark: makePreset({
      drawDefaults: {
        drawStroke: "#ebdbb2",
        markerStroke: "#fabd2f",
        quillStroke: "#83a598",
        canvas: "#282828",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#3c3836",
        stroke: "#504945",
        textColor: "#ebdbb2",
        lineStroke: "#ebdbb2",
      },
      strokeColors: makeStrokeColors([
        "#ebdbb2",
        "#fb4934",
        "#fe8019",
        "#fabd2f",
        "#b8bb26",
        "#8ec07c",
        "#83a598",
      ]),
      shapeColors: makeShapeColors(
        [
          "#ebdbb2",
          "#d5c4a1",
          "#fb4934",
          "#fe8019",
          "#fabd2f",
          "#b8bb26",
          "#8ec07c",
          "#83a598",
          "#d3869b",
          "#b16286",
          "#1d2021",
        ],
        [
          "#665c54",
          "#504945",
          "#8f3a34",
          "#8f5a2f",
          "#8d7a42",
          "#6f7337",
          "#5f7b5f",
          "#4d6e77",
          "#6a5f82",
          "#7a4f77",
        ],
      ),
    }),
  },
  tokyonight: {
    light: makePreset({
      drawDefaults: {
        drawStroke: "#3760bf",
        markerStroke: "#b15c00",
        quillStroke: "#2e7de9",
        canvas: "#d5d6db",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#e1e2e7",
        stroke: "#c4c8da",
        textColor: "#3760bf",
        lineStroke: "#3760bf",
      },
      strokeColors: makeStrokeColors([
        "#3760bf",
        "#f52a65",
        "#b15c00",
        "#8c6c3e",
        "#587539",
        "#007197",
        "#2e7de9",
      ]),
      shapeColors: makeShapeColors(
        [
          "#3760bf",
          "#6172b0",
          "#f52a65",
          "#b15c00",
          "#8c6c3e",
          "#587539",
          "#007197",
          "#2e7de9",
          "#9854f1",
          "#d20065",
          "#ffffff",
        ],
        [
          "#a7aecb",
          "#c4c8da",
          "#f2b8c7",
          "#e5c0a8",
          "#dfcfb8",
          "#c8d6b8",
          "#b9d8de",
          "#bdd0ef",
          "#cfbff3",
          "#e2b6d0",
        ],
      ),
    }),
    dark: makePreset({
      drawDefaults: {
        drawStroke: "#c0caf5",
        markerStroke: "#e0af68",
        quillStroke: "#7aa2f7",
        canvas: "#1a1b26",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#24283b",
        stroke: "#414868",
        textColor: "#c0caf5",
        lineStroke: "#c0caf5",
      },
      strokeColors: makeStrokeColors([
        "#c0caf5",
        "#f7768e",
        "#ff9e64",
        "#e0af68",
        "#9ece6a",
        "#73daca",
        "#7aa2f7",
      ]),
      shapeColors: makeShapeColors(
        [
          "#c0caf5",
          "#a9b1d6",
          "#f7768e",
          "#ff9e64",
          "#e0af68",
          "#9ece6a",
          "#73daca",
          "#7aa2f7",
          "#bb9af7",
          "#c0caf5",
          "#16161e",
        ],
        [
          "#565f89",
          "#414868",
          "#8f4c63",
          "#8f6444",
          "#8f7a4a",
          "#62834a",
          "#4e8b83",
          "#4f71a7",
          "#6f5f9f",
          "#7f6f8f",
        ],
      ),
    }),
  },
  rosepine: {
    light: makePreset({
      drawDefaults: {
        drawStroke: "#575279",
        markerStroke: "#ea9d34",
        quillStroke: "#907aa9",
        canvas: "#faf4ed",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#fffaf3",
        stroke: "#dfdad9",
        textColor: "#575279",
        lineStroke: "#575279",
      },
      strokeColors: makeStrokeColors([
        "#575279",
        "#b4637a",
        "#ea9d34",
        "#d7827e",
        "#56949f",
        "#286983",
        "#907aa9",
      ]),
      shapeColors: makeShapeColors(
        [
          "#575279",
          "#797593",
          "#b4637a",
          "#ea9d34",
          "#d7827e",
          "#56949f",
          "#286983",
          "#907aa9",
          "#cecacd",
          "#d7827e",
          "#ffffff",
        ],
        [
          "#9893a5",
          "#dfdad9",
          "#e5beca",
          "#efd1b0",
          "#eac8c6",
          "#bfdbde",
          "#bfd2de",
          "#cdc4de",
          "#e5dde9",
          "#e9cfd6",
        ],
      ),
    }),
    dark: makePreset({
      drawDefaults: {
        drawStroke: "#e0def4",
        markerStroke: "#f6c177",
        quillStroke: "#9ccfd8",
        canvas: "#191724",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#26233a",
        stroke: "#403d52",
        textColor: "#e0def4",
        lineStroke: "#e0def4",
      },
      strokeColors: makeStrokeColors([
        "#e0def4",
        "#eb6f92",
        "#f6c177",
        "#ea9a97",
        "#31748f",
        "#9ccfd8",
        "#c4a7e7",
      ]),
      shapeColors: makeShapeColors(
        [
          "#e0def4",
          "#908caa",
          "#eb6f92",
          "#f6c177",
          "#ea9a97",
          "#31748f",
          "#9ccfd8",
          "#c4a7e7",
          "#6e6a86",
          "#ebbcba",
          "#111019",
        ],
        [
          "#6e6a86",
          "#403d52",
          "#8f4f66",
          "#8f6d4d",
          "#8f6a68",
          "#3b6b79",
          "#5b8c99",
          "#7f6f99",
          "#8f7fa6",
          "#9f7f8f",
        ],
      ),
    }),
  },
  everforest: {
    light: makePreset({
      drawDefaults: {
        drawStroke: "#5c6a72",
        markerStroke: "#d8a657",
        quillStroke: "#3a94c5",
        canvas: "#f3ead3",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#f2efdf",
        stroke: "#d3c6aa",
        textColor: "#5c6a72",
        lineStroke: "#5c6a72",
      },
      strokeColors: makeStrokeColors([
        "#5c6a72",
        "#f85552",
        "#f57d26",
        "#d8a657",
        "#8da101",
        "#35a77c",
        "#3a94c5",
      ]),
      shapeColors: makeShapeColors(
        [
          "#5c6a72",
          "#708089",
          "#f85552",
          "#f57d26",
          "#d8a657",
          "#8da101",
          "#35a77c",
          "#3a94c5",
          "#df69ba",
          "#9da9a0",
          "#ffffff",
        ],
        [
          "#a6b0a0",
          "#d3c6aa",
          "#edb8b2",
          "#e8c5a8",
          "#e2d3b0",
          "#cad8aa",
          "#b7dcc9",
          "#b9d8e8",
          "#d4c8e8",
          "#d8cfd2",
        ],
      ),
    }),
    dark: makePreset({
      drawDefaults: {
        drawStroke: "#d3c6aa",
        markerStroke: "#dbbc7f",
        quillStroke: "#7fbbb3",
        canvas: "#2d353b",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#343f44",
        stroke: "#475258",
        textColor: "#d3c6aa",
        lineStroke: "#d3c6aa",
      },
      strokeColors: makeStrokeColors([
        "#d3c6aa",
        "#e67e80",
        "#e69875",
        "#dbbc7f",
        "#a7c080",
        "#83c092",
        "#7fbbb3",
      ]),
      shapeColors: makeShapeColors(
        [
          "#d3c6aa",
          "#9da9a0",
          "#e67e80",
          "#e69875",
          "#dbbc7f",
          "#a7c080",
          "#83c092",
          "#7fbbb3",
          "#d699b6",
          "#9da9a0",
          "#232a2e",
        ],
        [
          "#5c6a72",
          "#475258",
          "#8f5a5f",
          "#8f6b57",
          "#8f7a5f",
          "#6d865f",
          "#5f8870",
          "#5f8690",
          "#7f6f8f",
          "#7f7f7f",
        ],
      ),
    }),
  },
  kanagawa: {
    light: makePreset({
      drawDefaults: {
        drawStroke: "#545464",
        markerStroke: "#c0a36e",
        quillStroke: "#4d699b",
        canvas: "#DCD7BA",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#f4f1d9",
        stroke: "#dcd7ba",
        textColor: "#545464",
        lineStroke: "#545464",
      },
      strokeColors: makeStrokeColors([
        "#545464",
        "#c84053",
        "#b35b79",
        "#c0a36e",
        "#6f894e",
        "#629f9f",
        "#4d699b",
      ]),
      shapeColors: makeShapeColors(
        [
          "#545464",
          "#716e61",
          "#c84053",
          "#b35b79",
          "#c0a36e",
          "#6f894e",
          "#629f9f",
          "#4d699b",
          "#866b9c",
          "#b35b79",
          "#ffffff",
        ],
        [
          "#b9b28a",
          "#dcd7ba",
          "#e8b9c0",
          "#e8c0c8",
          "#dfcfae",
          "#cbd8bf",
          "#bfe0df",
          "#c5d2e8",
          "#d5cbe8",
          "#e1c8d8",
        ],
      ),
    }),
    dark: makePreset({
      drawDefaults: {
        drawStroke: "#dcd7ba",
        markerStroke: "#c0a36e",
        quillStroke: "#7e9cd8",
        canvas: "#1f1f28",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#2a2a37",
        stroke: "#363646",
        textColor: "#dcd7ba",
        lineStroke: "#dcd7ba",
      },
      strokeColors: makeStrokeColors([
        "#dcd7ba",
        "#c34043",
        "#ffa066",
        "#c0a36e",
        "#98bb6c",
        "#7fb4ca",
        "#7e9cd8",
      ]),
      shapeColors: makeShapeColors(
        [
          "#dcd7ba",
          "#c8c093",
          "#c34043",
          "#ffa066",
          "#c0a36e",
          "#98bb6c",
          "#7fb4ca",
          "#7e9cd8",
          "#957fb8",
          "#d27e99",
          "#16161d",
        ],
        [
          "#727169",
          "#54546d",
          "#7f3f44",
          "#8f674c",
          "#8f7a58",
          "#6f8a58",
          "#5f8a90",
          "#5f78a3",
          "#6f6590",
          "#8f6578",
        ],
      ),
    }),
  },
  dracula: {
    light: makePreset({
      drawDefaults: {
        drawStroke: "#282a36",
        markerStroke: "#ffb86c",
        quillStroke: "#6272a4",
        canvas: "#f8f8fb",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#f1f1f7",
        stroke: "#d7d7e2",
        textColor: "#282a36",
        lineStroke: "#282a36",
      },
      strokeColors: makeStrokeColors([
        "#282a36",
        "#ff5555",
        "#ffb86c",
        "#f1fa8c",
        "#50fa7b",
        "#8be9fd",
        "#6272a4",
      ]),
      shapeColors: makeShapeColors(
        [
          "#282a36",
          "#44475a",
          "#ff5555",
          "#ffb86c",
          "#f1fa8c",
          "#50fa7b",
          "#8be9fd",
          "#6272a4",
          "#bd93f9",
          "#ff79c6",
          "#ffffff",
        ],
        [
          "#a7a9b8",
          "#d7d7e2",
          "#f2b2b2",
          "#f2d0b0",
          "#e8eeb8",
          "#bfecc9",
          "#c5ebf2",
          "#c3cae8",
          "#d8c8f2",
          "#e8c6df",
        ],
      ),
    }),
    dark: makePreset({
      drawDefaults: {
        drawStroke: "#f8f8f2",
        markerStroke: "#ffb86c",
        quillStroke: "#8be9fd",
        canvas: "#171519",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#303341",
        stroke: "#44475a",
        textColor: "#f8f8f2",
        lineStroke: "#f8f8f2",
      },
      strokeColors: makeStrokeColors([
        "#f8f8f2",
        "#ff5555",
        "#ffb86c",
        "#f1fa8c",
        "#50fa7b",
        "#8be9fd",
        "#bd93f9",
      ]),
      shapeColors: makeShapeColors(
        [
          "#f8f8f2",
          "#bfbfbf",
          "#ff5555",
          "#ffb86c",
          "#f1fa8c",
          "#50fa7b",
          "#8be9fd",
          "#6272a4",
          "#bd93f9",
          "#ff79c6",
          "#21222c",
        ],
        [
          "#6272a4",
          "#44475a",
          "#8f4a5f",
          "#8f6b58",
          "#8f8f5e",
          "#5f8f6c",
          "#5f8f9a",
          "#5f6f8f",
          "#7f6f9a",
          "#8f6f8a",
        ],
      ),
    }),
  },
  one: {
    light: makePreset({
      drawDefaults: {
        drawStroke: "#383a42",
        markerStroke: "#d19a66",
        quillStroke: "#4078f2",
        canvas: "#fafafa",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#f0f0f0",
        stroke: "#d0d0d0",
        textColor: "#383a42",
        lineStroke: "#383a42",
      },
      strokeColors: makeStrokeColors([
        "#383a42",
        "#e45649",
        "#d19a66",
        "#c18401",
        "#50a14f",
        "#0184bc",
        "#4078f2",
      ]),
      shapeColors: makeShapeColors(
        [
          "#383a42",
          "#696c77",
          "#e45649",
          "#d19a66",
          "#c18401",
          "#50a14f",
          "#0184bc",
          "#4078f2",
          "#a626a4",
          "#ca1243",
          "#ffffff",
        ],
        [
          "#a0a1a7",
          "#d0d0d0",
          "#efb5b1",
          "#e7c9b0",
          "#dfceac",
          "#bfddbd",
          "#b8dce8",
          "#bdceef",
          "#d9c2e8",
          "#e8bed0",
        ],
      ),
    }),
    dark: makePreset({
      drawDefaults: {
        drawStroke: "#abb2bf",
        markerStroke: "#e5c07b",
        quillStroke: "#61afef",
        canvas: "#282c34",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#313640",
        stroke: "#3e4451",
        textColor: "#abb2bf",
        lineStroke: "#abb2bf",
      },
      strokeColors: makeStrokeColors([
        "#abb2bf",
        "#e06c75",
        "#d19a66",
        "#e5c07b",
        "#98c379",
        "#56b6c2",
        "#61afef",
      ]),
      shapeColors: makeShapeColors(
        [
          "#abb2bf",
          "#828997",
          "#e06c75",
          "#d19a66",
          "#e5c07b",
          "#98c379",
          "#56b6c2",
          "#61afef",
          "#c678dd",
          "#be5046",
          "#21252b",
        ],
        [
          "#5c6370",
          "#3e4451",
          "#8f5763",
          "#8f6a55",
          "#8f7f5f",
          "#6f8a63",
          "#4f7f86",
          "#5279a0",
          "#7f6790",
          "#8f5f57",
        ],
      ),
    }),
  },
  ayu: {
    light: makePreset({
      drawDefaults: {
        drawStroke: "#5c6773",
        markerStroke: "#f2ae49",
        quillStroke: "#399ee6",
        canvas: "#fffbea",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#fcf4dd",
        stroke: "#d9d8c7",
        textColor: "#5c6773",
        lineStroke: "#5c6773",
      },
      strokeColors: makeStrokeColors([
        "#5c6773",
        "#f07171",
        "#fa8d3e",
        "#f2ae49",
        "#86b300",
        "#4cbf99",
        "#399ee6",
      ]),
      shapeColors: makeShapeColors(
        [
          "#5c6773",
          "#7e8a97",
          "#f07171",
          "#fa8d3e",
          "#f2ae49",
          "#86b300",
          "#4cbf99",
          "#399ee6",
          "#a37acc",
          "#d95757",
          "#ffffff",
        ],
        [
          "#a0a8b0",
          "#d9d8c7",
          "#f2c1c1",
          "#f2d0ba",
          "#f2dfb5",
          "#d2e2b5",
          "#bde2d7",
          "#bdd8eb",
          "#d7c8e8",
          "#e8c4c4",
        ],
      ),
    }),
    dark: makePreset({
      drawDefaults: {
        drawStroke: "#bfbdb6",
        markerStroke: "#ffb454",
        quillStroke: "#39bae6",
        canvas: "#0B0E14",
        drawStrokeWidth: 2,
        markerStrokeWidth: 18,
        quillStrokeWidth: 2,
      },
      shapeDefaults: {
        fill: "#11151c",
        stroke: "#253340",
        textColor: "#bfbdb6",
        lineStroke: "#bfbdb6",
      },
      strokeColors: makeStrokeColors([
        "#bfbdb6",
        "#f07178",
        "#ff8f40",
        "#ffb454",
        "#aad94c",
        "#95e6cb",
        "#39bae6",
      ]),
      shapeColors: makeShapeColors(
        [
          "#bfbdb6",
          "#6c7986",
          "#f07178",
          "#ff8f40",
          "#ffb454",
          "#aad94c",
          "#95e6cb",
          "#39bae6",
          "#d2a6ff",
          "#f29668",
          "#02060d",
        ],
        [
          "#4f5b66",
          "#253340",
          "#8f4f5f",
          "#8f5f44",
          "#8f7348",
          "#6f8a4f",
          "#5f8f7f",
          "#3f7f95",
          "#7f679a",
          "#8f6f58",
        ],
      ),
    }),
  },
};

const getResolvedThemeMode = (
  mode: ThemeMode,
  systemPrefersDark: boolean,
): ThemeModeVariant => {
  const isDark = mode === "dark" || (mode === "system" && systemPrefersDark);
  return isDark ? "dark" : "light";
};

export const resolveThemeForSettings = (
  settings: Pick<SceneSettings, "theme" | "colorScheme">,
  systemPrefersDark: boolean,
) => {
  const resolvedMode = getResolvedThemeMode(settings.theme, systemPrefersDark);
  const preset = SCHEME_PRESETS[settings.colorScheme][resolvedMode];
  const dataTheme = `${settings.colorScheme}-${resolvedMode}`;

  return {
    variant: dataTheme,
    preset,
    isDark: resolvedMode === "dark",
    dataTheme,
  };
};

const collectUnique = (values: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    out.push(normalized);
  }

  return out;
};

const ALL_PRESETS = Object.values(SCHEME_PRESETS).flatMap((scheme) => [
  scheme.light,
  scheme.dark,
]);

export const THEME_DEFAULT_COLOR_LOOKUP = {
  drawStroke: collectUnique(
    ALL_PRESETS.map((preset) => preset.drawDefaults.drawStroke),
  ),
  markerStroke: collectUnique(
    ALL_PRESETS.map((preset) => preset.drawDefaults.markerStroke),
  ),
  quillStroke: collectUnique(
    ALL_PRESETS.map((preset) => preset.drawDefaults.quillStroke),
  ),
  shapeFill: collectUnique(
    ALL_PRESETS.map((preset) => preset.shapeDefaults.fill),
  ),
  shapeStroke: collectUnique(
    ALL_PRESETS.map((preset) => preset.shapeDefaults.stroke),
  ),
  textColor: collectUnique(
    ALL_PRESETS.map((preset) => preset.shapeDefaults.textColor),
  ),
  lineStroke: collectUnique(
    ALL_PRESETS.map((preset) => preset.shapeDefaults.lineStroke),
  ),
};

const hasDefaultColor = (color: string, defaults: readonly string[]) => {
  return defaults.includes(color.toLowerCase());
};

export const syncSceneThemeDefaults = (
  scene: Scene,
  nextPreset: ThemePreset,
): Scene => {
  let hasElementChanges = false;

  const nextElements = scene.elements.map((element) => {
    if (element.type === "draw") {
      const stroke = element.stroke?.toLowerCase() ?? "";
      if (element.drawMode === "marker") {
        if (!hasDefaultColor(stroke, THEME_DEFAULT_COLOR_LOOKUP.markerStroke)) {
          return element;
        }

        hasElementChanges = true;
        return {
          ...element,
          stroke: nextPreset.drawDefaults.markerStroke,
        };
      }

      if (element.drawMode === "quill") {
        if (!hasDefaultColor(stroke, THEME_DEFAULT_COLOR_LOOKUP.quillStroke)) {
          return element;
        }

        hasElementChanges = true;
        return {
          ...element,
          stroke: nextPreset.drawDefaults.quillStroke,
        };
      }

      if (!hasDefaultColor(stroke, THEME_DEFAULT_COLOR_LOOKUP.drawStroke)) {
        return element;
      }

      hasElementChanges = true;
      return {
        ...element,
        stroke: nextPreset.drawDefaults.drawStroke,
      };
    }

    if (element.type === "line") {
      if (
        !hasDefaultColor(
          element.stroke?.toLowerCase() ?? "",
          THEME_DEFAULT_COLOR_LOOKUP.lineStroke,
        )
      ) {
        return element;
      }

      hasElementChanges = true;
      return {
        ...element,
        stroke: nextPreset.shapeDefaults.lineStroke,
      };
    }

    if (element.type === "text") {
      if (
        !hasDefaultColor(
          element.color?.toLowerCase() ?? "",
          THEME_DEFAULT_COLOR_LOOKUP.textColor,
        )
      ) {
        return element;
      }

      hasElementChanges = true;
      return {
        ...element,
        color: nextPreset.shapeDefaults.textColor,
      };
    }

    if (element.type === "rectangle" || element.type === "circle") {
      let next = element;
      let changed = false;

      if (
        hasDefaultColor(
          element.fill?.toLowerCase() ?? "",
          THEME_DEFAULT_COLOR_LOOKUP.shapeFill,
        )
      ) {
        next = { ...next, fill: nextPreset.shapeDefaults.fill };
        changed = true;
      }

      if (
        hasDefaultColor(
          element.stroke?.toLowerCase() ?? "",
          THEME_DEFAULT_COLOR_LOOKUP.shapeStroke,
        )
      ) {
        next = { ...next, stroke: nextPreset.shapeDefaults.stroke };
        changed = true;
      }

      if (
        hasDefaultColor(
          element.color?.toLowerCase() ?? "",
          THEME_DEFAULT_COLOR_LOOKUP.textColor,
        )
      ) {
        next = { ...next, color: nextPreset.shapeDefaults.textColor };
        changed = true;
      }

      if (changed) {
        hasElementChanges = true;
      }

      return next;
    }

    return element;
  });

  const hasDrawDefaultsChange =
    scene.settings.drawDefaults.canvas !== nextPreset.drawDefaults.canvas ||
    scene.settings.drawDefaults.drawStroke !==
      nextPreset.drawDefaults.drawStroke ||
    scene.settings.drawDefaults.markerStroke !==
      nextPreset.drawDefaults.markerStroke ||
    scene.settings.drawDefaults.quillStroke !==
      nextPreset.drawDefaults.quillStroke ||
    scene.settings.drawDefaults.drawStrokeWidth !==
      nextPreset.drawDefaults.drawStrokeWidth ||
    scene.settings.drawDefaults.markerStrokeWidth !==
      nextPreset.drawDefaults.markerStrokeWidth ||
    scene.settings.drawDefaults.quillStrokeWidth !==
      nextPreset.drawDefaults.quillStrokeWidth;

  const hasShapeDefaultsChange =
    scene.settings.shapeDefaults.fill !== nextPreset.shapeDefaults.fill ||
    scene.settings.shapeDefaults.stroke !== nextPreset.shapeDefaults.stroke ||
    scene.settings.shapeDefaults.textColor !==
      nextPreset.shapeDefaults.textColor ||
    scene.settings.shapeDefaults.lineStroke !==
      nextPreset.shapeDefaults.lineStroke;

  if (!hasElementChanges && !hasDrawDefaultsChange && !hasShapeDefaultsChange) {
    return scene;
  }

  return {
    ...scene,
    elements: hasElementChanges ? nextElements : scene.elements,
    settings: {
      ...scene.settings,
      drawDefaults: hasDrawDefaultsChange
        ? { ...nextPreset.drawDefaults }
        : scene.settings.drawDefaults,
      shapeDefaults: hasShapeDefaultsChange
        ? { ...nextPreset.shapeDefaults }
        : scene.settings.shapeDefaults,
    },
  };
};
export const THEME_LABELS: Record<ColorScheme, string> = {
  drawo: "Drawo",
  catppuccin: "Catppuccin",
  nord: "Nord",
  solarized: "Solarized",
  gruvbox: "Gruvbox",
  tokyonight: "Tokyo Night",
  rosepine: "Rose Pine",
  everforest: "Everforest",
  kanagawa: "Kanagawa",
  dracula: "Dracula",
  one: "One",
  ayu: "Ayu",
};
export const getThemePaletteLabel = (colorScheme: ColorScheme): string => {
  return THEME_LABELS[colorScheme];
};
