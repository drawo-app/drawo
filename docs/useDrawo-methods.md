# useDrawo Methods Guide

This document describes the new action methods exposed directly by `useDrawo`.

## Why these methods

`useDrawo` already exposes raw state and setters. The methods below expose the most common workspace actions as stable, typed helpers so you don't have to call internal `handlers.*` directly.

## Import

```tsx
import { useDrawo } from "@drawo-app/drawo";
```

## File methods

### `onOpenProject(file: File): Promise<void>`

Opens a `.drawo` project file.

- If you passed `onOpenProject` as a prop to `<Drawo />`, that callback is called.
- Otherwise Drawo parses the file, restores scene/settings/locale/timer, persists it, and reloads.

Example:

```tsx
function OpenButton() {
  const { onOpenProject } = useDrawo();

  return (
    <input
      type="file"
      accept=".drawo"
      onChange={async (event) => {
        const file = event.target.files?.[0];
        if (file) {
          await onOpenProject(file);
        }
      }}
    />
  );
}
```

### `onExportProject(): Promise<void>`

Exports the current project to `.drawo`.

### `onExportImage(options): Promise<void>`

Exports the current scene as image/PDF.

```ts
onExportImage({
  format: "png" | "jpg" | "svg" | "pdf",
  qualityScale: number,
  transparentBackground: boolean,
  padding: number,
});
```

## Zoom methods

- `onZoomIn(): void`
- `onZoomOut(): void`
- `onZoomReset(): void`

These mirror toolbar zoom behavior and honor the optional `<Drawo />` props (`onZoomIn`, `onZoomOut`, `onZoomReset`) when provided.

## Selection and clipboard methods

- `onCopySelection(): void`
- `onCutSelection(): void`
- `onPasteAt(x: number, y: number): void`
- `onDuplicateSelection(): void`
- `onDeleteSelection(): void`

## Arrange and group methods

### `onReorderSelection(direction): void`

```ts
direction: "forward" | "backward" | "front" | "back"
```

### Grouping and transforms

- `onGroupSelection(): void`
- `onUngroupSelection(): void`
- `onFlipSelection(axis: "horizontal" | "vertical"): void`
- `onSetRectangleBorderRadius(ids: string[], borderRadius: number): void`

## Focus and insertion methods

- `onSelectGroupForElement(id: string): void`
- `onFocusElement(id: string): void`
- `onInsertImageFiles(files: File[], anchor?: { x: number; y: number }): Promise<void>`
- `onInsertLibrarySvg(asset: LibrarySvgAsset): void`

`onFocusElement` selects the element and animates camera focus.

## Full example

```tsx
import { Drawo, useDrawo } from "@drawo-app/drawo";

function WorkspaceActions() {
  const {
    canUndo,
    canRedo,
    undo,
    redo,
    onOpenProject,
    onExportProject,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    onDuplicateSelection,
    onDeleteSelection,
  } = useDrawo();

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
      <button onClick={onZoomIn}>+</button>
      <button onClick={onZoomOut}>-</button>
      <button onClick={onZoomReset}>100%</button>
      <button onClick={onDuplicateSelection}>Duplicate</button>
      <button onClick={onDeleteSelection}>Delete</button>
      <button onClick={() => void onExportProject()}>Export .drawo</button>
      <input
        type="file"
        accept=".drawo"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void onOpenProject(file);
          }
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <Drawo>
      <Drawo.TopBar rightAfter={<WorkspaceActions />} />
    </Drawo>
  );
}
```

## Backward compatibility

- Existing `useDrawo` state fields and setters are unchanged.
- `handlers` is still available for advanced/internal use.
- New methods are typed aliases over internal `handle*` actions.
