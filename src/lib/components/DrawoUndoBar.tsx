import { useDrawo } from "../context";
import { UndoBar } from "@features/workspace/components/UndoBar";

export function DrawoUndoBar() {
  const ctx = useDrawo();
  const { canUndo, canRedo, undo, redo } = ctx;

  return (
    <div className="drawo-bottomleft-bar">
      <UndoBar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />
    </div>
  );
}
