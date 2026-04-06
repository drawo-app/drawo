# Drawo Documentation

> A beautiful, customizable whiteboard component for React

## Table of Contents

- [Getting Started](#getting-started)
- [Basic Usage](#basic-usage)
- [Customization](#customization)
- [Compound Components](#compound-components)
- [Optional Components](#optional-components)
- [Themes](#themes)
- [Internationalization](#internationalization)
- [useDrawo Hook](#usedrawo-hook)
- [useDrawo Methods Guide](./useDrawo-methods.md)
- [API Reference](#api-reference)
- [Migration Guide](#migration-guide)

---

## Getting Started

### Installation

```bash
npm install @drawo-app/drawo
```

### CSS Import

Drawo includes bundled CSS with themes, base styles, and all UI styling. Import it once in your app:

```tsx
// In your main entry file (e.g., App.tsx, main.tsx)
import "@drawo-app/drawo/styles.css";

// Then use the component
import { Drawo } from "@drawo-app/drawo";

function App() {
  return <Drawo />;
}
```

> **Note:** The CSS import is required for the component to render correctly. This includes all 22 themes, cursors, and UI styles.

### Requirements

- React 19+
- Node.js 20.18+

---

## Basic Usage

The simplest way to use Drawo is to import and render the component:

```tsx
import { Drawo } from "drawo";

function App() {
  return <Drawo />;
}
```

That's it! You now have a fully functional whiteboard with:

- Drawing tools (pen, marker, quill)
- Shapes (rectangles, circles, lines)
- Text editing with rich text support
- Image support
- Undo/Redo
- Zoom controls
- Export/Import projects
- 22 built-in themes
- Timer and MusicBar
- Search & Library sidebar

---

## Customization

### Props

```tsx
<Drawo
  theme="catppuccin-mocha"
  locale="en_US"
  className="my-custom-class"
  style={{ height: "800px" }}
  onSceneChange={(scene) => console.log(scene)}
  onUndo={() => console.log("undo")}
  onRedo={() => console.log("redo")}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `theme` | `string` | `"drawo-light"` | Theme preset name |
| `locale` | `"en_US" \| "es_ES"` | `"es_ES"` | UI language |
| `className` | `string` | `""` | Additional CSS class |
| `style` | `CSSProperties` | `{}` | Inline styles |
| `onSceneChange` | `(scene: Scene) => void` | - | Called when scene changes |
| `onUndo` | `() => void` | - | Override undo behavior |
| `onRedo` | `() => void` | - | Override redo behavior |
| `onZoomIn` | `() => void` | - | Override zoom in behavior |
| `onZoomOut` | `() => void` | - | Override zoom out behavior |
| `onZoomReset` | `() => void` | - | Override zoom reset behavior |
| `onExportProject` | `() => void` | - | Override project export |
| `onExportImage` | `(options) => Promise<void>` | - | Override image export |
| `onOpenProject` | `(file: File) => Promise<void>` | - | Override project open |
| `disablePersistence` | `boolean` | `false` | Disable localStorage persistence |
| `disableKeyboardShortcuts` | `boolean` | `false` | Disable keyboard shortcuts |
| `emptyState` | `DrawoEmptyStateConfig` | See below | Customization for the empty canvas state |

### emptyState Prop

Customize the empty state that appears when the canvas has no elements:

```tsx
<Drawo
  emptyState={{
    enabled: true,
    text: "Start creating!",
    subtitle: "Drop an image here",
    showLogo: true,
    showText: true,
    showSubtitle: true,
    hideDropHint: false,
    style: { opacity: 0.8 },
    className: "my-empty-state",
    render: ({ messages, onInsertImage }) => (
      <div>
        <h2>Custom empty state!</h2>
        <button onClick={onInsertImage}>Add Image</button>
      </div>
    ),
  }}
/>
```

#### DrawoEmptyStateConfig Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Show or hide the empty state |
| `text` | `string` | `"Start drawing"` | Custom main text |
| `subtitle` | `string` | `"Drop an image or select a tool"` | Custom subtitle |
| `render` | `(params) => ReactNode` | - | Full custom render function |
| `style` | `CSSProperties` | - | Custom inline styles |
| `className` | `string` | - | Custom CSS class |
| `showLogo` | `boolean` | `true` | Show/hide the default logo |
| `showText` | `boolean` | `true` | Show/hide the main text |
| `showSubtitle` | `boolean` | `true` | Show/hide the subtitle |
| `hideDropHint` | `boolean` | `false` | Hide the drop hint in subtitle |

The `render` function receives:
- `messages` - Current locale messages
- `onInsertImage` - Callback to open file picker for images

---

## Compound Components

Drawo uses the compound component pattern, allowing you to replace or customize any part of the UI:

```tsx
import { Drawo, DrawoTopBar, DrawoToolBar, DrawoCanvas } from "drawo";

function App() {
  return (
    <Drawo>
      <DrawoTopBar>
        <MyCustomHeader />
      </DrawoTopBar>
      <DrawoToolBar />
      <DrawoCanvas />
    </Drawo>
  );
}
```

### Available Subcomponents

- **`Drawo.TopBar`** — Top bar container. If no children provided, renders the default MenuBar, Timer, MusicBar, and Sidebar launcher.
- **`Drawo.Canvas`** — The main canvas component.
- **`Drawo.ToolBar`** — Bottom toolbar with drawing tools.
- **`Drawo.UndoBar`** — Undo/Redo buttons.
- **`Drawo.ZoomBar`** — Zoom in/out/reset controls.

### Default Layout Behavior

If you don't provide any children, Drawo renders all subcomponents automatically:

```tsx
// This renders the full default UI
<Drawo />

// This is equivalent to:
<Drawo>
  <Drawo.TopBar />
  <Drawo.Canvas />
  <Drawo.ToolBar />
  <Drawo.UndoBar />
  <Drawo.ZoomBar />
</Drawo>
```

---

## Optional Components

### Timer

The Timer component is optional and can be imported separately:

```tsx
import { Drawo, Timer } from "drawo";

<Drawo>
  <Drawo.TopBar>
    <Drawo.MenuBar />
    <Timer />
  </Drawo.TopBar>
</Drawo>;
```

### MusicBar

The MusicBar component provides ambient music playback:

```tsx
import { Drawo, MusicBar } from "drawo";

<Drawo>
  <Drawo.TopBar>
    <Drawo.MenuBar />
    <MusicBar />
  </Drawo.TopBar>
</Drawo>;
```

---

## Themes

Drawo ships with 22 built-in themes (11 light + 11 dark):

### Light Themes

- `drawo-light` (default)
- `catppuccin-latte`
- `nord-light`
- `solarized-light`
- `gruvbox-light`
- `tokyonight-light`
- `rosepine-light`
- `everforest-light`
- `kanagawa-light`
- `dracula-light`
- `one-light`
- `ayu-light`

### Dark Themes

- `drawo-dark`
- `catppuccin-mocha`
- `nord-dark`
- `solarized-dark`
- `gruvbox-dark`
- `tokyonight-dark`
- `rosepine-dark`
- `everforest-dark`
- `kanagawa-dark`
- `dracula-dark`
- `one-dark`
- `ayu-dark`

```tsx
<Drawo theme="catppuccin-mocha" />
```

---

## Internationalization

Drawo supports English and Spanish:

```tsx
// English
<Drawo locale="en_US" />

// Spanish (default)
<Drawo locale="es_ES" />
```

---

## useDrawo Hook

Access Drawo's internal state from your custom components:

```tsx
import { useDrawo } from "drawo";

function MyCustomWidget() {
  const {
    scene,
    resolvedTheme,
    isDarkMode,
    isPresentationMode,
    isZenMode,
    locale,
    messages,
    interactionMode,
    drawingTool,
    openTopbarPanel,
    canUndo,
    canRedo,
    setScene,
    setInteractionMode,
    setDrawingTool,
    setOpenTopbarPanel,
    setLocale,
    undo,
    redo,
    onOpenProject,
    onExportProject,
    onZoomIn,
    onZoomOut,
    onZoomReset,
  } = useDrawo();

  return (
    <div>
      <p>Elements: {scene.elements.length}</p>
      <p>Selected: {scene.selectedIds.length}</p>
      <p>Zoom: {Math.round(scene.camera.zoom * 100)}%</p>
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
      <button onClick={() => onZoomIn()}>Zoom in</button>
      <button onClick={() => onZoomOut()}>Zoom out</button>
      <button onClick={() => onZoomReset()}>Zoom reset</button>
      <button onClick={() => onExportProject()}>Export .drawo</button>
    </div>
  );
}
```

### Context Value Properties

| Property | Type | Description |
|----------|------|-------------|
| `scene` | `Scene` | Current scene state |
| `resolvedTheme` | `ResolvedTheme` | Resolved theme data |
| `isDarkMode` | `boolean` | Whether dark mode is active |
| `isPresentationMode` | `boolean` | Whether presentation mode is active |
| `isZenMode` | `boolean` | Whether zen mode is active |
| `locale` | `LocaleCode` | Current locale |
| `messages` | `LocaleMessages` | Translated UI strings |
| `interactionMode` | `"select" \| "pan"` | Current interaction mode |
| `drawingTool` | `NewElementType \| "laser" \| null` | Active drawing tool |
| `openTopbarPanel` | `"music" \| "timer" \| "sidebar" \| null` | Open topbar panel |
| `canUndo` | `boolean` | Whether undo is available |
| `canRedo` | `boolean` | Whether redo is available |
| `setScene` | `Dispatch<SetStateAction<Scene>>` | Update scene |
| `setInteractionMode` | `Dispatch<SetStateAction<"select" \| "pan">>` | Set interaction mode |
| `setDrawingTool` | `Dispatch<SetStateAction<NewElementType \| "laser" \| null>>` | Set drawing tool |
| `setOpenTopbarPanel` | `Dispatch<SetStateAction<"music" \| "timer" \| "sidebar" \| null>>` | Set open panel |
| `setLocale` | `Dispatch<SetStateAction<LocaleCode>>` | Set locale |
| `undo` | `() => void` | Perform undo |
| `redo` | `() => void` | Perform redo |
| `onOpenProject` | `(file: File) => Promise<void>` | Open/import a `.drawo` file |
| `onExportProject` | `() => Promise<void>` | Export current scene as `.drawo` |
| `onExportImage` | `(options) => Promise<void>` | Export image (`png`, `jpg`, `svg`, `pdf`) |
| `onZoomIn / onZoomOut / onZoomReset` | `() => void` | Programmatic zoom controls |
| `onCopySelection / onCutSelection / onPasteAt` | `() => void` / `(x, y) => void` | Clipboard-style selection actions |
| `onDuplicateSelection / onDeleteSelection` | `() => void` | Duplicate/delete selected elements |
| `onReorderSelection` | `(direction) => void` | Move selection in z-index |
| `onGroupSelection / onUngroupSelection` | `() => void` | Group/ungroup current selection |
| `onFlipSelection` | `(axis) => void` | Flip selected elements horizontally/vertically |
| `onFocusElement` | `(id: string) => void` | Focus camera + selection on an element |
| `onInsertImageFiles` | `(files, anchor?) => Promise<void>` | Insert one or more image files |
| `onInsertLibrarySvg` | `(asset) => void` | Insert a catalog/library SVG asset |
| `onSetRectangleBorderRadius` | `(ids, borderRadius) => void` | Update border radius for rectangle ids |

For full signatures and practical examples, see:

- [useDrawo Methods Guide](./useDrawo-methods.md)

---

## API Reference

### Exports

```tsx
// Main component
import { Drawo } from "drawo";

// Subcomponents
import {
  DrawoTopBar,
  DrawoCanvas,
  DrawoToolBar,
  DrawoUndoBar,
  DrawoZoomBar,
} from "drawo";

// Optional components
import { Timer, MusicBar } from "drawo";

// Internal components (for advanced customization)
import {
  MenuBar,
  ToolBar,
  UndoBar,
  ZoomBar,
  CanvasView,
  CanvasContextMenu,
  CanvasEmptyState,
  SelectionToolbar,
  SelectionTextControls,
  SelectionShapeControls,
  SelectionStrokeControls,
  SelectionImageControls,
  TextEditorOverlay,
  SearchLibrarySidebar,
} from "drawo";

// Hook
import { useDrawo } from "drawo";

// Provider (for manual context setup)
import { DrawoProvider } from "drawo";

// Types
import type {
  DrawoProps,
  DrawoContextValue,
  ResolvedTheme,
  Scene,
  SceneSettings,
  SceneElement,
  NewElementType,
  LocaleCode,
  LocaleMessages,
  ExportImageFormat,
  LibrarySvgAsset,
  LibraryCategoryId,
} from "drawo";
```

---

## Migration Guide

### From v1.x to v2.0

1. **Install as a dependency** instead of running as a standalone app:
   ```bash
   npm install drawo
   ```

2. **Replace your app entry point**:
   ```tsx
   // Before (v1.x)
   import App from "./App";
   <App />;

   // After (v2.0)
   import { Drawo } from "drawo";
   <Drawo />;
   ```

3. **Customize using compound components** instead of modifying the source code.

4. **Install peer dependencies** if you haven't already.

---

## Examples

### Minimal

```tsx
import { Drawo } from "drawo";

function App() {
  return <Drawo />;
}
```

### With Custom Theme

```tsx
import { Drawo } from "drawo";

function App() {
  return <Drawo theme="nord-dark" locale="en_US" />;
}
```

### With Custom TopBar

```tsx
import { Drawo, DrawoTopBar, DrawoCanvas } from "drawo";

function App() {
  return (
    <Drawo>
      <DrawoTopBar>
        <h1>My Whiteboard</h1>
      </DrawoTopBar>
      <DrawoCanvas />
    </Drawo>
  );
}
```

### With Custom Widget

```tsx
import { Drawo, useDrawo } from "drawo";

function ElementCounter() {
  const { scene } = useDrawo();
  return <div>{scene.elements.length} elements</div>;
}

function App() {
  return (
    <Drawo>
      <Drawo.TopBar>
        <ElementCounter />
      </Drawo.TopBar>
    </Drawo>
  );
}
```
