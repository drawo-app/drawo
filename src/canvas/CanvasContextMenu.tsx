import type { ReactNode } from "react";
import {
  ArrowShapeDown,
  ArrowShapeDownToLine,
  ArrowShapeUp,
  ArrowShapeUpToLine,
  Circles5Random,
  Copy,
  CopyPlus,
  Cubes3,
  Layers,
  Scissors,
  Sticker,
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
} from "../components/context-menu";
import type { LocaleMessages } from "../i18n";
import { Ctrl, Shift } from "../app/utils/macShortcuts";

interface CanvasContextMenuProps {
  children: ReactNode;
  hasSelection: boolean;
  hasMultipleSelection: boolean;
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
}

export const CanvasContextMenu = ({
  children,
  hasSelection,
  hasMultipleSelection,
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
}: CanvasContextMenuProps) => {
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
                <ContextMenuItem onClick={onMoveForward}>
                  <ArrowShapeUp />
                  {localeMessages.contextMenu.layers.bringForward}
                </ContextMenuItem>
                <ContextMenuItem onClick={onBringToFront}>
                  <ArrowShapeUpToLine />
                  {localeMessages.contextMenu.layers.bringToFront}
                </ContextMenuItem>
                <ContextMenuItem onClick={onSendToBack}>
                  <ArrowShapeDownToLine />
                  {localeMessages.contextMenu.layers.sendToBack}
                </ContextMenuItem>
                <ContextMenuItem onClick={onMoveBackward}>
                  <ArrowShapeDown />
                  {localeMessages.contextMenu.layers.sendBackward}
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
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
