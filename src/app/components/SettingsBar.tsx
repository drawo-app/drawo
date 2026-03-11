import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { LocaleCode, LocaleMessages } from "../../i18n";
import { isLocaleCode, LANG_NAMES } from "../../i18n";
import { type Scene, updateSceneSettings } from "../../core/scene";
import { MenuIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../../components/dropdown-menu";
import { Moon, Sun } from "@solar-icons/react";
import {
  BroomMotion,
  BucketPaint,
  ChevronsExpandUpRight,
  Cup,
  Eye,
  File,
  Gear,
  Globe,
  LayoutCells,
  ObjectsAlignBottom,
  PencilToSquare,
  SquareDashedCircle,
  Text,
  Thunderbolt,
  VectorSquare,
} from "@gravity-ui/icons";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/dialog";
import { Alt } from "../utils/macShortcuts";

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
          <DropdownMenuItem disabled variant="accent">
            <Thunderbolt /> {messages.settings.quickActions}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <File />
              Archivo
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => setIsClearDialogOpen(true)}
                disabled={!hasElements}
              >
                <BroomMotion /> {messages.settings.clearCanvas}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <PencilToSquare />
              Editar
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent></DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Eye />
              Ver
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
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

              <DropdownMenuCheckboxItem
                checked={scene.settings.zenMode}
                onClick={() => {
                  setScene((currentScene) =>
                    updateSceneSettings(currentScene, {
                      zenMode: !currentScene.settings.zenMode,
                    }),
                  );
                }}
              >
                <Cup /> {messages.settings.zenMode}
                <div className="drawo-keybind">
                  <span>{Alt()}</span>+ <span>Z</span>
                </div>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={scene.settings.presentationMode}
                onClick={() => {
                  setScene((currentScene) =>
                    updateSceneSettings(currentScene, {
                      presentationMode: !currentScene.settings.presentationMode,
                    }),
                  );
                }}
              >
                <ChevronsExpandUpRight /> {messages.settings.presentationMode}
                <div className="drawo-keybind">
                  <span>{Alt()}</span>+ <span>R</span>
                </div>
              </DropdownMenuCheckboxItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <VectorSquare />
              Objeto
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent></DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Text />
              Texto
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent></DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ObjectsAlignBottom />
              Organizar
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent></DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Gear />
              Preferencias
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <div className="custom-element">
                <span>
                  <BucketPaint /> Perfil de color
                </span>
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
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Globe />
                  {messages.settings.language}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={locale}
                    onValueChange={(value) => {
                      if (isLocaleCode(value)) {
                        setLocale(value);
                      }
                    }}
                  >
                    {Object.entries(LANG_NAMES).map(([code, name]) => {
                      return (
                        <DropdownMenuRadioItem value={code}>
                          {name}
                        </DropdownMenuRadioItem>
                      );
                    })}
                  </DropdownMenuRadioGroup>

                  {/*
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
          </div>*/}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
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
