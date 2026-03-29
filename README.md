<div align="center">

# 🎨 Drawo

### Open-source visual whiteboard built with React + TypeScript + Canvas

<p>
  <img alt="Version" src="https://img.shields.io/badge/version-1.1.3-0ea5e9" />
  <img alt="Status" src="https://img.shields.io/badge/status-active-22c55e" />
  <img alt="Stack" src="https://img.shields.io/badge/stack-React%2019%20%2B%20TypeScript%20%2B%20Vite-111827" />
  <img alt="Node" src="https://img.shields.io/badge/node-%3E%3D20.18.0-16a34a" />
</p>

<p><strong>Drawo</strong> is a whiteboard-style drawing and diagramming app focused on speed, UX, and smooth visual editing.</p>

<p>
  <img src="assets/changelog/1.1.2.png" alt="Drawo preview" width="86%" />
</p>

</div>

## ✨ What is Drawo
Drawo is an interactive canvas designed for fast sketches, diagrams, and visual explanations. The project already includes drawing tools, shapes, rich text, images, grouping, advanced shortcuts, and export flows.

Everything runs client-side and stores project state locally in the browser so you can continue where you left off.

## 🚀 Current features (v1.1.3)
- Infinite canvas with camera controls (`pan`, `zoom`, centering, and smooth navigation).
- Tools: selection, hand, text, rectangle, circle, line/arrow, pen, quill, marker, laser, and image.
- Advanced element editing (rotation, `resize`, opacity, alignment, and layer ordering).
- Grouping and ungrouping elements.
- Fast duplication and keyboard movement.
- Rich text powered by `Slate` (bold, italic, strikethrough, size, color, alignment).
- Multi-selection + smart guides + snap to grid.
- Special modes: `Zen Mode` and `Presentation Mode`.
- Image export (`png`, `jpg`, `svg`, `pdf`) with padding, quality, and transparency options.
- Save and open `.drawo` project files.
- Image support through input/drag-and-drop with optimization.
- Built-in internationalization (`es_ES`, `en_US`).
- Wide theme set (Drawo, Catppuccin, Nord, Solarized, Gruvbox, TokyoNight, Rose Pine, Everforest, Kanagawa, Dracula, One, Ayu).

## 🧱 Tech stack
- `React 19`
- `TypeScript 5`
- `Vite 7`
- `Slate` for rich-text editing
- `Radix UI` + icon libraries
- Canvas 2D API for rendering and interaction

## ⚙️ Run locally
### Requirements
- `Node.js >= 20.18.0`
- `pnpm` recommended

### Install
```bash
pnpm install
```

### Development
```bash
pnpm dev
```

### Production build
```bash
pnpm build
```

### Build preview
```bash
pnpm preview
```

## ⌨️ Useful shortcuts
- `V`: selection
- `H`: hand (pan)
- `1`: text
- `2`: rectangle
- `3`: circle
- `4`: draw
- `K`: laser
- `Ctrl/Cmd + Z`: undo
- `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y`: redo
- `Ctrl/Cmd + A`: select all
- `Ctrl/Cmd + D`: duplicate
- `Ctrl/Cmd + G`: group
- `Ctrl/Cmd + Shift + G`: ungroup
- `Ctrl/Cmd + +/-/0`: zoom in/out/reset
- `Alt + Z`: toggle zen mode
- `Alt + R`: toggle presentation mode
- `Delete/Backspace`: delete selection

## 🗂️ Project structure
```text
src/
  app/
    state/        # reducer, undo/redo history, local persistence
    theme/        # visual tokens and color schemes
    App.tsx       # main app composition
  core/
    elements/     # models and utilities per element type
    scene/        # scene logic (selection, grouping, transforms)
  features/
    canvas/       # canvas rendering and interaction
    workspace/    # toolbar, menu, export, shortcuts
    music/        # music bar
    timer/        # integrated countdown
  shared/
    i18n/         # localization
    ui/           # reusable UI components
```

## 🛣️ Roadmap
### v1.x (current)
- Keep improving stability, stroke performance, and editing UX.
- Improve export flows and visual consistency across themes.
- Continue internal refactoring to make extension easier.

### v2.0 (main goal)
In `v2.0`, Drawo will evolve from a standalone app into an **npm library** for React.

Product goal:
- Expose Drawo as a **reusable and customizable React component**.
- Enable embedded integrations in external products (SaaS apps, dashboards, LMS, docs platforms, etc.).

Planned technical direction:
- Publish to npm with a stable API.
- Main component format like `<DrawoCanvas />`.
- Prop-based configuration for theme, locale, available tools, shortcuts, and canvas behavior.
- Hooks/events for syncing external state (`onChange`, import/export, selection, etc.).
- Styles and tokens for visual customization without forks.

## 📦 Release status
Current version: **1.1.3** (see [CHANGELOG](./CHANGELOG.md)).

## 🤝 Contributing
If you want to contribute:
1. Fork the repo.
2. Create a feature/fix branch.
3. Open a PR with a clear description of what changed and why.

## ⭐ Final note
If you like Drawo, star the repo and share it.  
The `v2.0` goal is to let you drop it into your React app as a native product building block.
