import { useMemo, type ReactNode } from "react";
import { useDrawo } from "../context";
import { MenuBar } from "@features/workspace/components/MenuBar";
import { Timer } from "@features/timer/components/Timer";
import { MusicBar } from "@features/music/components/MusicBar";
import { SidebarMinimalistic } from "@solar-icons/react";

interface DrawoTopBarProps {
  children?: ReactNode;
}

export function DrawoTopBar({ children }: DrawoTopBarProps) {
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

  const hasCustomChildren = children !== undefined;

  const defaultContent = useMemo(() => {
    return (
      <>
        <div className="drawo-topbar-left">
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
        </div>
        <div className="drawo-topbar-right">
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
        </div>
      </>
    );
  }, [
    scene,
    locale,
    messages,
    openTopbarPanel,
    isSidebarOpen,
    setLocale,
    setScene,
    setSceneWithoutHistory,
    setOpenTopbarPanel,
    handlers,
  ]);

  return (
    <div className="drawo-topbar">
      {hasCustomChildren ? children : defaultContent}
    </div>
  );
}
