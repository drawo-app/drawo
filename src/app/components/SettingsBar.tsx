import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import type { LocaleCode, LocaleMessages } from "../../i18n";
import { isLocaleCode } from "../../i18n";
import { type Scene, updateSceneSettings } from "../../core/scene";
import { MenuIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/dropdown-menu";
import { Moon, PaperBin, Sun } from "@solar-icons/react";
import { LayoutCells, SquareDashedCircle } from "@gravity-ui/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/dialog";

interface SettingsBarProps {
  scene: Scene;
  locale: LocaleCode;
  messages: LocaleMessages;
  setLocale: Dispatch<SetStateAction<LocaleCode>>;
  setScene: Dispatch<SetStateAction<Scene>>;
}

export const SettingsBar = ({
  scene,
  locale,
  messages,
  setLocale,
  setScene,
}: SettingsBarProps) => {
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const hasElements = scene.elements.length > 0;

  const handleClearCanvas = useCallback(() => {
    setScene((currentScene) => {
      if (currentScene.elements.length === 0) {
        return currentScene;
      }

      return {
        ...currentScene,
        elements: [],
        selectedId: null,
        selectedIds: [],
      };
    });
    setIsClearDialogOpen(false);
  }, [setScene]);

  return (
    <div className="settings-bar">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={`tool-item`} onClick={() => {}}>
            <MenuIcon />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onClick={() => setIsClearDialogOpen(true)}
            disabled={!hasElements}
          >
            <PaperBin /> {messages.settings.clearCanvas}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={scene.settings.showGrid}
            onClick={() => {
              setScene((currentScene) =>
                updateSceneSettings(currentScene, {
                  showGrid: !currentScene.settings.showGrid,
                }),
              );
            }}
          >
            <LayoutCells /> {messages.settings.showGrid}{" "}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={scene.settings.snapToGrid}
            onClick={() => {
              setScene((currentScene) =>
                updateSceneSettings(currentScene, {
                  snapToGrid: !currentScene.settings.snapToGrid,
                }),
              );
            }}
          >
            <SquareDashedCircle /> {messages.settings.snapToGrid}
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <div className="custom-element">
            <span>{messages.settings.theme}</span>
            <div className="theme-selector">
              <div
                className={
                  "theme-option " +
                  (scene.settings.theme === "light" ? "active" : "")
                }
                onClick={() => {
                  setScene((currentScene) =>
                    updateSceneSettings(currentScene, {
                      theme: "light",
                    }),
                  );
                }}
              >
                <Sun size={16} weight="Bold" />
              </div>
              <div
                className={
                  "theme-option " +
                  (scene.settings.theme === "dark" ? "active" : "")
                }
                onClick={() => {
                  setScene((currentScene) =>
                    updateSceneSettings(currentScene, {
                      theme: "dark",
                    }),
                  );
                }}
              >
                <Moon size={16} weight="Bold" />
              </div>
            </div>
          </div>
          <div className="custom-element">
            <Select
              value={locale}
              onValueChange={(value) => {
                if (isLocaleCode(value)) {
                  setLocale(value);
                }
              }}
            >
              <SelectTrigger className="custom-select-trigger">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en_US">English</SelectItem>
                <SelectItem value="es_ES">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{messages.dialogs.clearCanvas.title}</DialogTitle>
            <DialogDescription>
              {messages.dialogs.clearCanvas.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="drawo-dialog-actions">
              <DialogClose asChild>
                <button type="button" className="drawo-btn-secondary">
                  {messages.dialogs.clearCanvas.cancel}
                </button>
              </DialogClose>
              <button
                type="button"
                className="drawo-btn-danger"
                onClick={handleClearCanvas}
              >
                {messages.dialogs.clearCanvas.confirm}
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
