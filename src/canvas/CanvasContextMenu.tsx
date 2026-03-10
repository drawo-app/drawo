import type { ReactNode } from "react";
import {
  ArrowShapeDown,
  ArrowShapeDownToLine,
  ArrowShapeUp,
  ArrowShapeUpToLine,
  Copy,
  CopyPlus,
  Cubes3,
  Layers,
  Scissors,
  Sticker,
  TrashBin,
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

interface CanvasContextMenuProps {
  children: ReactNode;
  hasSelection: boolean;
  hasElements: boolean;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSelectAll: () => void;
  onMoveForward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onMoveBackward: () => void;
}

export const CanvasContextMenu = ({
  children,
  hasSelection,
  hasElements,
  onCut,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
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
              Cortar
            </ContextMenuItem>
            <ContextMenuItem onClick={onCopy}>
              <Copy />
              Copiar
            </ContextMenuItem>
          </>
        )}
        <ContextMenuItem onClick={onPaste}>
          <Sticker />
          Pegar
        </ContextMenuItem>

        {hasSelection && (
          <>
            <ContextMenuItem onClick={onDuplicate}>
              <CopyPlus />
              Duplicar
            </ContextMenuItem>
            <ContextMenuItem onClick={onDelete} variant="destructive">
              <TrashBin />
              Eliminar
            </ContextMenuItem>
          </>
        )}

        {hasSelection && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Layers />
                Capas
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem onClick={onMoveForward}>
                  <ArrowShapeUp />
                  Mover hacia delante
                </ContextMenuItem>
                <ContextMenuItem onClick={onBringToFront}>
                  <ArrowShapeUpToLine />
                  Traer al frente
                </ContextMenuItem>
                <ContextMenuItem onClick={onSendToBack}>
                  <ArrowShapeDownToLine />
                  Pasar al fondo
                </ContextMenuItem>
                <ContextMenuItem onClick={onMoveBackward}>
                  <ArrowShapeDown />
                  Mover hacia atrás
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}

        <ContextMenuSeparator />
        <ContextMenuItem disabled={!hasElements} onClick={onSelectAll}>
          <Cubes3 />
          Seleccionar todo
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
