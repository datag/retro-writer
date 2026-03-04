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
