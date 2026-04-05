import { type ReactNode } from "react";
import { useDrawo } from "../context";
import { MenuBar } from "@features/workspace/components/MenuBar";
import type { MenuBarProps } from "@features/workspace/components/MenuBar";
import { Timer } from "@features/timer/components/Timer";
import { MusicBar } from "@features/music/components/MusicBar";
import { SidebarMinimalistic } from "@solar-icons/react";

// ---------------------------------------------------------------------------
// Reusable default sub-components
// ---------------------------------------------------------------------------

/**
 * Renders the default MenuBar wired to the Drawo context.
 * Accepts the same extra props as MenuBar (extraMenuSections, etc).
 */
export function DefaultMenuBar(
  props: Omit<
    MenuBarProps,
    | "scene"
    | "locale"
    | "messages"
    | "setLocale"
    | "setScene"
    | "setSceneWithoutHistory"
    | "onExportProject"
    | "onExportImage"
    | "onOpenProject"
  >,
) {
  const ctx = useDrawo();
  const {
    scene,
    locale,
    messages,
    setLocale,
    setScene,
    setSceneWithoutHistory,
    handlers,
  } = ctx;

  return (
    <MenuBar
      scene={scene}
      locale={locale}
      messages={messages}
      setLocale={setLocale}
      setScene={setScene}
      setSceneWithoutHistory={setSceneWithoutHistory}
      onExportProject={handlers.handleExportProject as () => void}
      onExportImage={
        handlers.handleExportImage as (options: {
          format: "png" | "jpg" | "svg" | "pdf";
          qualityScale: number;
          transparentBackground: boolean;
          padding: number;
        }) => Promise<void>
      }
      onOpenProject={
        handlers.handleOpenProject as (file: File) => Promise<void>
      }
      {...props}
    />
  );
}

DefaultMenuBar.displayName = "DefaultMenuBar";

/**
 * Renders the default Timer wired to the Drawo context.
 */
export function DefaultTimer() {
  const { messages, openTopbarPanel, setOpenTopbarPanel } = useDrawo();

  return (
    <Timer
      messages={messages}
      isOpen={openTopbarPanel === "timer"}
      onOpenChange={(nextIsOpen) =>
        setOpenTopbarPanel(nextIsOpen ? "timer" : null)
      }
    />
  );
}

DefaultTimer.displayName = "DefaultTimer";

/**
 * Renders the default MusicBar wired to the Drawo context.
 */
export function DefaultMusicBar() {
  const { messages, openTopbarPanel, setOpenTopbarPanel } = useDrawo();

  return (
    <MusicBar
      messages={messages}
      isOpen={openTopbarPanel === "music"}
      onOpenChange={(nextIsOpen) =>
        setOpenTopbarPanel(nextIsOpen ? "music" : null)
      }
    />
  );
}

DefaultMusicBar.displayName = "DefaultMusicBar";

/**
 * Renders the default Sidebar launcher button wired to the Drawo context.
 */
export function DefaultSidebarLauncher() {
  const { openTopbarPanel, setOpenTopbarPanel } = useDrawo();
  const isSidebarOpen = openTopbarPanel === "sidebar";

  return (
    <div
      className={`sidebar-launcher-wrap ${isSidebarOpen ? "active" : ""}`}
    >
      <button
        type="button"
        className="sidebar-launcher"
        onClick={() =>
          setOpenTopbarPanel((current) =>
            current === "sidebar" ? null : "sidebar",
          )
        }
        aria-expanded={isSidebarOpen}
        aria-controls="search-library-sidebar"
        title="Abrir sidebar"
      >
        <SidebarMinimalistic weight="Bold" />
      </button>
    </div>
  );
}

DefaultSidebarLauncher.displayName = "DefaultSidebarLauncher";

/**
 * Renders all default right-side items: Timer, MusicBar, SidebarLauncher.
 * Use this when you want the full default right section as a single component.
 */
export function DefaultTopBarRight() {
  return (
    <>
      <DefaultTimer />
      <DefaultMusicBar />
      <DefaultSidebarLauncher />
    </>
  );
}

DefaultTopBarRight.displayName = "DefaultTopBarRight";

// ---------------------------------------------------------------------------
// DrawoTopBar
// ---------------------------------------------------------------------------

export interface DrawoTopBarProps {
  children?: ReactNode;
  /** Content to render before MenuBar (left side) */
  left?: ReactNode;
  /**
   * Fully replace the right section content.
   * When set, `rightBefore` and `rightAfter` are ignored.
   */
  right?: ReactNode;
  /** Content inserted *before* the default right items (Timer, MusicBar, Sidebar). */
  rightBefore?: ReactNode;
  /** Content inserted *after* the default right items (Timer, MusicBar, Sidebar). */
  rightAfter?: ReactNode;
  /** Show/hide the default MenuBar. Default: true */
  showMenuBar?: boolean;
  /** Show/hide the default Timer in the right section. Default: true */
  showTimer?: boolean;
  /** Show/hide the default MusicBar in the right section. Default: true */
  showMusicBar?: boolean;
  /** Show/hide the default Sidebar launcher in the right section. Default: true */
  showSidebarLauncher?: boolean;
  /** Extra props forwarded to the built-in MenuBar (only when showMenuBar=true) */
  menuBarProps?: Omit<
    MenuBarProps,
    | "scene"
    | "locale"
    | "messages"
    | "setLocale"
    | "setScene"
    | "setSceneWithoutHistory"
    | "onExportProject"
    | "onExportImage"
    | "onOpenProject"
  >;
}

export function DrawoTopBar({
  children,
  left,
  right,
  rightBefore,
  rightAfter,
  showMenuBar = true,
  showTimer = true,
  showMusicBar = true,
  showSidebarLauncher = true,
  menuBarProps,
}: DrawoTopBarProps) {
  const rightContent =
    right !== undefined ? (
      right
    ) : (
      <>
        {rightBefore}
        {showTimer && <DefaultTimer />}
        {showMusicBar && <DefaultMusicBar />}
        {showSidebarLauncher && <DefaultSidebarLauncher />}
        {rightAfter}
      </>
    );

  return (
    <div className="drawo-topbar">
      <div className="drawo-topbar-left">
        {children}
        {showMenuBar && <DefaultMenuBar {...menuBarProps} />}
        {left}
      </div>
      <div className="drawo-topbar-right">{rightContent}</div>
    </div>
  );
}

DrawoTopBar.displayName = "DrawoTopBar";
