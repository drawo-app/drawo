import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { LocaleCode, LocaleMessages } from "@shared/i18n";
import { isLocaleCode, LANG_NAMES } from "@shared/i18n";
import {
  alignSelectedElements,
  type Scene,
  updateSceneSettings,
} from "@core/scene";
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
} from "@shared/ui/dropdown-menu";
import { Moon, Sun } from "@solar-icons/react";
import {
  BroomMotion,
  BucketPaint,
  ChevronsExpandUpRight,
  Cup,
  Dots9,
  Eye,
  File,
  Gear,
  Globe,
  LayoutCells,
  LayoutHeaderCursor,
  Molecule,
  ObjectsAlignBottom,
  ObjectsAlignCenterHorizontal,
  ObjectsAlignCenterVertical,
  ObjectsAlignLeft,
  ObjectsAlignRight,
  ObjectsAlignTop,
  PencilToSquare,
  Rectangles4,
  Route,
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
} from "@shared/ui/dialog";
import { Alt } from "@shared/lib/platform/macShortcuts";
import { LaserPointerStylusIcon } from "@shared/ui/icons";
import { ColorSwatchPicker } from "@shared/ui/ColorSwatchPicker";
import { invertLightnessPreservingHue } from "@features/canvas/rendering/color";

interface MenuBarProps {
  scene: Scene;
  locale: LocaleCode;
  messages: LocaleMessages;
  setLocale: Dispatch<SetStateAction<LocaleCode>>;
  setScene: Dispatch<SetStateAction<Scene>>;
}

export const MenuBar = ({
  scene,
  locale,
  messages,
  setLocale,
  setScene,
}: MenuBarProps) => {
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isLaserPointerOpen, setIsLaserPointerOpen] = useState(false);
  const hasElements = scene.elements.length > 0;
  const selectedCount =
    scene.selectedIds.length > 0
      ? scene.selectedIds.length
      : scene.selectedId
        ? 1
        : 0;

  const uniColor = (color: string) =>
    document.documentElement.classList.contains("dark")
      ? invertLightnessPreservingHue(color)
      : color;

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
            <Thunderbolt /> {messages.menu.quickActions}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <File />
              {messages.menu.file}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => setIsClearDialogOpen(true)}
                disabled={!hasElements}
              >
                <BroomMotion /> {messages.menu.clearCanvas}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <PencilToSquare />
              {messages.menu.edit}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent></DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Eye />
              {messages.menu.view}
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
                <LayoutCells /> {messages.menu.showGrid}{" "}
              </DropdownMenuCheckboxItem>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <LayoutHeaderCursor />
                  {messages.menu.gridStyle}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={scene.settings.gridStyle}
                    onValueChange={(value) => {
                      if (value !== "dots" && value !== "squares") {
                        return;
                      }

                      setScene((currentScene) =>
                        updateSceneSettings(currentScene, {
                          gridStyle: value,
                        }),
                      );
                    }}
                  >
                    <DropdownMenuRadioItem value="dots">
                      <Dots9 />
                      {messages.menu.gridStyleDots}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="squares">
                      <Rectangles4 />
                      {messages.menu.gridStyleSquares}
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
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
                <Cup /> {messages.menu.zenMode}
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
                <ChevronsExpandUpRight /> {messages.menu.presentationMode}
                <div className="drawo-keybind">
                  <span>{Alt()}</span>+ <span>R</span>
                </div>
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={scene.settings.quillDrawOptimizations}
                onClick={() => {
                  setScene((currentScene) =>
                    updateSceneSettings(currentScene, {
                      quillDrawOptimizations:
                        !currentScene.settings.quillDrawOptimizations,
                    }),
                  );
                }}
              >
                <Molecule /> {messages.menu.quillDrawOptimizations}
              </DropdownMenuCheckboxItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <VectorSquare />
              {messages.menu.object}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent></DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Text />
              {messages.menu.text}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent></DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ObjectsAlignBottom />
              {messages.menu.organize}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                disabled={selectedCount < 2}
                onClick={() => {
                  setScene((currentScene) =>
                    alignSelectedElements(currentScene, "left"),
                  );
                }}
              >
              <ObjectsAlignLeft />
                {messages.menu.organizeActions.alignLeft}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={selectedCount < 2}
                onClick={() => {
                  setScene((currentScene) =>
                    alignSelectedElements(currentScene, "center"),
                  );
                }}
              >
                <ObjectsAlignCenterHorizontal />
                {messages.menu.organizeActions.alignCenter}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={selectedCount < 2}
                onClick={() => {
                  setScene((currentScene) =>
                    alignSelectedElements(currentScene, "right"),
                  );
                }}
              >
                <ObjectsAlignRight/>
                {messages.menu.organizeActions.alignRight}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={selectedCount < 2}
                onClick={() => {
                  setScene((currentScene) =>
                    alignSelectedElements(currentScene, "top"),
                  );
                }}
              >
                <ObjectsAlignTop />
                {messages.menu.organizeActions.alignTop}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={selectedCount < 2}
                onClick={() => {
                  setScene((currentScene) =>
                    alignSelectedElements(currentScene, "middle"),
                  );
                }}
              >
                <ObjectsAlignCenterVertical/>
                {messages.menu.organizeActions.alignMiddle}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={selectedCount < 2}
                onClick={() => {
                  setScene((currentScene) =>
                    alignSelectedElements(currentScene, "bottom"),
                  );
                }}
              >
                <ObjectsAlignBottom />
                {messages.menu.organizeActions.alignBottom}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Gear />
              {messages.menu.settings}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
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
                <SquareDashedCircle /> {messages.menu.snapToGrid}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={scene.settings.smartGuides}
                onClick={() => {
                  setScene((currentScene) =>
                    updateSceneSettings(currentScene, {
                      smartGuides: !currentScene.settings.smartGuides,
                    }),
                  );
                }}
              >
                <Route /> {messages.menu.smartGuides}
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <div className="custom-element">
                <span>
                  <BucketPaint />
                  {messages.menu.colorProfile}
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
                  {messages.menu.language}
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
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem
                onClick={() => {
                  setIsLaserPointerOpen(!isLaserPointerOpen);
                }}
              >
                <LaserPointerStylusIcon /> Laser pointer configuration...
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isLaserPointerOpen} onOpenChange={setIsLaserPointerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Laser pointer configuration</DialogTitle>
            <DialogDescription>
              Configure the laser pointer settings.
            </DialogDescription>
          </DialogHeader>
          <p className="label">Color</p>
          <div className="colorswatch-dialog">
            <ColorSwatchPicker
              colors={[
                "#FF1A28",
                "#FF7A00",
                "#FFD400",
                "#00E05A",
                "#008CFF",
                "#9B3DFF",
                "#FF2BD6",
                "#00E5FF",
              ]}
              currentColor={"#FF1A28"}
              uniColor={uniColor}
              renderItem={({ color, swatch }) => (
                <div
                  key={color}
                  className="drawo-colorselect-item"
                  onPointerDown={undefined}
                  onSelect={undefined}
                >
                  {swatch}
                </div>
              )}
            />
          </div>
          <p className="label">Duración del trazo</p>

          <DialogFooter>
            <div className="drawo-dialog-actions">
              <DialogClose asChild>
                <button type="button" className="drawo-btn-secondary">
                  Cerrar
                </button>
              </DialogClose>
              <button
                type="button"
                className="drawo-btn-primary"
                onClick={() => {}}
              >
                Guardar
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
