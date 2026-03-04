# RetroWriter – Copilot Instructions

Browser-based retro text editor inspired by 1980s "lettermaker" programs. Built with TypeScript + Vite, renders entirely on an HTML5 `<canvas>`.

## Commands

```bash
pnpm dev          # Start dev server at http://localhost:5173
pnpm build        # tsc + vite build → dist/
pnpm lint         # ESLint (src/)
pnpm lint:fix     # ESLint with auto-fix
pnpm format       # Prettier (html, md files)
```

No test suite exists. Husky runs `eslint --fix` + Prettier on staged files pre-commit.

## Architecture

```
main.ts → App → Writer → Screen (canvas rendering)
                       → Demo  (serialization / playback)
                       → Cell[] (40×25 grid)
                       → Cursor
```

**`Writer`** is the core. It owns the grid (`Cell[]`), the cursor, the demo recording, and the animation loop (`mainLoop` via `requestAnimationFrame`). It has three states: `'record'` | `'play'` | `'pause'`.

**`App`** handles all browser events (keyboard, resize, drag-drop, hash URL) and delegates to `Writer`. The `app` instance is exposed on `globalThis` for console debugging.

**`Screen`** renders the grid to canvas each frame. It reads state from `Writer` (cells, cursor, `cyclePercent`, `globalStyle`) but never mutates it.

**`Demo`** serializes/deserializes the instruction stream as JSON. The file format uses `magic: 'RTRWRTR'`. Each instruction is either a bare mnemonic string or a `[mnemonic, arg1?, arg2?]` array.

**`Instruction`** defines all 3-letter mnemonics as static constants. Mnemonic naming convention:

- First letter: `C` = cursor scope, `G` = global scope
- Second letter: `F` = foreground, `B` = background, `D` = border
- Third letter: `C` = color, `P` = pulse
- Other mnemonics: `CHR` (character), `CLR` (clear cell), `ADV` (advance), `RCT` (retract), `CUP/CDW/CLF/CRT` (cursor movement), `SCR` (scroll)

## Key Conventions

**Cell is the universal style container.** `Cursor.cell` holds the active painting style (colors + pulse flags). `Writer.#globalStyle` is a `Cell` used as the screen-wide fallback. When rendering, per-cell style takes precedence over global style.

**Space characters are recorded as `null`** in the instruction stream (`CHR null`). `character()` handles this encoding.

**`cycleVal` (0–255) drives all pulse/blink animations.** It oscillates up and down each frame. `cyclePercent` is the 0–100 normalised value passed to `Color.adjustLightness()` for rendering pulses.

**Afterglow** is a transient visual trail triggered when the cursor leaves a cell. It's stored per-cell as `afterglowColor` + `afterglowCounter` (counts down to 0).

**Colors are always hex strings** (`#rrggbb`). `null` means "inherit from global style / use default." `Writer.colorPalette` (10 colors) is the user-selectable palette; `Writer.defaultColor` defines fallback foreground/background/border.

**TypeScript strict mode** is on, including `noUnusedLocals` and `noUnusedParameters`. Unused parameters that must remain in a signature should be prefixed with `_`.

**Private class fields** (`#field`) are used throughout — not TypeScript `private` keyword.

**Prettier config:** single quotes, semicolons, 120-char line width, 4-space indent.

## Demo File Format

```json
{
    "magic": "RTRWRTR",
    "header": { "version": "0.1.0" },
    "instructions": ["CUP", ["CHR", "A"], ["CBC", "#ff0000"], ["CBP", true]]
}
```

Demos can be loaded from: local file (drag-drop or file picker), URL (`#play:<url>`), or GitHub Gist (`#play-gist:<gistId>`).

## Deployment

Pushes to `main` auto-deploy to GitHub Pages via `.github/workflows/gh-pages.yml`. The build uses `--base=/<repo-name>/` for correct asset paths under a subpath.
