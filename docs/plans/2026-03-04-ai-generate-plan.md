# AI Generate Demo — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a CTRL+G keyboard shortcut that opens a floating dialog, sends a user prompt to the OpenAI API, and auto-plays the resulting RetroWriter demo.

**Architecture:** A DSL compiler (`AiDsl`) maps a JSON command array to `Instruction[]`. `AiGenerator` builds the system prompt, calls the OpenAI API, and returns a `DemoFormat`. `AiDialog` renders the HTML overlay and wires everything together. `App` opens the dialog on CTRL+G and calls `writer.importDemo()+play()` on success.

**Tech Stack:** TypeScript (strict), Vite, no test framework. Lint with `pnpm lint`. Build with `pnpm build`.

---

## Task 1: DSL Compiler (`AiDsl.ts`)

**Files:**

- Create: `src/AiDsl.ts`

This is pure logic with no DOM or network dependencies. It converts an array of JSON DSL command objects into a `DemoFormat` ready for `writer.importDemo()`.

**Important rules from existing code:**

- Space character → `null` in `CHR` instruction (see `Writer.character()`)
- Each `write` char emits `CHR` (delay=false) + `ADV` (delay=true) — this is what creates the typewriter timing
- `cursorLeft`/`cursorRight` both wrap at grid edges; `cursorDown` scrolls when at the last row

### Step 1: Create `src/AiDsl.ts`

```typescript
import App from './App';
import { Demo, DemoFormat } from './Demo';
import Instruction from './Instruction';

interface DslCommand {
    fn: string;
    text?: string;
    col?: number;
    row?: number;
    fg?: string | null;
    bg?: string | null;
    border?: string | null;
    target?: string;
    enabled?: boolean;
}

export default class AiDsl {
    static readonly COLS = 40;
    static readonly ROWS = 25;

    #instructions: Instruction[] = [];
    #cursorCol: number = 0;
    #cursorRow: number = 0;

    compile(commands: DslCommand[]): DemoFormat {
        this.#instructions = [];
        this.#cursorCol = 0;
        this.#cursorRow = 0;

        for (const cmd of commands) {
            this.#dispatch(cmd);
        }

        return {
            magic: Demo.magic,
            header: { version: App.appVersion },
            instructions: this.#instructions.map((i) => i.toData()),
        };
    }

    #dispatch(cmd: DslCommand) {
        switch (cmd.fn) {
            case 'write':
                this.#write(cmd.text ?? '', cmd.fg, cmd.bg, cmd.border);
                break;
            case 'newline':
                this.#newline();
                break;
            case 'move':
                this.#move(cmd.col ?? 0, cmd.row ?? 0);
                break;
            case 'color':
                this.#color(cmd.fg, cmd.bg, cmd.border);
                break;
            case 'globalColor':
                this.#globalColor(cmd.fg, cmd.bg, cmd.border);
                break;
            case 'pulse':
                this.#pulse(cmd.target ?? 'bg', cmd.enabled ?? true);
                break;
            case 'globalPulse':
                this.#globalPulse(cmd.target ?? 'bg', cmd.enabled ?? true);
                break;
            case 'scroll':
                this.#scroll();
                break;
            default:
                console.warn(`AiDsl: unknown command '${cmd.fn}', skipping`);
        }
    }

    #write(text: string, fg?: string | null, bg?: string | null, border?: string | null) {
        if (fg !== undefined) {
            this.#instructions.push(new Instruction(Instruction.cursorForegroundColor, fg ?? null));
        }
        if (bg !== undefined) {
            this.#instructions.push(new Instruction(Instruction.cursorBackgroundColor, bg ?? null));
        }
        if (border !== undefined) {
            this.#instructions.push(new Instruction(Instruction.cursorBorderColor, border ?? null));
        }

        for (const char of text) {
            // Space is encoded as null in the instruction stream (see Writer.character())
            const instructionChar = char !== ' ' ? char : null;
            this.#instructions.push(new Instruction(Instruction.character, instructionChar));
            this.#instructions.push(new Instruction(Instruction.advance));

            // Mirror Writer.advance() logic to track virtual cursor
            if (this.#cursorCol === AiDsl.COLS - 1) {
                this.#cursorCol = 0;
                if (this.#cursorRow < AiDsl.ROWS - 1) {
                    this.#cursorRow++;
                }
                // else: scroll occurs, row stays at ROWS-1
            } else {
                this.#cursorCol++;
            }
        }
    }

    #newline() {
        if (this.#cursorCol === 0) {
            // Already at start of line — just move down
            this.#instructions.push(new Instruction(Instruction.cursorDown));
            if (this.#cursorRow < AiDsl.ROWS - 1) {
                this.#cursorRow++;
            }
        } else {
            // Advance to end of row; the last advance wraps to col 0, row+1
            const steps = AiDsl.COLS - this.#cursorCol;
            for (let i = 0; i < steps; i++) {
                this.#instructions.push(new Instruction(Instruction.advance));
            }
            this.#cursorCol = 0;
            if (this.#cursorRow < AiDsl.ROWS - 1) {
                this.#cursorRow++;
            }
        }
    }

    #move(targetCol: number, targetRow: number) {
        targetCol = Math.max(0, Math.min(AiDsl.COLS - 1, targetCol));
        targetRow = Math.max(0, Math.min(AiDsl.ROWS - 1, targetRow));

        // Move rows first (avoid accidental scroll from cursorDown at last row while at wrong col)
        const rowDelta = targetRow - this.#cursorRow;
        if (rowDelta > 0) {
            for (let i = 0; i < rowDelta; i++) {
                this.#instructions.push(new Instruction(Instruction.cursorDown));
            }
        } else if (rowDelta < 0) {
            for (let i = 0; i < -rowDelta; i++) {
                this.#instructions.push(new Instruction(Instruction.cursorUp));
            }
        }
        this.#cursorRow = targetRow;

        // Move cols
        const colDelta = targetCol - this.#cursorCol;
        if (colDelta > 0) {
            for (let i = 0; i < colDelta; i++) {
                this.#instructions.push(new Instruction(Instruction.cursorRight));
            }
        } else if (colDelta < 0) {
            for (let i = 0; i < -colDelta; i++) {
                this.#instructions.push(new Instruction(Instruction.cursorLeft));
            }
        }
        this.#cursorCol = targetCol;
    }

    #color(fg?: string | null, bg?: string | null, border?: string | null) {
        if (fg !== undefined) {
            this.#instructions.push(new Instruction(Instruction.cursorForegroundColor, fg ?? null));
        }
        if (bg !== undefined) {
            this.#instructions.push(new Instruction(Instruction.cursorBackgroundColor, bg ?? null));
        }
        if (border !== undefined) {
            this.#instructions.push(new Instruction(Instruction.cursorBorderColor, border ?? null));
        }
    }

    #globalColor(fg?: string | null, bg?: string | null, border?: string | null) {
        if (fg !== undefined) {
            this.#instructions.push(new Instruction(Instruction.globalForegroundColor, fg ?? null));
        }
        if (bg !== undefined) {
            this.#instructions.push(new Instruction(Instruction.globalBackgroundColor, bg ?? null));
        }
        if (border !== undefined) {
            this.#instructions.push(new Instruction(Instruction.globalBorderColor, border ?? null));
        }
    }

    #pulse(target: string, enabled: boolean) {
        const mnemonicMap: Record<string, string> = {
            fg: Instruction.cursorForegroundPulse,
            bg: Instruction.cursorBackgroundPulse,
            border: Instruction.cursorBorderPulse,
        };
        const mnemonic = mnemonicMap[target];
        if (mnemonic) {
            this.#instructions.push(new Instruction(mnemonic, enabled));
        } else {
            console.warn(`AiDsl: unknown pulse target '${target}'`);
        }
    }

    #globalPulse(target: string, enabled: boolean) {
        const mnemonicMap: Record<string, string> = {
            fg: Instruction.globalForegroundPulse,
            bg: Instruction.globalBackgroundPulse,
            border: Instruction.globalBorderPulse,
        };
        const mnemonic = mnemonicMap[target];
        if (mnemonic) {
            this.#instructions.push(new Instruction(mnemonic, enabled));
        } else {
            console.warn(`AiDsl: unknown globalPulse target '${target}'`);
        }
    }

    #scroll() {
        this.#instructions.push(new Instruction(Instruction.scroll));
    }
}
```

### Step 2: Lint

```bash
pnpm lint
```

Expected: no errors.

### Step 3: Build check

```bash
pnpm build
```

Expected: completes without TypeScript errors.

### Step 4: Commit

```bash
git add src/AiDsl.ts
git commit -m "feat: add AiDsl DSL compiler

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: AI Generator (`AiGenerator.ts`)

**Files:**

- Create: `src/AiGenerator.ts`

Handles API key storage, system prompt construction, and the OpenAI API call.

### Step 1: Create `src/AiGenerator.ts`

```typescript
import { DemoFormat } from './Demo';
import AiDsl from './AiDsl';

const LOCAL_STORAGE_KEY = 'retrowriter.openai.api_key';
const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o';

const SYSTEM_PROMPT = `You are a generator for RetroWriter, a retro C64-style animated text demo tool.

The display is a 40-column × 25-row character grid (columns 0-39, rows 0-24).
Your output creates demos that play character by character with animated visual effects.

Output a JSON object with a single "commands" key containing an array of DSL command objects.
Output ONLY valid JSON, no explanation, no markdown.

## DSL Commands

| fn | Parameters | Description |
|---|---|---|
| globalColor | fg?, bg?, border? | Set screen-wide default colors |
| globalPulse | target ("fg"/"bg"/"border"), enabled (bool) | Toggle global pulse animation |
| color | fg?, bg?, border? | Set cursor-scope colors (applied to next written characters) |
| pulse | target ("fg"/"bg"/"border"), enabled (bool) | Toggle pulse for cursor scope |
| write | text, fg?, bg?, border? | Write characters at cursor, auto-advance after each |
| newline | — | Move cursor to start of next row |
| move | col (0-39), row (0-24) | Jump cursor to absolute position |
| scroll | — | Scroll screen content up one row |

- fg / bg / border are hex color strings (#rrggbb) or null to clear
- If fg/bg/border are omitted from a command, those colors are left unchanged
- In "write", you can pass fg/bg/border to set colors before writing that text

## Color Palette

- Red: #ff0000 · Green: #00ff00 · Blue: #3399ff · Yellow: #ffff00
- Magenta: #ff00ff · Cyan: #00ffff · Orange: #ff9900 · Purple: #9900ff
- White: #eeeeee · Black: #111111

## Layout tips

- Grid is 40 cols × 25 rows. Text centered on row 12 starts at col = (40 - text.length) / 2
- Use "move" to position text anywhere; use "newline" between lines of text
- Set globalColor at the start to establish the background

## Example

User: birthday message with colorful effects

\`\`\`json
{
  "commands": [
    { "fn": "globalColor", "bg": "#111111", "fg": "#eeeeee" },
    { "fn": "move", "col": 8, "row": 10 },
    { "fn": "color", "fg": "#ffff00", "bg": "#9900ff" },
    { "fn": "pulse", "target": "bg", "enabled": true },
    { "fn": "write", "text": "  HAPPY BIRTHDAY!  " },
    { "fn": "move", "col": 10, "row": 13 },
    { "fn": "color", "fg": "#00ffff", "bg": "#111111" },
    { "fn": "pulse", "target": "fg", "enabled": true },
    { "fn": "write", "text": "wishing you all the best" },
    { "fn": "move", "col": 14, "row": 16 },
    { "fn": "color", "fg": "#ff9900" },
    { "fn": "pulse", "target": "fg", "enabled": false },
    { "fn": "write", "text": "have a great day :)" }
  ]
}
\`\`\`
`;

export default class AiGenerator {
    static getApiKey(): string | null {
        return localStorage.getItem(LOCAL_STORAGE_KEY);
    }

    static saveApiKey(key: string) {
        localStorage.setItem(LOCAL_STORAGE_KEY, key.trim());
    }

    static clearApiKey() {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    }

    static async generate(prompt: string): Promise<DemoFormat> {
        const apiKey = AiGenerator.getApiKey();
        if (!apiKey) {
            throw new Error('No API key configured');
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: MODEL,
                response_format: { type: 'json_object' },
                temperature: 0.8,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
            }),
        });

        if (!response.ok) {
            let message = response.statusText;
            try {
                const err = await response.json();
                message = err.error?.message ?? message;
            } catch {
                // ignore parse error
            }
            throw new Error(`OpenAI API error: ${message}`);
        }

        const data = await response.json();
        const content: string | undefined = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error('Empty response from AI');
        }

        let parsed: { commands?: unknown };
        try {
            parsed = JSON.parse(content);
        } catch {
            throw new Error('AI returned invalid JSON — try again');
        }

        if (!Array.isArray(parsed.commands)) {
            throw new Error('AI response missing "commands" array — try again');
        }

        const dsl = new AiDsl();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return dsl.compile(parsed.commands as any[]);
    }
}
```

### Step 2: Lint

```bash
pnpm lint
```

Expected: no errors.

### Step 3: Build check

```bash
pnpm build
```

Expected: no TypeScript errors.

### Step 4: Commit

```bash
git add src/AiGenerator.ts
git commit -m "feat: add AiGenerator with OpenAI API integration

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: Dialog UI (`AiDialog.ts`)

**Files:**

- Create: `src/AiDialog.ts`
- Modify: `src/style.css`

A pure HTML/CSS overlay injected into `document.body`. Two views: key-entry (first launch) and prompt (normal flow). Consistent with how `main.ts` creates the canvas today.

### Step 1: Add CSS to `src/style.css`

Append the following at the end of the existing `style.css`:

```css
/* AI Dialog */
.ai-dialog-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    z-index: 100;
    align-items: center;
    justify-content: center;
    font-family: monospace;
}

.ai-dialog {
    background: #111111;
    border: 2px solid #3399ff;
    color: #eeeeee;
    padding: 24px 28px;
    min-width: 380px;
    max-width: 480px;
    width: 90vw;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.ai-dialog h2 {
    margin: 0;
    font-size: 1rem;
    color: #3399ff;
    letter-spacing: 0.05em;
}

.ai-dialog textarea,
.ai-dialog input[type='password'],
.ai-dialog input[type='text'] {
    width: 100%;
    box-sizing: border-box;
    background: #222222;
    border: 1px solid #3399ff;
    color: #eeeeee;
    font-family: monospace;
    font-size: 0.9rem;
    padding: 8px;
    resize: vertical;
}

.ai-dialog textarea {
    min-height: 80px;
}

.ai-dialog .ai-dialog-actions {
    display: flex;
    gap: 8px;
    align-items: center;
}

.ai-dialog button {
    background: #3399ff;
    border: none;
    color: #111111;
    font-family: monospace;
    font-size: 0.9rem;
    font-weight: bold;
    padding: 6px 14px;
    cursor: pointer;
}

.ai-dialog button:disabled {
    background: #444444;
    color: #888888;
    cursor: not-allowed;
}

.ai-dialog .ai-dialog-link {
    background: none;
    border: none;
    color: #888888;
    font-family: monospace;
    font-size: 0.8rem;
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
}

.ai-dialog .ai-dialog-link:hover {
    color: #aaaaaa;
}

.ai-dialog .ai-dialog-status {
    font-size: 0.85rem;
    min-height: 1.2em;
}

.ai-dialog .ai-dialog-status.error {
    color: #ff0000;
}

.ai-dialog .ai-dialog-status.info {
    color: #888888;
}

.ai-dialog small {
    color: #666666;
    font-size: 0.75rem;
}
```

### Step 2: Create `src/AiDialog.ts`

```typescript
import { DemoFormat } from './Demo';
import AiGenerator from './AiGenerator';

export default class AiDialog {
    #overlay: HTMLDivElement;
    #onSuccess: (data: DemoFormat) => void;

    constructor(onSuccess: (data: DemoFormat) => void) {
        this.#onSuccess = onSuccess;
        this.#overlay = document.createElement('div');
        this.#overlay.className = 'ai-dialog-overlay';
        document.body.appendChild(this.#overlay);
    }

    get isOpen(): boolean {
        return this.#overlay.style.display === 'flex';
    }

    open() {
        if (AiGenerator.getApiKey()) {
            this.#renderPromptView();
        } else {
            this.#renderKeyView();
        }
        this.#overlay.style.display = 'flex';
    }

    close() {
        this.#overlay.style.display = 'none';
        this.#overlay.innerHTML = '';
    }

    #renderKeyView() {
        this.#overlay.innerHTML = '';

        const dialog = document.createElement('div');
        dialog.className = 'ai-dialog';
        dialog.innerHTML = `
            <h2>🔑 OpenAI API Key</h2>
            <input type="password" class="js-key-input" placeholder="sk-..." autocomplete="off" />
            <div class="ai-dialog-actions">
                <button class="js-save-btn">Save Key</button>
                <button class="js-cancel-btn ai-dialog-link">Cancel</button>
            </div>
            <small>Your key is stored only in this browser's localStorage.</small>
            <div class="ai-dialog-status js-status"></div>
        `;
        this.#overlay.appendChild(dialog);

        const keyInput = dialog.querySelector<HTMLInputElement>('.js-key-input')!;
        const saveBtn = dialog.querySelector<HTMLButtonElement>('.js-save-btn')!;
        const cancelBtn = dialog.querySelector<HTMLButtonElement>('.js-cancel-btn')!;

        keyInput.focus();

        saveBtn.addEventListener('click', () => {
            const key = keyInput.value.trim();
            if (!key) return;
            AiGenerator.saveApiKey(key);
            this.#renderPromptView();
        });

        cancelBtn.addEventListener('click', () => this.close());

        keyInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveBtn.click();
            if (e.key === 'Escape') this.close();
        });
    }

    #renderPromptView() {
        this.#overlay.innerHTML = '';

        const dialog = document.createElement('div');
        dialog.className = 'ai-dialog';
        dialog.innerHTML = `
            <h2>✨ AI Generate Demo</h2>
            <textarea class="js-prompt-input" placeholder="Describe your demo… e.g. &quot;A birthday message with colorful pulsing effects&quot;"></textarea>
            <div class="ai-dialog-actions">
                <button class="js-generate-btn" disabled>Generate</button>
                <button class="js-change-key-btn ai-dialog-link">⚙ Change key</button>
                <button class="js-cancel-btn ai-dialog-link">Cancel</button>
            </div>
            <div class="ai-dialog-status js-status"></div>
        `;
        this.#overlay.appendChild(dialog);

        const promptInput = dialog.querySelector<HTMLTextAreaElement>('.js-prompt-input')!;
        const generateBtn = dialog.querySelector<HTMLButtonElement>('.js-generate-btn')!;
        const changeKeyBtn = dialog.querySelector<HTMLButtonElement>('.js-change-key-btn')!;
        const cancelBtn = dialog.querySelector<HTMLButtonElement>('.js-cancel-btn')!;
        const status = dialog.querySelector<HTMLDivElement>('.js-status')!;

        promptInput.focus();

        promptInput.addEventListener('input', () => {
            generateBtn.disabled = promptInput.value.trim().length === 0;
        });

        changeKeyBtn.addEventListener('click', () => this.#renderKeyView());
        cancelBtn.addEventListener('click', () => this.close());

        promptInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });

        generateBtn.addEventListener('click', async () => {
            const prompt = promptInput.value.trim();
            if (!prompt) return;

            generateBtn.disabled = true;
            cancelBtn.disabled = true;
            status.className = 'ai-dialog-status info';
            status.textContent = 'Generating…';

            try {
                const demo = await AiGenerator.generate(prompt);
                this.close();
                this.#onSuccess(demo);
            } catch (e) {
                status.className = 'ai-dialog-status error';
                status.textContent = e instanceof Error ? e.message : 'Unknown error';
                generateBtn.disabled = false;
                cancelBtn.disabled = false;
            }
        });
    }
}
```

### Step 3: Lint

```bash
pnpm lint
```

Expected: no errors.

### Step 4: Build check

```bash
pnpm build
```

Expected: no TypeScript errors.

### Step 5: Commit

```bash
git add src/AiDialog.ts src/style.css
git commit -m "feat: add AiDialog overlay UI

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: Wire into `App.ts`

**Files:**

- Modify: `src/App.ts`

Add `CTRL+G` support and connect the dialog. Three changes:

1. Import and instantiate `AiDialog`
2. Add a flag to suppress canvas key events while dialog is open
3. Handle `CTRL+G` in `#onKeyDown`

### Step 1: Add import and `#aiDialog` field

At the top of `App.ts`, add the import alongside the existing imports:

```typescript
import AiDialog from './AiDialog';
```

In the class body, after the `#autoAdvance` field declaration, add:

```typescript
/** The AI generate dialog */
#aiDialog: AiDialog;
```

### Step 2: Instantiate `AiDialog` in the constructor

In the `constructor`, after `this.#writer = new Writer(...)`, add:

```typescript
this.#aiDialog = new AiDialog((data) => {
    this.#writer.importDemo(data);
    this.#writer.play();
});
```

### Step 3: Suppress canvas keys when dialog is open

At the very top of `#onKeyDown`, before `event.preventDefault()`, add:

```typescript
if (this.#aiDialog.isOpen) {
    return;
}
```

### Step 4: Handle `CTRL+G`

In `#onKeyDown`, in the first `if/else if` block (where PrintScreen and F5 are handled globally), add a new branch **before** the `appState` checks:

```typescript
} else if (ctrlKey && key === 'g') {
    this.#aiDialog.open();
    handled = true;
```

Place this after the existing `F12` branch and before the `appState === 'record'` branch.

### Step 5: Add CTRL+G to `printHelp()`

In `printHelp()`, append this line to the `help` array:

```typescript
'CTRL + G            AI generate demo',
```

### Step 6: Lint

```bash
pnpm lint
```

Expected: no errors.

### Step 7: Build check

```bash
pnpm build
```

Expected: dist/ built without TypeScript errors.

### Step 8: Manual smoke test

```bash
pnpm dev
```

1. Browse to http://localhost:5173/
2. Press CTRL+G → key-entry overlay appears
3. Enter any text as a fake key, click Save → prompt view appears
4. Type a prompt, click Generate → "Generating…" status appears
   (The request will fail with an auth error if using a fake key — that's expected)
5. Confirm error message appears inline and dialog stays open
6. Press Escape → dialog closes
7. Check browser console: `CTRL + G   AI generate demo` appears in the printHelp output

### Step 9: Commit

```bash
git add src/App.ts
git commit -m "feat: wire CTRL+G AI generate demo into App

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 5: Update `copilot-instructions.md`

**Files:**

- Modify: `.github/copilot-instructions.md`

Add `AiDsl`, `AiGenerator`, `AiDialog` to the architecture section, document the CTRL+G shortcut, and note the `retrowriter.openai.api_key` localStorage key.

### Step 1: Update the architecture diagram

Change the architecture ASCII diagram to:

```
main.ts → App → Writer → Screen (canvas rendering)
                       → Demo  (serialization / playback)
                       → Cell[] (40×25 grid)
                       → Cursor
        → AiDialog → AiGenerator → AiDsl (DSL compiler)
```

### Step 2: Add a new section after "Key Conventions"

```markdown
## AI Generate (CTRL+G)

`CTRL+G` opens a floating dialog that sends a natural-language prompt to the OpenAI API and auto-plays the resulting demo.

- **`AiDialog`** — HTML overlay UI; two views: API key entry (first launch) and prompt input
- **`AiGenerator`** — builds system prompt, calls `https://api.openai.com/v1/chat/completions` (model: `gpt-4o`, `response_format: json_object`); API key stored in `localStorage` under `retrowriter.openai.api_key`
- **`AiDsl`** — compiles the AI's JSON command array into a `DemoFormat`; tracks virtual cursor position during compilation

**DSL command array format** (what the AI returns inside `{ "commands": [...] }`):
`write`, `newline`, `move`, `color`, `globalColor`, `pulse`, `globalPulse`, `scroll` — see design doc at `docs/plans/2026-03-04-ai-generate-design.md` for full reference.
```

### Step 3: Lint and commit

```bash
pnpm format
git add .github/copilot-instructions.md
git commit -m "docs: update copilot instructions for AI generate feature

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
