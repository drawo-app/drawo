import enUS from "./locales/en_US.json";
import esES from "./locales/es_ES.json";

export type LocaleCode = "en_US" | "es_ES";

export interface LocaleMessages {
  settings: {
    showGrid: string;
    snapToGrid: string;
    theme: string;
    language: string;
    clearCanvas: string;
  };
  dialogs: {
    clearCanvas: {
      title: string;
      description: string;
      confirm: string;
      cancel: string;
    };
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
    line: string;
    draw: string;
    laser: string;
    marker: string;
    quill: string;
    pen: string;
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
    bold: string;
    italic: string;
    strikethrough: string;
    strokeColor: string;
    fillColor: string;
    fillStyle: string;
    opacity: string;
    textAlign: string;
    textAlignDirection: {
      left: string;
      center: string;
      right: string;
    };
    textColor: string;
  };
  panels: {
    playing: string;
    music: string;
    timer: string;
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
