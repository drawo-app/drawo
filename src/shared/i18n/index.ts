import enUS from "./locales/en_US.json";
import esES from "./locales/es_ES.json";

export type LocaleCode = "en_US" | "es_ES";

export interface LocaleMessages {
  menu: {
    showGrid: string;
    gridStyle: string;
    gridStyleDots: string;
    gridStyleSquares: string;
    snapToGrid: string;
    smartGuides: string;
    quillDrawOptimizations: string;
    theme: string;
    language: string;
    quickActions: string;
    clearCanvas: string;
    zenMode: string;
    presentationMode: string;
    colorProfile: string;

    file: string;
    edit: string;
    view: string;
    object: string;
    text: string;
    organize: string;
    settings: string;
    organizeActions: {
      alignLeft: string;
      alignCenter: string;
      alignRight: string;
      alignTop: string;
      alignMiddle: string;
      alignBottom: string;
    };
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
    image: string;
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
    placeholder: string;
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
    sloppiness: string;
    architect: string;
    artist: string;
    cartoonist: string;
    opacity: string;
    textAlign: string;
    startLineCap: string;
    endLineCap: string;
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
  contextMenu: {
    cut: string;
    copy: string;
    paste: string;
    duplicate: string;
    delete: string;

    group: string;
    ungroup: string;

    layers: {
      text: string;
      bringToFront: string;
      sendToBack: string;
      sendBackward: string;
      bringForward: string;
    };
    selectEverything: string;
  };
}

export const LANG_NAMES = {
  en_US: "English (US)",
  es_ES: "Español (ES)",
};

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
