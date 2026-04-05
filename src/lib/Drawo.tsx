import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { TooltipProvider } from "@shared/ui/tooltip";
import { DrawoProvider } from "./DrawoProvider";
import { useDrawo } from "./context";
import type { DrawoProps } from "./types";
import { DrawoTopBar } from "./components/DrawoTopBar";
import { DrawoCanvas } from "./components/DrawoCanvas";
import { DrawoToolBar } from "./components/DrawoToolBar";
import { DrawoUndoBar } from "./components/DrawoUndoBar";
import { DrawoZoomBar } from "./components/DrawoZoomBar";
import { DrawoEmptyState } from "./components/DrawoEmptyState";
import "@app/theme/base-tokens.css";
import "@app/theme/themes/drawo-light.css";
import "@app/theme/themes/drawo-dark.css";
import "@app/theme/themes/catppuccin-latte.css";
import "@app/theme/themes/catppuccin-mocha.css";
import "@app/theme/themes/nord-light.css";
import "@app/theme/themes/nord-dark.css";
import "@app/theme/themes/solarized-light.css";
import "@app/theme/themes/solarized-dark.css";
import "@app/theme/themes/gruvbox-light.css";
import "@app/theme/themes/gruvbox-dark.css";
import "@app/theme/themes/tokyonight-light.css";
import "@app/theme/themes/tokyonight-dark.css";
import "@app/theme/themes/rosepine-light.css";
import "@app/theme/themes/rosepine-dark.css";
import "@app/theme/themes/everforest-light.css";
import "@app/theme/themes/everforest-dark.css";
import "@app/theme/themes/kanagawa-light.css";
import "@app/theme/themes/kanagawa-dark.css";
import "@app/theme/themes/dracula-light.css";
import "@app/theme/themes/dracula-dark.css";
import "@app/theme/themes/one-light.css";
import "@app/theme/themes/one-dark.css";
import "@app/theme/themes/ayu-light.css";
import "@app/theme/themes/ayu-dark.css";
import "@app/App.css";

type DrawoLayoutSlot =
  | "topBar"
  | "canvas"
  | "toolBar"
  | "undoBar"
  | "zoomBar"
  | "emptyState";

function DrawoLayout({
  children,
  className,
  style,
}: {
  children?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ctx = useDrawo();
  const { openTopbarPanel } = ctx;
  const isSidebarOpen = openTopbarPanel === "sidebar";

  const slots: Partial<Record<DrawoLayoutSlot, ReactNode>> = {};
  const extraChildren: ReactNode[] = [];

  for (const child of Children.toArray(children)) {
    if (isValidElement(child)) {
      if (child.type === DrawoTopBar) {
        slots.topBar ??= child;
        continue;
      }

      if (child.type === DrawoCanvas) {
        slots.canvas ??= child;
        continue;
      }

      if (child.type === DrawoToolBar) {
        slots.toolBar ??= child;
        continue;
      }

      if (child.type === DrawoUndoBar) {
        slots.undoBar ??= child;
        continue;
      }

      if (child.type === DrawoZoomBar) {
        slots.zoomBar ??= child;
        continue;
      }

      if (child.type === DrawoEmptyState) {
        slots.emptyState ??= child;
        continue;
      }
    }

    extraChildren.push(child);
  }

  const hasCustomEmptyState = slots.emptyState !== undefined;
  const canvasNode =
    slots.canvas ?? (
      <DrawoCanvas showDefaultEmptyState={!hasCustomEmptyState} />
    );
  const resolvedCanvasNode = isValidElement(canvasNode)
    ? cloneElement(
        canvasNode as ReactElement<{ showDefaultEmptyState?: boolean }>,
        {
          showDefaultEmptyState: !hasCustomEmptyState,
        },
      )
    : canvasNode;

  return (
    <div className={`app-root ${className ?? ""}`} style={style}>
      <TooltipProvider>
        <div
          className={`app-shell ${isSidebarOpen ? "app-shell--sidebar-open" : ""}`}
        >
          <div className="app-workspace">
            {slots.topBar ?? <DrawoTopBar />}
            {resolvedCanvasNode}
            {slots.toolBar ?? <DrawoToolBar />}
            {slots.undoBar ?? <DrawoUndoBar />}
            {hasCustomEmptyState ? slots.emptyState : null}
            {slots.zoomBar ?? <DrawoZoomBar />}
            {extraChildren}
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}

function DrawoComponent(props: DrawoProps) {
  const { children, className, style, ...providerProps } = props;

  return (
    <DrawoProvider {...providerProps}>
      <DrawoLayout className={className} style={style}>
        {children}
      </DrawoLayout>
    </DrawoProvider>
  );
}

const Drawo = Object.assign(DrawoComponent, {
  TopBar: DrawoTopBar,
  Canvas: DrawoCanvas,
  ToolBar: DrawoToolBar,
  UndoBar: DrawoUndoBar,
  ZoomBar: DrawoZoomBar,
  EmptyState: DrawoEmptyState,
});

export { Drawo };
export { useDrawo } from "./context";
export { DrawoProvider } from "./DrawoProvider";
export type { DrawoProps, DrawoContextValue } from "./types";
export type { ResolvedTheme } from "./theme";
