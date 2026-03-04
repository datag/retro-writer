# AI Generate Demo — Design

## Summary

Add an AI-powered demo generator to RetroWriter. The user presses **CTRL+G**, types a natural-language prompt (e.g. "Write a birthday message with colorful pulsing effects"), and GPT-4o produces a complete RetroWriter demo that auto-plays after generation.

All API calls are made directly from the browser. The OpenAI API key is stored in `localStorage`.

---

## Architecture

Three new source files; `App.ts` gains one new keyboard handler:

```
src/AiDialog.ts      — HTML overlay UI (prompt input, API key management)
src/AiGenerator.ts   — System prompt construction, OpenAI API call, response parsing
src/AiDsl.ts         — DSL compiler: maps JSON DSL commands → Instruction[]
App.ts               — CTRL+G opens dialog; on success: writer.importDemo() + play()
```

**Data flow:**

```
User prompt
  → AiGenerator.generate(prompt)
    → fetch OpenAI API  →  JSON array of DSL commands
    → AiDsl.compile(commands)  →  DemoFormat
  → writer.importDemo(demoFormat)
  → writer.play()
```

---

## DSL Format

The AI outputs a `{ "commands": [...] }` JSON object (top-level object required by OpenAI's `json_object` response format). Each command in the array is an object with a `fn` field and optional parameters.

### Available Commands

| `fn`          | Parameters                                          | Effect                                                        |
| ------------- | --------------------------------------------------- | ------------------------------------------------------------- |
| `write`       | `text: string`, optional `fg`, `bg`, `border` (hex) | Write characters at cursor position, auto-advance             |
| `newline`     | —                                                   | Move cursor to column 0 of the next row (scroll if at bottom) |
| `move`        | `col: number`, `row: number`                        | Jump cursor to absolute position (0-based)                    |
| `color`       | `fg?`, `bg?`, `border?`                             | Set cursor-scope colors                                       |
| `globalColor` | `fg?`, `bg?`, `border?`                             | Set screen-wide global colors                                 |
| `pulse`       | `target: "fg"\|"bg"\|"border"`, `enabled: boolean`  | Toggle cursor-scope pulse animation                           |
| `globalPulse` | `target: "fg"\|"bg"\|"border"`, `enabled: boolean`  | Toggle global pulse animation                                 |
| `scroll`      | —                                                   | Scroll screen content up one row                              |

### Example DSL Output

```json
{
    "commands": [
        { "fn": "globalColor", "bg": "#111111", "fg": "#eeeeee" },
        { "fn": "move", "col": 10, "row": 5 },
        { "fn": "color", "fg": "#ff0000", "bg": "#000000" },
        { "fn": "pulse", "target": "bg", "enabled": true },
        { "fn": "write", "text": "HAPPY BIRTHDAY!" },
        { "fn": "newline" },
        { "fn": "globalPulse", "target": "fg", "enabled": true },
        { "fn": "write", "text": "Have a great day :)" }
    ]
}
```

---

## Implementation Details

### `AiDsl.ts`

A class with one method per DSL command. Each method appends `Instruction` objects to an internal array. Exposes a `compile(commands)` method that iterates the parsed command array, dispatches to the right method, and returns a `DemoFormat`.

Unknown `fn` values are logged as warnings and skipped.

### `AiGenerator.ts`

Responsibilities:

- Build the system prompt (DSL reference + grid constraints + examples)
- Call `https://api.openai.com/v1/chat/completions` with:
    - `model: "gpt-4o"`
    - `response_format: { type: "json_object" }`
    - `temperature: 0.8`
- Parse and validate the response
- Delegate to `AiDsl` for compilation
- Return a `DemoFormat`

API key is read from `localStorage` (`retrowriter.openai.api_key`).

### `AiDialog.ts`

Pure HTML/CSS overlay injected into `document.body`. Two views:

**Key entry view** (shown when no key is stored):

- API key input field + Save button
- Note that key is stored in localStorage

**Prompt view** (normal flow):

- Textarea for the user's prompt
- "Generate" button (disabled while empty or while generating)
- "⚙ Change key" link to switch to key entry view
- Inline status/error area

While the dialog is open, `App` suppresses canvas keyboard events.

### `App.ts` changes

- Add `CTRL+G` handler in `#onKeyDown` → open `AiDialog`
- On dialog success: `writer.importDemo(data); writer.play()`
- Dialog open/close toggles a flag that gates canvas key handling

---

## Error Handling

| Situation            | Behaviour                                  |
| -------------------- | ------------------------------------------ |
| No API key           | Dialog switches to key-entry view          |
| Empty prompt         | Generate button stays disabled             |
| Network / HTTP error | Error message shown inline in dialog       |
| Invalid JSON from AI | "AI returned invalid response — try again" |
| Unknown DSL command  | Warning logged, command skipped            |

---

## Out of Scope

- Model selection UI (hardcoded `gpt-4o` for now)
- Streaming / live preview (full generation then play)
- Backend proxy / server-side key storage
- Saving generated demos automatically
- Multiple rounds of refinement / chat history
