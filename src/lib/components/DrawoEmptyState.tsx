import { useDrawo } from "../context";
import { CanvasEmptyState as DefaultCanvasEmptyState } from "@features/canvas/components/CanvasEmptyState";
import type { DrawoEmptyStateConfig } from "../types";

export interface DrawoEmptyStateProps {
  children?: React.ReactNode;
  config?: DrawoEmptyStateConfig;
}

export function DrawoEmptyState({ children, config }: DrawoEmptyStateProps) {
  const ctx = useDrawo();
  const { scene, messages, handlers } = ctx;

  if (scene.elements.length > 0) {
    return null;
  }

  const enabled = config?.enabled ?? true;
  if (!enabled) {
    return null;
  }

  const renderCustom = config?.render;
  if (renderCustom) {
    return (
      <div style={config?.style} className={config?.className}>
        {renderCustom({
          messages,
          onInsertImage: () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.multiple = true;
            input.onchange = (e) => {
              const files = Array.from(
                (e.target as HTMLInputElement).files ?? [],
              );
              if (files.length > 0) {
                (handlers.handleInsertImageFiles as (files: File[]) => void)?.(
                  files,
                );
              }
            };
            input.click();
          },
        })}
      </div>
    );
  }

  return (
    <div
      style={{
        ...config?.style,
        position: "absolute",
        left: "50%",
        top: "50%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        opacity: 0.5,
        flexDirection: "column",
        transform: "translate(-50%, -50%)",
        userSelect: "none",
      }}
      className={config?.className}
    >
      {children ?? <DefaultCanvasEmptyState />}
    </div>
  );
}
