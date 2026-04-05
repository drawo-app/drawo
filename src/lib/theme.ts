import type { ThemePreset } from "@app/theme/themes";

export interface ResolvedTheme {
  preset: ThemePreset;
  dataTheme: string;
  isDark: boolean;
}
