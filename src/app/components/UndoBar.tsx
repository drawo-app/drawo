import { ArrowUturnCcwLeft, ArrowUturnCwRight } from "@gravity-ui/icons";

interface UndoBarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function UndoBar({ canUndo, canRedo, onUndo, onRedo }: UndoBarProps) {
  return (
    <div className="undo-bar bottompanel-bar">
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo"
      >
        <ArrowUturnCcwLeft />
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="Redo"
      >
        <ArrowUturnCwRight />
      </button>
    </div>
  );
}
