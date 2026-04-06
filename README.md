<div align="center">

# -- FULL DOCUMENTATION SOON --

<hr>

# 🎨 Drawo

### Open-source visual whiteboard **component** for React

<p>
  <img alt="version" src="https://img.shields.io/badge/version-2.0.0-7c5cff" />
  <img alt="Status" src="https://img.shields.io/badge/status-stable-22c55e" />
  <img alt="Stack" src="https://img.shields.io/badge/stack-React%2019%20%2B%20TypeScript%20%2B%20Canvas-111827" />
  <img alt="npm" src="https://img.shields.io/badge/npm-install%20drawo-cc3534" />
</p>

<p><strong>Drawo</strong> is a beautiful, customizable whiteboard component you can drop into any React app.</p>

</div>

## ✨ What is Drawo

Drawo is an interactive canvas for fast sketches, diagrams, and visual explanations — now as a **React component library**. Install it, render `<Drawo />`, and you're done.

Everything runs client-side with local browser storage.

## 🚀 Features

- **Infinite canvas** with pan, zoom, and smooth navigation
- **Drawing tools**: pen, quill (speed-sensitive brush), marker
- **Shapes**: rectangle, circle, line/arrow
- **Rich text** powered by Slate (bold, italic, strikethrough, size, color, alignment)
- **Image support** via input and drag-and-drop
- **Grouping**, multi-selection, smart guides, snap to grid
- **Undo/Redo** with full history
- **Export**: png, jpg, svg, pdf with quality controls
- **Project files**: save/open `.drawo` files
- **22 themes**: Drawo, Catppuccin, Nord, Solarized, Gruvbox, Tokyo Night, Rose Pine, Everforest, Kanagawa, Dracula, One, Ayu
- **Internationalization**: English & Spanish
- **Special modes**: Zen Mode, Presentation Mode
- **Optional**: Timer, MusicBar, Search & Library sidebar

## 📦 Installation

```bash
npm install drawo
```

**Peer dependencies** (already in most React projects):

```bash
npm install react@^19 react-dom@^19
```

## 🚀 Quick Start

```tsx
import { Drawo } from "drawo";

function App() {
  return <Drawo />;
}
```

That's it. Full whiteboard, zero config.

## 🎨 Customization

### Theme & Locale

```tsx
<Drawo theme="catppuccin-mocha" locale="en_US" />
```

### Compound Components

Replace any part of the UI:

```tsx
import { Drawo, DrawoTopBar, DrawoCanvas, Timer } from "drawo";

function App() {
  return (
    <Drawo>
      <DrawoTopBar>
        <MyCustomHeader />
        <Timer />
      </DrawoTopBar>
      <DrawoCanvas />
    </Drawo>
  );
}
```

### useDrawo Hook

Access Drawo state from your components:

```tsx
import { useDrawo } from "drawo";

function ElementCounter() {
  const { scene, undo, redo, canUndo, canRedo } = useDrawo();
  return (
    <div>
      <p>{scene.elements.length} elements</p>
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
    </div>
  );
}
```

## 📖 Full Documentation

See the [docs](./docs/README.md) for:

- Complete API reference
- All props and configuration options
- Theme system details
- Internationalization
- Migration guide from v1.x
- Advanced examples

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `V` | Selection tool |
| `H` | Hand (pan) tool |
| `1` | Text tool |
| `2` | Rectangle tool |
| `3` | Circle tool |
| `4` | Draw tool |
| `K` | Laser tool |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` / `Ctrl/Cmd + Y` | Redo |
| `Ctrl/Cmd + A` | Select all |
| `Ctrl/Cmd + D` | Duplicate |
| `Ctrl/Cmd + G` | Group |
| `Ctrl/Cmd + Shift + G` | Ungroup |
| `Ctrl/Cmd + +/-/0` | Zoom in/out/reset |
| `Alt + Z` | Toggle Zen Mode |
| `Alt + R` | Toggle Presentation Mode |
| `Delete/Backspace` | Delete selection |

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Run dev server (demo app)
pnpm dev

# Build the library for npm
pnpm build:lib

# Build the demo app for production
pnpm build
```

## 📦 Package Info

| | |
|---|---|
| **Name** | `drawo` |
| **Version** | 2.0.0 |
| **License** | MIT |
| **Bundle** | ~2.6MB (637KB gzipped) |
| **Peer Deps** | React 19+, React DOM 19+ |
| **TypeScript** | Full type definitions |

## 📄 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the full release history.

## 🤝 Contributing

1. Fork the repo
2. Create a feature/fix branch
3. Open a PR with a clear description

## ⭐ Support

If you like Drawo, star the repo and share it. Drawo v2 lets you drop a full-featured whiteboard into any React app as a native building block.
