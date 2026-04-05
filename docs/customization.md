# TopBar & MenuBar Customization

> How to customize the top bar and menu without rewriting anything from scratch.

## Table of Contents

- [Overview](#overview)
- [TopBar Customization](#topbar-customization)
  - [Adding buttons alongside defaults](#adding-buttons-alongside-defaults)
  - [Controlling which defaults appear](#controlling-which-defaults-appear)
  - [Fully replacing the right section](#fully-replacing-the-right-section)
  - [Recomposing with default sub-components](#recomposing-with-default-sub-components)
- [MenuBar Customization](#menubar-customization)
  - [Injecting items into existing sections](#injecting-items-into-existing-sections)
  - [Adding custom top-level sections](#adding-custom-top-level-sections)
  - [Adding items before links or after settings](#adding-items-before-links-or-after-settings)
  - [Forwarding MenuBar props from DrawoTopBar](#forwarding-menubar-props-from-drawotopbar)
- [Exported Components Reference](#exported-components-reference)
- [Full Examples](#full-examples)

---

## Overview

Drawo exports **composable default components** so you never have to copy-paste internal UI code just to add a button. The key idea:

- **`DrawoTopBar`** accepts slot props (`rightBefore`, `rightAfter`, etc.) and toggles (`showTimer`, `showMusicBar`, etc.) so yo can inject content alongside the defaults.
- **`MenuBar`** accepts slot props (`extraFileItems`, `extraMenuSections`, etc.) to inject items at specific positions inside the dropdown menu.
- **Default sub-components** (`DefaultTopBarRight`, `DefaultTimer`, `DefaultMusicBar`, `DefaultSidebarLauncher`, `DefaultMenuBar`) are exported so you can recompose the UI however you want.

---

## TopBar Customization

### Adding buttons alongside defaults

The simplest way to add a button next to Timer/MusicBar/Sidebar without replacing anything:

```tsx
import { Drawo, DrawoTopBar } from "@drawo-app/drawo";

function App() {
  return (
    <Drawo>
      <Drawo.TopBar
        rightBefore={<button onClick={() => alert("Share!")}>📤 Share</button>}
      />
    </Drawo>
  );
}
```

- `rightBefore` — content inserted **before** the default right items (Timer → MusicBar → Sidebar).
- `rightAfter` — content inserted **after** the default right items.

```tsx
<Drawo.TopBar
  rightBefore={<MyShareButton />}
  rightAfter={<MyProfileAvatar />}
/>
```

Result layout: `[Share] [Timer] [MusicBar] [Sidebar] [Avatar]`

### Controlling which defaults appear

You can toggle individual default right-side components:

```tsx
<Drawo.TopBar
  showTimer={false}        // hide the timer
  showMusicBar={false}     // hide the music bar
  showSidebarLauncher      // show the sidebar launcher (default: true)
  rightBefore={<MyButton />}
/>
```

Result layout: `[MyButton] [Sidebar]`

You can also hide the MenuBar (left side):

```tsx
<Drawo.TopBar showMenuBar={false}>
  <MyCustomMenu />
</Drawo.TopBar>
```

### Fully replacing the right section

If you pass `right`, it **fully replaces** the right section. `rightBefore` and `rightAfter` are ignored:

```tsx
<Drawo.TopBar
  right={
    <>
      <MyShareButton />
      <MyProfileAvatar />
    </>
  }
/>
```

Result: only your custom content appears on the right side. No Timer, MusicBar, or Sidebar.

### Recomposing with default sub-components

Want to reorder the defaults or put your button in between? Use the exported sub-components:

```tsx
import {
  Drawo,
  DefaultTimer,
  DefaultMusicBar,
  DefaultSidebarLauncher,
} from "@drawo-app/drawo";

function App() {
  return (
    <Drawo>
      <Drawo.TopBar
        right={
          <>
            <MyShareButton />
            <DefaultTimer />
            {/* Skip MusicBar */}
            <DefaultSidebarLauncher />
          </>
        }
      />
    </Drawo>
  );
}
```

Or use `DefaultTopBarRight` to get all three as a single component:

```tsx
import { DefaultTopBarRight } from "@drawo-app/drawo";

<Drawo.TopBar
  right={
    <>
      <MyShareButton />
      <DefaultTopBarRight />
    </>
  }
/>;
```

All `Default*` components auto-wire to the Drawo context — no need to pass any props.

### Left-side content

```tsx
<Drawo.TopBar left={<MyBreadcrumbs />}>
  <MyLogo />
</Drawo.TopBar>
```

Layout: `[children] [MenuBar] [left] ... [right-defaults]`

- `children` — rendered before the MenuBar.
- `left` — rendered after the MenuBar.

---

## MenuBar Customization

The `MenuBar` dropdown has this section order:

```
┌─────────────────────────┐
│ ⚡ Quick Actions        │  (header)
├─────────────────────────┤
│ 📁 File ►               │  → extraFileItems go here
│ ✏️ Edit ►               │
│ 👁 View ►               │  → extraViewItems go here
│ 🔲 Object ►             │
│ 🔤 Text ►               │
│ ⬆️ Organize ►           │
├─────────────────────────┤
│ (extraMenuSections)     │  ← custom top-level submenus
├─────────────────────────┤
│ (beforeLinks)           │  ← content before links
│ 🔗 Github               │
│ 🔗 Discord              │
│ 💎 Donate               │
├─────────────────────────┤
│ 🎨 Themes               │
│ ⚙️ Settings ►           │  → extraSettingsItems go here
│ (afterSettings)         │  ← content after settings
└─────────────────────────┘
```

### Injecting items into existing sections

Add items inside existing sub-menus:

```tsx
import { Drawo } from "@drawo-app/drawo";

// Add a "Print" option inside the File submenu:
<Drawo>
  <Drawo.TopBar
    menuBarProps={{
      extraFileItems: (
        <DropdownMenuItem onClick={() => window.print()}>
          🖨️ Print
        </DropdownMenuItem>
      ),
    }}
  />
</Drawo>;
```

Available section slot props:

| Prop | Position |
|------|----------|
| `extraFileItems` | Appended inside File submenu, before the separator + "Clear Canvas" |
| `extraViewItems` | Appended at the end of the View submenu |
| `extraSettingsItems` | Appended at the end of the Settings submenu |

### Adding custom top-level sections

Insert entirely new submenus between "Organize" and the links:

```tsx
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem,
} from "@drawo-app/drawo"; // or from your own UI lib

<Drawo.TopBar
  menuBarProps={{
    extraMenuSections: (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          🔌 Plugins
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuItem onClick={() => enablePlugin("a")}>
            Plugin A
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => enablePlugin("b")}>
            Plugin B
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    ),
  }}
/>;
```

### Adding items before links or after settings

```tsx
<Drawo.TopBar
  menuBarProps={{
    beforeLinks: (
      <DropdownMenuItem onClick={openChangelog}>
        📋 Changelog
      </DropdownMenuItem>
    ),
    afterSettings: (
      <DropdownMenuItem onClick={showAbout}>
        ℹ️ About
      </DropdownMenuItem>
    ),
  }}
/>;
```

### Forwarding MenuBar props from DrawoTopBar

When using `<Drawo.TopBar>`, the `menuBarProps` prop is forwarded directly to the internal `<DefaultMenuBar>`, which passes them to `<MenuBar>`. This means you don't need to manually wire context — it's automatic:

```tsx
// These two are equivalent:
<Drawo.TopBar menuBarProps={{ extraFileItems: <MyItem /> }} />

// vs lower-level:
<Drawo.TopBar showMenuBar={false}>
  <DefaultMenuBar extraFileItems={<MyItem />} />
</Drawo.TopBar>
```

---

## Exported Components Reference

### TopBar Components

| Component | Description |
|-----------|-------------|
| `DrawoTopBar` | The full top bar container with left/right sections |
| `DefaultTopBarRight` | All default right-side items (Timer + MusicBar + Sidebar) |
| `DefaultMenuBar` | The hamburger menu, auto-wired to Drawo context. Accepts `MenuBar` slot props. |
| `DefaultTimer` | Timer widget, auto-wired to Drawo context |
| `DefaultMusicBar` | Music player widget, auto-wired to Drawo context |
| `DefaultSidebarLauncher` | Sidebar toggle button, auto-wired to Drawo context |

### DrawoTopBarProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | — | Content rendered before the MenuBar (left side) |
| `left` | `ReactNode` | — | Content rendered after the MenuBar (left side) |
| `right` | `ReactNode` | — | Fully replaces the right section. Ignores `rightBefore`/`rightAfter`. |
| `rightBefore` | `ReactNode` | — | Content inserted before default right items |
| `rightAfter` | `ReactNode` | — | Content inserted after default right items |
| `showMenuBar` | `boolean` | `true` | Show/hide the built-in MenuBar |
| `showTimer` | `boolean` | `true` | Show/hide the Timer in the right section |
| `showMusicBar` | `boolean` | `true` | Show/hide the MusicBar in the right section |
| `showSidebarLauncher` | `boolean` | `true` | Show/hide the Sidebar launcher button |
| `menuBarProps` | `MenuBarSlotProps` | — | Extra props forwarded to the built-in MenuBar |

### MenuBarProps (slot props only)

These are the customization props. The context props (`scene`, `messages`, etc.) are auto-injected by `DefaultMenuBar`.

| Prop | Type | Description |
|------|------|-------------|
| `extraFileItems` | `ReactNode` | Items appended inside File submenu |
| `extraViewItems` | `ReactNode` | Items appended inside View submenu |
| `extraSettingsItems` | `ReactNode` | Items appended inside Settings submenu |
| `extraMenuSections` | `ReactNode` | Custom top-level submenus between Organize and links |
| `beforeLinks` | `ReactNode` | Content before the Github/Discord/Donate links |
| `afterSettings` | `ReactNode` | Content after the Settings submenu (end of menu) |

---

## Full Examples

### Example 1: Share button + hide MusicBar

```tsx
import { Drawo } from "@drawo-app/drawo";

function App() {
  return (
    <Drawo>
      <Drawo.TopBar
        showMusicBar={false}
        rightBefore={
          <button className="tool-item" onClick={handleShare}>
            📤
          </button>
        }
      />
    </Drawo>
  );
}
```

### Example 2: Custom menu items + custom right section

```tsx
import {
  Drawo,
  DefaultTimer,
  DefaultSidebarLauncher,
} from "@drawo-app/drawo";

function App() {
  return (
    <Drawo>
      <Drawo.TopBar
        menuBarProps={{
          extraFileItems: (
            <DropdownMenuItem onClick={handlePrint}>
              🖨️ Print
            </DropdownMenuItem>
          ),
          extraMenuSections: (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>🔌 Plugins</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>AI Assistant</DropdownMenuItem>
                <DropdownMenuItem>Collaboration</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ),
        }}
        right={
          <>
            <button onClick={handleShare}>Share</button>
            <DefaultTimer />
            <DefaultSidebarLauncher />
          </>
        }
      />
    </Drawo>
  );
}
```

### Example 3: Minimal — just add a logo + button

```tsx
import { Drawo } from "@drawo-app/drawo";

function App() {
  return (
    <Drawo>
      <Drawo.TopBar rightAfter={<MyUserAvatar />}>
        <img src="/logo.svg" alt="Logo" height={28} />
      </Drawo.TopBar>
    </Drawo>
  );
}
```

### Example 4: Fully custom TopBar with defaults recomposed

```tsx
import {
  Drawo,
  DefaultMenuBar,
  DefaultTimer,
  DefaultSidebarLauncher,
} from "@drawo-app/drawo";

function App() {
  return (
    <Drawo>
      <Drawo.TopBar showMenuBar={false} showTimer={false} showMusicBar={false} showSidebarLauncher={false}>
        <MyLogo />
        <DefaultMenuBar
          extraFileItems={<DropdownMenuItem>Print</DropdownMenuItem>}
        />
      </Drawo.TopBar>
      {/* Since we disabled all right defaults, we need to add them manually if needed */}
    </Drawo>
  );
}
```

---

## Import Summary

```tsx
import {
  // Main
  Drawo,

  // TopBar sub-components (auto-wired to context)
  DrawoTopBar,
  DefaultTopBarRight,
  DefaultMenuBar,
  DefaultTimer,
  DefaultMusicBar,
  DefaultSidebarLauncher,

  // Types
  type DrawoTopBarProps,
  type MenuBarProps,
} from "@drawo-app/drawo";
```
