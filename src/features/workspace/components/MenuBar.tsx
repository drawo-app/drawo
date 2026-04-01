import {
  type ChangeEvent,
  useCallback,
  useRef,
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
import {
  ArrowDownToSquare,
  BroomMotion,
  ChevronsExpandUpRight,
  CrownDiamond,
  Cup,
  Dots9,
  Eye,
  File,
  FolderOpen,
  Gear,
  Globe,
  LayoutCells,
  LayoutHeaderCursor,
  LogoGithub,
  Molecule,
  ObjectsAlignBottom,
  ObjectsAlignCenterHorizontal,
  ObjectsAlignCenterVertical,
  ObjectsAlignLeft,
  ObjectsAlignRight,
  ObjectsAlignTop,
  Palette,
  PencilToSquare,
  Picture,
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
import { DiscordIcon, LaserPointerStylusIcon } from "@shared/ui/icons";
import { ColorSwatchPicker } from "@shared/ui/ColorSwatchPicker";
import { Slider } from "@shared/ui/slider";
import { Switch } from "@shared/ui/switch";
import { ThemeDialog } from "@app/theme/themeDialog";
import type { ExportImageFormat } from "@features/workspace/exportImage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/select";

interface MenuBarProps {
  scene: Scene;
  locale: LocaleCode;
  messages: LocaleMessages;
  setLocale: Dispatch<SetStateAction<LocaleCode>>;
  setScene: Dispatch<SetStateAction<Scene>>;
  setSceneWithoutHistory: Dispatch<SetStateAction<Scene>>;
  onExportProject: () => void;
  onExportImage: (options: {
    format: ExportImageFormat;
    qualityScale: number;
    transparentBackground: boolean;
    padding: number;
  }) => Promise<void>;
  onOpenProject: (file: File) => Promise<void>;
}

export const MenuBar = ({
  scene,
  locale,
  messages,
  setLocale,
  setScene,
  setSceneWithoutHistory,
  onExportProject,
  onExportImage,
  onOpenProject,
}: MenuBarProps) => {
  const [isThemeDialogOpen, setIsThemeDialogOpen] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportImageFormat>("png");
  const [exportQuality, setExportQuality] = useState(2);
  const [exportPadding, setExportPadding] = useState(24);
  const [exportTransparentBackground, setExportTransparentBackground] =
    useState(false);
  const [isLaserPointerOpen, setIsLaserPointerOpen] = useState(false);
  const [isOpenProjectConfirmOpen, setIsOpenProjectConfirmOpen] =
    useState(false);
  const [pendingProjectFile, setPendingProjectFile] = useState<File | null>(
    null,
  );
  const [laserSettings, setLaserSettings] = useState(
    scene.settings.laserSettings,
  );
  const projectInputRef = useRef<HTMLInputElement | null>(null);
  const hasElements = scene.elements.length > 0;
  const selectedCount =
    scene.selectedIds.length > 0
      ? scene.selectedIds.length
      : scene.selectedId
        ? 1
        : 0;
  const hasSelection = selectedCount > 0;

  const handleLaserDialogOpen = (open: boolean) => {
    setIsLaserPointerOpen(open);
    if (open) {
      setLaserSettings(scene.settings.laserSettings);
    }
  };

  const handleLaserSave = () => {
    setSceneWithoutHistory((currentScene) =>
      updateSceneSettings(currentScene, {
        laserSettings: laserSettings,
      }),
    );
    setIsLaserPointerOpen(false);
  };

  const handleLaserReset = () => {
    setLaserSettings({
      lifetime: 600,
      baseWidth: 11,
      shadow: false,
      minWidth: 0.3,
      color: "#FF1A28",
    });
  };

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

  const applyOpenProject = useCallback(
    async (file: File) => {
      try {
        await onOpenProject(file);
      } catch {
        window.alert(messages.dialogs.openProject.invalidFile);
      }
    },
    [messages.dialogs.openProject.invalidFile, onOpenProject],
  );

  const handleOpenProjectFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      event.currentTarget.value = "";
      if (!file) {
        return;
      }

      if (!file.name.toLowerCase().endsWith(".drawo")) {
        window.alert(messages.dialogs.openProject.invalidExtension);
        return;
      }

      if (hasElements) {
        setPendingProjectFile(file);
        setIsOpenProjectConfirmOpen(true);
        return;
      }

      void applyOpenProject(file);
    },
    [
      applyOpenProject,
      hasElements,
      messages.dialogs.openProject.invalidExtension,
    ],
  );

  const handleConfirmOpenProject = useCallback(() => {
    if (!pendingProjectFile) {
      setIsOpenProjectConfirmOpen(false);
      return;
    }

    const nextFile = pendingProjectFile;
    setPendingProjectFile(null);
    setIsOpenProjectConfirmOpen(false);
    void applyOpenProject(nextFile);
  }, [applyOpenProject, pendingProjectFile]);

  const handleExportImage = useCallback(async () => {
    if (isExportingImage) {
      return;
    }

    setIsExportingImage(true);

    try {
      await onExportImage({
        format: exportFormat,
        qualityScale: exportQuality,
        transparentBackground: exportTransparentBackground,
        padding: exportPadding,
      });
      setIsExportDialogOpen(false);
    } catch {
      window.alert(messages.dialogs.exportImage.genericError);
    } finally {
      setIsExportingImage(false);
    }
  }, [
    exportFormat,
    exportPadding,
    exportQuality,
    exportTransparentBackground,
    isExportingImage,
    messages.dialogs.exportImage.genericError,
    onExportImage,
  ]);

  return (
    <div className="settings-bar">
      <input
        ref={projectInputRef}
        type="file"
        accept=".drawo"
        hidden
        onChange={handleOpenProjectFileChange}
      />
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
                onClick={() => {
                  projectInputRef.current?.click();
                }}
              >
                <FolderOpen /> {messages.menu.openProject}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportProject}>
                <ArrowDownToSquare /> {messages.menu.saveProject}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsExportDialogOpen(true)}
                disabled={!hasElements}
              >
                <Picture /> {messages.menu.exportProject}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
                  setSceneWithoutHistory((currentScene) =>
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

                      setSceneWithoutHistory((currentScene) =>
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
                  setSceneWithoutHistory((currentScene) =>
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
                  setSceneWithoutHistory((currentScene) =>
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
                  setSceneWithoutHistory((currentScene) =>
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
                <ObjectsAlignRight />
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
                <ObjectsAlignCenterVertical />
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
          <DropdownMenuItem
            onClick={() => {
              window.open("https://github.com/drawo-app/drawo", "_blank");
            }}
          >
            <LogoGithub /> Github
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <DiscordIcon /> Discord
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              window.open("https://buymeacoffee.com/pico190_", "_blank");
            }}
          >
            <CrownDiamond /> {messages.menu.donate}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/*
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <BucketPaint />
              {messages.menu.theme}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={`${scene.settings.colorScheme}-${scene.settings.theme === "dark" ? "dark" : "light"}`}
                onValueChange={(value) => {
                  const lastDashIndex = value.lastIndexOf("-");
                  if (lastDashIndex <= 0) {
                    return;
                  }

                  const colorScheme = value.slice(
                    0,
                    lastDashIndex,
                  ) as Scene["settings"]["colorScheme"];
                  const theme = value.slice(lastDashIndex + 1);
                  if (theme !== "light" && theme !== "dark") {
                    return;
                  }

                  setSceneWithoutHistory((currentScene) =>
                    updateSceneSettings(currentScene, {
                      colorScheme,
                      theme,
                    }),
                  );
                }}
              >
                <DropdownMenuRadioItem value="drawo-light">
                  Drawo Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="catppuccin-light">
                  Catppuccin Latte
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="nord-light">
                  Nord Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="solarized-light">
                  Solarized Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="gruvbox-light">
                  Gruvbox Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="tokyonight-light">
                  Tokyo Night Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="rosepine-light">
                  Rose Pine Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="everforest-light">
                  Everforest Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="kanagawa-light">
                  Kanagawa Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dracula-light">
                  Dracula Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="one-light">
                  One Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="ayu-light">
                  Ayu Light
                </DropdownMenuRadioItem>
                <DropdownMenuSeparator />
                <DropdownMenuRadioItem value="drawo-dark">
                  Drawo Dark
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="catppuccin-dark">
                  Catppuccin Mocha
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="nord-dark">
                  Nord Dark
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="solarized-dark">
                  Solarized Dark
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="gruvbox-dark">
                  Gruvbox Dark
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="tokyonight-dark">
                  Tokyo Night Dark
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="rosepine-dark">
                  Rose Pine Dark
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="everforest-dark">
                  Everforest Dark
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="kanagawa-dark">
                  Kanagawa Dark
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dracula-dark">
                  Dracula Dark
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="one-dark">
                  One Dark
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="ayu-dark">
                  Ayu Dark
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>*/}
          <DropdownMenuItem
            onClick={() => {
              setIsThemeDialogOpen(true);
            }}
          >
            <Palette />
            {messages.menu.themes}
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Gear />
              {messages.menu.settings}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuCheckboxItem
                checked={scene.settings.snapToGrid}
                onClick={() => {
                  setSceneWithoutHistory((currentScene) =>
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
                  setSceneWithoutHistory((currentScene) =>
                    updateSceneSettings(currentScene, {
                      smartGuides: !currentScene.settings.smartGuides,
                    }),
                  );
                }}
              >
                <Route /> {messages.menu.smartGuides}
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
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
                  handleLaserDialogOpen(true);
                }}
              >
                <LaserPointerStylusIcon /> {messages.dialogs.laserCanvas.label}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isLaserPointerOpen} onOpenChange={handleLaserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{messages.dialogs.laserCanvas.title}</DialogTitle>
            <DialogDescription>
              {messages.dialogs.laserCanvas.description}
            </DialogDescription>
          </DialogHeader>
          <p className="label">{messages.dialogs.laserCanvas.color}</p>
          <div className="colorswatch-dialog">
            <ColorSwatchPicker
              colors={[
                "#FF1A28",
                "#FF7A00",
                "#FFD400",
                "#00E05A",
                "#008CFF",
                "#7c5cff",
                "#FF2BD6",
                "#00E5FF",
              ]}
              currentColor={laserSettings.color}
              uniColor={(color) => color}
              renderItem={({ color, swatch }) => (
                <div
                  key={color}
                  className="drawo-colorselect-item"
                  onPointerDown={() => {
                    setLaserSettings((prev) => ({ ...prev, color }));
                  }}
                >
                  {swatch}
                </div>
              )}
            />
          </div>
          <p className="label">{messages.dialogs.laserCanvas.lifetime}</p>
          <Slider
            value={[laserSettings.lifetime]}
            onValueChange={(val) => {
              setLaserSettings((prev) => ({ ...prev, lifetime: val[0] }));
            }}
            max={2000}
            min={100}
            step={10}
          />
          <p className="label">{messages.dialogs.laserCanvas.baseWidth}</p>
          <Slider
            value={[laserSettings.baseWidth]}
            onValueChange={(val) => {
              setLaserSettings((prev) => ({ ...prev, baseWidth: val[0] }));
            }}
            max={30}
            min={1}
            step={0.5}
          />
          <p className="label">{messages.dialogs.laserCanvas.minWidth}</p>
          <Slider
            value={[laserSettings.minWidth]}
            onValueChange={(val) => {
              setLaserSettings((prev) => ({ ...prev, minWidth: val[0] }));
            }}
            max={5}
            min={0.1}
            step={0.1}
          />
          <div className="drawo-checkbox-section">
            <Switch
              checked={laserSettings.shadow}
              onCheckedChange={(e) => {
                setLaserSettings((prev) => ({
                  ...prev,
                  shadow: e,
                }));
              }}
            />
            <span className="text-flex">
              {messages.dialogs.laserCanvas.enableShadows}{" "}
              <span className="drawo-beta">
                <span>BETA</span>
              </span>
            </span>
          </div>

          <DialogFooter>
            <div className="drawo-dialog-actions drawo-dialog-actions-separated">
              <div className="drawo-dialog-actions-section">
                <button
                  type="button"
                  className="drawo-btn-secondary"
                  onClick={handleLaserReset}
                >
                  {messages.dialogs.laserCanvas.reset}
                </button>
              </div>
              <div className="drawo-dialog-actions-section">
                <DialogClose asChild>
                  <button type="button" className="drawo-btn-secondary">
                    {messages.dialogs.laserCanvas.cancel}
                  </button>
                </DialogClose>
                <button
                  type="button"
                  className="drawo-btn-primary"
                  onClick={handleLaserSave}
                >
                  {messages.dialogs.laserCanvas.save}
                </button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{messages.dialogs.exportImage.title}</DialogTitle>
            <DialogDescription>
              {hasSelection
                ? messages.dialogs.exportImage.descriptionSelection
                : messages.dialogs.exportImage.descriptionAll}
            </DialogDescription>
          </DialogHeader>

          <div className="drawo-export-grid">
            <div className="drawo-export-field">
              <p className="label">{messages.dialogs.exportImage.format}</p>
              <Select
                value={exportFormat}
                onValueChange={(nextValue) => {
                  if (
                    nextValue === "png" ||
                    nextValue === "jpg" ||
                    nextValue === "svg" ||
                    nextValue === "pdf"
                  ) {
                    setExportFormat(nextValue);
                  }
                }}
              >
                <SelectTrigger className="drawo-select-trigger">
                  <SelectValue
                    placeholder={messages.dialogs.exportImage.format}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="jpg">JPG</SelectItem>
                  <SelectItem value="svg">SVG</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="drawo-export-field">
              <p className="label">
                {messages.dialogs.exportImage.quality} ({exportQuality}x)
              </p>
              <Slider
                value={[exportQuality]}
                min={1}
                max={4}
                step={1}
                onValueChange={(value) => {
                  setExportQuality(value[0]);
                }}
              />
            </div>

            <div className="drawo-export-field">
              <p className="label">
                {messages.dialogs.exportImage.padding} ({exportPadding}px)
              </p>
              <Slider
                value={[exportPadding]}
                min={0}
                max={96}
                step={2}
                onValueChange={(value) => {
                  setExportPadding(value[0]);
                }}
              />
            </div>
          </div>

          <div className="drawo-checkbox-section">
            <Switch
              disabled={exportFormat === "jpg"}
              checked={
                exportFormat === "jpg" ? false : exportTransparentBackground
              }
              onCheckedChange={(value) => {
                setExportTransparentBackground(value);
              }}
            />
            <span className="text-flex">
              {messages.dialogs.exportImage.transparentBackground}
            </span>
          </div>

          {exportFormat === "jpg" && (
            <p className="label drawo-export-note">
              {messages.dialogs.exportImage.jpgNoTransparency}
            </p>
          )}

          <DialogFooter>
            <div className="drawo-dialog-actions">
              <DialogClose asChild>
                <button type="button" className="drawo-btn-secondary">
                  {messages.dialogs.exportImage.cancel}
                </button>
              </DialogClose>
              <button
                type="button"
                className="drawo-btn-primary"
                onClick={() => {
                  void handleExportImage();
                }}
                disabled={isExportingImage}
              >
                {isExportingImage
                  ? messages.dialogs.exportImage.exporting
                  : messages.dialogs.exportImage.export}
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ThemeDialog
        isOpen={isThemeDialogOpen}
        onOpenChange={setIsThemeDialogOpen}
        currentTheme={`${scene.settings.colorScheme}-${scene.settings.theme === "dark" ? "dark" : "light"}`}
        messages={messages}
        setTheme={(theme) => {
          const separatorIndex = theme.lastIndexOf("-");
          if (separatorIndex === -1) {
            return;
          }

          const colorScheme = theme.slice(
            0,
            separatorIndex,
          ) as Scene["settings"]["colorScheme"];
          const mode = theme.slice(separatorIndex + 1);
          if (mode !== "light" && mode !== "dark") {
            return;
          }

          setSceneWithoutHistory((currentScene) =>
            updateSceneSettings(currentScene, {
              colorScheme,
              theme: mode,
            }),
          );
        }}
      />
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
      <Dialog
        open={isOpenProjectConfirmOpen}
        onOpenChange={setIsOpenProjectConfirmOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{messages.dialogs.openProject.title}</DialogTitle>
            <DialogDescription>
              {messages.dialogs.openProject.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="drawo-dialog-actions">
              <DialogClose asChild>
                <button
                  type="button"
                  className="drawo-btn-secondary"
                  onClick={() => {
                    setPendingProjectFile(null);
                  }}
                >
                  {messages.dialogs.openProject.cancel}
                </button>
              </DialogClose>
              <button
                type="button"
                className="drawo-btn-danger"
                onClick={handleConfirmOpenProject}
              >
                {messages.dialogs.openProject.confirm}
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
