import enUS from "./locales/en_US.json";
import esES from "./locales/es_ES.json";

export type LocaleCode = "en_US" | "es_ES";

export interface LocaleMessages {
  settings: {
    showGrid: string;
    snapToGrid: string;
    darkMode: string;
    language: string;
  };
  localeNames: {
    en_US: string;
    es_ES: string;
  };
  toolNames: {
    selection: string;
    pan: string;
    text: string;
    rectangle: string;
    ellipse: string;
    draw: string;
    laser: string;
  };
  fontFamilies: {
    simple: string;
    handwritten: string;
    elegant: string;
    technical: string;
  };
  fontSizes: {
    small: string;
    medium: string;
    large: string;
    extraLarge: string;
    huge: string;
  };
  selectionBar: {
    strokeWidth: string;
    fontFamily: string;
    fontSize: string;
    strokeColor: string;
    fillColor: string;
    fillStyle: string;
    opacity: string;
    textAlign: string;
    textColor: string;
  };
  canvas: {
    newText: string;
    tagline: string;
  };
}

export const LOCALES: Record<LocaleCode, LocaleMessages> = {
  en_US: enUS as LocaleMessages,
  es_ES: esES as LocaleMessages,
};

export const isLocaleCode = (value: unknown): value is LocaleCode => {
  return value === "en_US" || value === "es_ES";
};

export const formatLocaleText = (
  template: string,
  values: Record<string, string | number>,
): string => {
  return Object.entries(values).reduce((result, [key, value]) => {
    return result.replaceAll(`{${key}}`, String(value));
  }, template);
};
