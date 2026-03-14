import type { Scene } from "./types";

const isTextCapableElement = (
  element: Scene["elements"][number],
): element is Extract<
  Scene["elements"][number],
  { type: "text" | "rectangle" | "circle" }
> => {
  return (
    element.type === "text" ||
    element.type === "rectangle" ||
    element.type === "circle"
  );
};

export const updateTextElementContent = (
  scene: Scene,
  id: string,
  text: string,
): Scene => ({
  ...scene,
  elements: scene.elements.map((element) => {
    if (element.id !== id || !isTextCapableElement(element)) {
      return element;
    }

    return {
      ...element,
      text,
    };
  }),
});

export const updateTextElementsFontFamily = (
  scene: Scene,
  ids: string[],
  fontFamily: string,
): Scene => {
  if (ids.length === 0) {
    return scene;
  }

  const targetIds = new Set(ids);

  return {
    ...scene,
    elements: scene.elements.map((element) => {
      if (!targetIds.has(element.id) || !isTextCapableElement(element)) {
        return element;
      }

      return {
        ...element,
        fontFamily,
      };
    }),
  };
};

export const updateTextElementsFontSize = (
  scene: Scene,
  ids: string[],
  fontSize: number,
): Scene => {
  if (ids.length === 0) {
    return scene;
  }

  const targetIds = new Set(ids);
  const nextFontSize = Math.max(10, Math.round(fontSize));

  return {
    ...scene,
    elements: scene.elements.map((element) => {
      if (!targetIds.has(element.id) || !isTextCapableElement(element)) {
        return element;
      }

      return {
        ...element,
        fontSize: nextFontSize,
      };
    }),
  };
};

export const updateTextElementsFontWeight = (
  scene: Scene,
  ids: string[],
  fontWeight: string,
): Scene => {
  if (ids.length === 0) {
    return scene;
  }

  const targetIds = new Set(ids);

  return {
    ...scene,
    elements: scene.elements.map((element) => {
      if (!targetIds.has(element.id) || !isTextCapableElement(element)) {
        return element;
      }

      return {
        ...element,
        fontWeight,
      };
    }),
  };
};

export const updateTextElementsFontStyle = (
  scene: Scene,
  ids: string[],
  fontStyle: "normal" | "italic",
): Scene => {
  if (ids.length === 0) {
    return scene;
  }

  const targetIds = new Set(ids);

  return {
    ...scene,
    elements: scene.elements.map((element) => {
      if (!targetIds.has(element.id) || !isTextCapableElement(element)) {
        return element;
      }

      return {
        ...element,
        fontStyle,
      };
    }),
  };
};

export const updateTextElementsTextAlign = (
  scene: Scene,
  ids: string[],
  textAlign: CanvasTextAlign,
): Scene => {
  if (ids.length === 0) {
    return scene;
  }

  const targetIds = new Set(ids);

  return {
    ...scene,
    elements: scene.elements.map((element) => {
      if (!targetIds.has(element.id) || !isTextCapableElement(element)) {
        return element;
      }

      return {
        ...element,
        textAlign,
      };
    }),
  };
};

export const updateTextElementLayout = (
  scene: Scene,
  id: string,
  x: number,
  y: number,
  fontSize: number,
): Scene => ({
  ...scene,
  elements: scene.elements.map((element) => {
    if (element.id !== id || element.type !== "text") {
      return element;
    }

    return {
      ...element,
      x,
      y,
      fontSize,
    };
  }),
});

export const updateRectangleElementsBorderRadius = (
  scene: Scene,
  ids: string[],
  borderRadius: number,
): Scene => {
  if (ids.length === 0) {
    return scene;
  }

  const targetIds = new Set(ids);
  const nextRadius = Math.max(0, borderRadius);

  return {
    ...scene,
    elements: scene.elements.map((element) => {
      if (!targetIds.has(element.id) || element.type !== "rectangle") {
        return element;
      }

      return {
        ...element,
        borderRadius: nextRadius,
      };
    }),
  };
};

export const updateDrawElementsStrokeWidth = (
  scene: Scene,
  ids: string[],
  strokeWidth: number,
): Scene => {
  if (ids.length === 0) {
    return scene;
  }

  const targetIds = new Set(ids);
  const nextStrokeWidth = Math.max(1, strokeWidth);

  return {
    ...scene,
    elements: scene.elements.map((element) => {
      if (
        !targetIds.has(element.id) ||
        (element.type !== "draw" && element.type !== "line")
      ) {
        return element;
      }

      return {
        ...element,
        strokeWidth: nextStrokeWidth,
      };
    }),
  };
};

export const updateDrawElementsStrokeColor = (
  scene: Scene,
  ids: string[],
  strokeColor: string,
): Scene => {
  if (ids.length === 0 || strokeColor === "multi") {
    return scene;
  }

  const targetIds = new Set(ids);

  return {
    ...scene,
    elements: scene.elements.map((element) => {
      if (
        !targetIds.has(element.id) ||
        (element.type !== "draw" && element.type !== "line")
      ) {
        return element;
      }

      return {
        ...element,
        stroke: strokeColor,
      };
    }),
  };
};

export const updateShapeElementsFillStyle = (
  scene: Scene,
  ids: string[],
  fillStyle: "solid" | "hachure" | "none",
): Scene => {
  if (ids.length === 0) {
    return scene;
  }

  const targetIds = new Set(ids);

  return {
    ...scene,
    elements: scene.elements.map((element) => {
      if (
        !targetIds.has(element.id) ||
        (element.type !== "rectangle" && element.type !== "circle")
      ) {
        return element;
      }

      return {
        ...element,
        fillStyle: fillStyle,
      };
    }),
  };
};

export const updateShapeElementsSloppiness = (
  scene: Scene,
  ids: string[],
  sloppiness: "architect" | "artist" | "cartoonist",
): Scene => {
  if (ids.length === 0) {
    return scene;
  }

  const targetIds = new Set(ids);

  return {
    ...scene,
    elements: scene.elements.map((element) => {
      if (
        !targetIds.has(element.id) ||
        (element.type !== "rectangle" && element.type !== "circle")
      ) {
        return element;
      }

      return {
        ...element,
        sloppiness,
      };
    }),
  };
};

export const updateShapeElementsFillColor = (
  scene: Scene,
  ids: string[],
  fillColor: string,
): Scene => {
  if (ids.length === 0 || fillColor === "multi") {
    return scene;
  }

  const targetIds = new Set(ids);

  return {
    ...scene,
    elements: scene.elements.map((element) => {
      if (
        !targetIds.has(element.id) ||
        (element.type !== "rectangle" && element.type !== "circle")
      ) {
        return element;
      }

      return {
        ...element,
        fill: fillColor,
      };
    }),
  };
};

export const updateShapeElementsStrokeColor = (
  scene: Scene,
  ids: string[],
  strokeColor: string,
): Scene => {
  if (ids.length === 0 || strokeColor === "multi") {
    return scene;
  }

  const targetIds = new Set(ids);

  return {
    ...scene,
    elements: scene.elements.map((element) => {
      if (
        !targetIds.has(element.id) ||
        (element.type !== "rectangle" && element.type !== "circle")
      ) {
        return element;
      }

      return {
        ...element,
        stroke: strokeColor,
      };
    }),
  };
};

export const updateShapeElementsStrokeWidth = (
  scene: Scene,
  ids: string[],
  strokeWidth: number,
): Scene => {
  if (ids.length === 0) {
    return scene;
  }

  const targetIds = new Set(ids);

  return {
    ...scene,
    elements: scene.elements.map((element) => {
      if (
        !targetIds.has(element.id) ||
        (element.type !== "rectangle" && element.type !== "circle")
      ) {
        return element;
      }

      return {
        ...element,
        strokeWidth,
      };
    }),
  };
};
