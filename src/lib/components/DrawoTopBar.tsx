import { useMemo, type ReactNode } from "react";
import { useDrawo } from "../context";
import { MenuBar } from "@features/workspace/components/MenuBar";
import { Timer } from "@features/timer/components/Timer";
import { MusicBar } from "@features/music/components/MusicBar";
import { SidebarMinimalistic } from "@solar-icons/react";

interface DrawoTopBarProps {
  children?: ReactNode;
  /** Content to render before MenuBar (left side) */
  left?: ReactNode;
  /** Content to render after MenuBar (right side) */
  right?: ReactNode;
  /** Show/hide the default MenuBar */
  showMenuBar?: boolean;
}

export function DrawoTopBar({
  children,
  left,
  right,
  showMenuBar = true,
}: DrawoTopBarProps) {
  const ctx = useDrawo();
  const {
    scene,
    locale,
    messages,
    openTopbarPanel,
    setLocale,
    setScene,
    setSceneWithoutHistory,
    setOpenTopbarPanel,
    handlers,
  } = ctx;

  const isSidebarOpen = openTopbarPanel === "sidebar";

  const defaultRightContent = (
    <>
      <Timer
        messages={messages}
        isOpen={openTopbarPanel === "timer"}
        onOpenChange={(nextIsOpen) =>
          setOpenTopbarPanel(nextIsOpen ? "timer" : null)
        }
      />
      <MusicBar
        messages={messages}
        isOpen={openTopbarPanel === "music"}
        onOpenChange={(nextIsOpen) =>
          setOpenTopbarPanel(nextIsOpen ? "music" : null)
        }
      />
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
    </>
  );

  return (
    <div className="drawo-topbar">
      <div className="drawo-topbar-left">
        {children}
        {showMenuBar && (
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
          />
        )}
        {left}
      </div>
      <div className="drawo-topbar-right">
        {right !== undefined ? right : defaultRightContent}
      </div>
    </div>
  );
}

DrawoTopBar.displayName = "DrawoTopBar";
