import { useDrawo } from "../context";
import { ToolBar } from "@features/workspace/components/ToolBar";

export function DrawoToolBar() {
  const ctx = useDrawo();
  const {
    scene,
    resolvedTheme,
    isDarkMode,
    isPresentationMode,
    interactionMode,
    drawingTool,
    messages,
    setInteractionMode,
    setDrawingTool,
    handlers,
  } = ctx;

  return (
    <ToolBar
      interactionMode={interactionMode}
      drawingTool={drawingTool}
      isPresentationMode={isPresentationMode}
      messages={messages}
      setInteractionMode={setInteractionMode}
      setDrawingTool={setDrawingTool}
      drawDefaults={scene.settings.drawDefaults}
      invertPaletteInDarkMode={
        isDarkMode && scene.settings.colorScheme === "drawo"
      }
      strokeColors={resolvedTheme.preset.strokeColors}
      onDrawDefaultStrokeColorChange={
        handlers.handleDrawDefaultStrokeColorChange as (
          drawMode: "draw" | "marker" | "quill",
          strokeColor: string,
        ) => void
      }
      onDrawDefaultStrokeWidthChange={
        handlers.handleDrawDefaultStrokeWidthChange as (
          drawMode: "draw" | "marker" | "quill",
          strokeWidth: number,
        ) => void
      }
      onSelectImageFiles={(files) =>
        (handlers.handleInsertImageFiles as (files: File[]) => void)?.(files)
      }
    />
  );
}
