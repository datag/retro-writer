import { Demo, DemoFormat } from './Demo';
import Instruction from './Instruction';

interface DslCommand {
    fn: string;
    text?: string;
    col?: number;
    row?: number;
    count?: number;
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

    compile(commands: DslCommand[], prompt?: string, model?: string): DemoFormat {
        this.#instructions = [];
        this.#cursorCol = 0;
        this.#cursorRow = 0;

        for (const cmd of commands) {
            this.#dispatch(cmd);
        }

        const header: { version: string; ai?: { prompt: string; model: string } } = {
            version: import.meta.env.VITE_PACKAGE_VERSION ?? '0.0.0',
        };
        if (prompt !== undefined && model !== undefined) {
            header.ai = { prompt, model };
        }

        return {
            magic: Demo.magic,
            header,
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
            case 'retract':
                this.#retract(cmd.count ?? 1);
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

            // Mirror Writer.advance() logic to track virtual cursor position
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

        // Move rows first (avoids accidental scroll from cursorDown at last row while at wrong col)
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

    #retract(count: number) {
        for (let i = 0; i < count; i++) {
            this.#instructions.push(new Instruction(Instruction.retract));
            if (this.#cursorCol > 0) {
                this.#cursorCol--;
            } else if (this.#cursorRow > 0) {
                this.#cursorCol = AiDsl.COLS - 1;
                this.#cursorRow--;
            }
        }
    }
}
