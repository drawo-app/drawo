import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Circles5Random,
  Copy,
  CopyPlus,
  Cubes3,
  Droplet,
  Layers,
  Scissors,
  Sticker,
  TrapezoidLeftLineHorizontal,
  TrapezoidUpLineVertical,
  TrashBin,
  VectorSquare,
} from "@gravity-ui/icons";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@shared/ui/context-menu";
import type { LocaleMessages } from "@shared/i18n";
import { Ctrl, Shift } from "@shared/lib/platform/macShortcuts";
import {
  LayerBringForward,
  LayerBringToFront,
  LayerSendBackward,
  LayerSendToBack,
} from "@shared/ui/icons";
import { Slider } from "@shared/ui/slider";

export type CanvasContextMenuSelectionType = "draw" | "image" | "multiple";

interface CanvasContextMenuProps {
  children: ReactNode;
  hasSelection: boolean;
  canFlipSelection: boolean;
  selectionType: CanvasContextMenuSelectionType;
  selectionOpacity: number | null;
  localeMessages: LocaleMessages;
  hasElements: boolean;
  canUngroupSelection: boolean;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onSelectAll: () => void;
  onMoveForward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onMoveBackward: () => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onSelectionOpacityChange: (opacity: number) => void;
}

export const CanvasContextMenu = ({
  children,
  hasSelection,
  canFlipSelection,
  selectionType,
  selectionOpacity,
  hasElements,
  localeMessages,
  canUngroupSelection,
  onCut,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
  onGroup,
  onUngroup,
  onSelectAll,
  onMoveForward,
  onBringToFront,
  onSendToBack,
  onMoveBackward,
  onFlipHorizontal,
  onFlipVertical,
  onSelectionOpacityChange,
}: CanvasContextMenuProps) => {
  const hasMultipleSelection = hasSelection && selectionType === "multiple";
  const normalizedSelectionOpacity = useMemo(() => {
    if (typeof selectionOpacity !== "number" || !Number.isFinite(selectionOpacity)) {
      return 100;
    }

    return Math.max(0, Math.min(100, Math.round(selectionOpacity)));
  }, [selectionOpacity]);
  const [opacityValue, setOpacityValue] = useState(normalizedSelectionOpacity);
  const [opacityInput, setOpacityInput] = useState(
    String(normalizedSelectionOpacity),
  );

  useEffect(() => {
    setOpacityValue(normalizedSelectionOpacity);
    setOpacityInput(String(normalizedSelectionOpacity));
  }, [normalizedSelectionOpacity, hasSelection]);

  const applyOpacity = (nextOpacity: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(nextOpacity)));
    setOpacityValue(clamped);
    setOpacityInput(String(clamped));
    onSelectionOpacityChange(clamped);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {hasSelection && (
          <>
            <ContextMenuItem onClick={onCut}>
              <Scissors />
              {localeMessages.contextMenu.cut}
              <span className="drawo-keybind">
                <span>{Ctrl()}</span> + <span>X</span>
              </span>
            </ContextMenuItem>
            <ContextMenuItem onClick={onCopy}>
              <Copy />
              {localeMessages.contextMenu.copy}
              <span className="drawo-keybind">
                <span>{Ctrl()}</span> + <span>C</span>
              </span>
            </ContextMenuItem>
          </>
        )}
        <ContextMenuItem onClick={onPaste}>
          <Sticker />
          {localeMessages.contextMenu.paste}
          <span className="drawo-keybind">
            <span>{Ctrl()}</span> + <span>V</span>
          </span>
        </ContextMenuItem>

        {hasSelection && (
          <>
            <ContextMenuItem onClick={onDuplicate}>
              <CopyPlus />
              {localeMessages.contextMenu.duplicate}
              <span className="drawo-keybind">
                <span>{Ctrl()}</span>+<span>D</span>
              </span>
            </ContextMenuItem>
            <ContextMenuItem onClick={onDelete} variant="destructive">
              <TrashBin />
              {localeMessages.contextMenu.delete}
              <span className="drawo-keybind">
                <span>Del</span>
              </span>
            </ContextMenuItem>
          </>
        )}

        {(hasMultipleSelection || canUngroupSelection || hasSelection) && (
          <ContextMenuSeparator />
        )}
        {(hasMultipleSelection || canUngroupSelection) && (
          <>
            {hasMultipleSelection && (
              <ContextMenuItem onClick={onGroup}>
                <VectorSquare />
                {localeMessages.contextMenu.group}
                <span className="drawo-keybind">
                  <span>{Ctrl()}</span>+<span>G</span>
                </span>
              </ContextMenuItem>
            )}
            {canUngroupSelection && (
              <ContextMenuItem onClick={onUngroup}>
                <Circles5Random />
                {localeMessages.contextMenu.ungroup}
                <span className="drawo-keybind">
                  <span>{Ctrl()}</span>+<span>{Shift()}</span>+<span>G</span>
                </span>
              </ContextMenuItem>
            )}
          </>
        )}

        {hasSelection && (
          <>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Layers />
                {localeMessages.contextMenu.layers.text}
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem onClick={onBringToFront}>
                  <LayerBringToFront />
                  {localeMessages.contextMenu.layers.bringToFront}
                </ContextMenuItem>
                <ContextMenuItem onClick={onMoveForward}>
                  <LayerBringForward />
                  {localeMessages.contextMenu.layers.bringForward}
                </ContextMenuItem>
                <ContextMenuItem onClick={onSendToBack}>
                  <LayerSendToBack />
                  {localeMessages.contextMenu.layers.sendToBack}
                </ContextMenuItem>
                <ContextMenuItem onClick={onMoveBackward}>
                  <LayerSendBackward />
                  {localeMessages.contextMenu.layers.sendBackward}
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Droplet />
                {localeMessages.selectionBar.opacity}...
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="drawo-contextmenu-opacity-subcontent">
                <div
                  className="drawo-contextmenu-opacity-popover"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="drawo-contextmenu-opacity-header">
                    <span>{localeMessages.selectionBar.opacity}</span>
                    <div className="drawo-contextmenu-opacity-input-wrap">
                      <input
                        className="drawo-input drawo-numberinput drawo-contextmenu-opacity-input"
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={opacityInput}
                        onChange={(event) => {
                          const sanitized = event.target.value.replace(
                            /[^0-9]/g,
                            "",
                          );
                          setOpacityInput(sanitized);
                        }}
                        onBlur={() => {
                          const parsed = Number.parseInt(opacityInput, 10);
                          applyOpacity(Number.isFinite(parsed) ? parsed : opacityValue);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            const parsed = Number.parseInt(opacityInput, 10);
                            applyOpacity(
                              Number.isFinite(parsed) ? parsed : opacityValue,
                            );
                            event.currentTarget.blur();
                            return;
                          }

                          if (event.key === "Escape") {
                            setOpacityInput(String(opacityValue));
                            event.currentTarget.blur();
                          }
                        }}
                      />
                      <span className="drawo-contextmenu-opacity-unit">%</span>
                    </div>
                  </div>

                  <Slider
                    className="drawo-contextmenu-opacity-slider"
                    value={[opacityValue]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(value) => {
                      const next = value[0] ?? opacityValue;
                      setOpacityValue(next);
                      setOpacityInput(String(Math.round(next)));
                    }}
                    onValueCommit={(value) => {
                      applyOpacity(value[0] ?? opacityValue);
                    }}
                  />

                </div>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
            <ContextMenuItem
              disabled={!canFlipSelection}
              onClick={onFlipHorizontal}
            >
              <TrapezoidUpLineVertical />
              Voltear horizontalmente
              <span className="drawo-keybind">
                <span>{Shift()}</span>+<span>H</span>
              </span>
            </ContextMenuItem>
            <ContextMenuItem
              disabled={!canFlipSelection}
              onClick={onFlipVertical}
            >
              <TrapezoidLeftLineHorizontal />
              Voltear verticalmente
              <span className="drawo-keybind">
                <span>{Shift()}</span>+<span>V</span>
              </span>
            </ContextMenuItem>
          </>
        )}

        <ContextMenuSeparator />
        <ContextMenuItem disabled={!hasElements} onClick={onSelectAll}>
          <Cubes3 />
          {localeMessages.contextMenu.selectEverything}
          <span className="drawo-keybind">
            <span>{Ctrl()}</span> + <span>A</span>
          </span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
