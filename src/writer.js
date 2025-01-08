class Cell {
    constructor() {
        this.foregroundColor = null;
        this.foregroundPulse = false;

        this.backgroundColor = null;
        this.backgroundPulse = false;

        this.borderColor = null;
        this.borderPulse = false;

        this.afterglowColor = null;     // TODO: Change to CellStyle and also handle border and character in afterglow
        this.afterglowCounter = null;

        this.character = null;
    }
}

class Cursor {
    constructor() {
        /** @type {number} */
        this.col = 0;

        /** @type {number} */
        this.row = 0;

        /** @type {Cell} */
        this.cell = new Cell();
    }
}

class Instruction {
    static CursorUp       = 'CUP';
    static CursorDown     = 'CDW';
    static CursorLeft     = 'CLF';
    static CursorRight    = 'CRT';
    static Scroll         = 'SCR';
    static Advance        = 'ADV';
    static Retract        = 'RCT';
    static Character      = 'CHR';
    static ClearCell      = 'CLR';

    static CursorForegroundColor = 'CFC';
    static CursorBackgroundColor = 'CBC';
    static CursorBorderColor = 'CDC';
    static CursorForegroundPulse = 'CFP';
    static CursorBackgroundPulse = 'CBP';
    static CursorBorderPulse = 'CDP';

    static GlobalForegroundColor = 'GFC';
    static GlobalBackgroundColor = 'GBC';
    static GlobalBorderColor = 'GDC';
    static GlobalForegroundPulse = 'GFP';
    static GlobalBackgroundPulse = 'GBP';
    static GlobalBorderPulse = 'GDP';

    constructor(mnemonic, argument1 = null, argument2 = null) {
        this.mnemonic = mnemonic;
        this.argument1 = argument1;
        this.argument2 = argument2;
    }
}

class Demo {
    constructor() {
        this.version = '0.1.0';     // TODO: Use VITE variable with version from package.json

        /** @type {Instruction[]} */
        this.instructions = [];

        /** @type {?number} */
        this.instructionIndex = null;
    }

    addInstruction(instruction) {
        this.instructions.push(instruction);
    }

    resetInstructionIndex() {
        this.instructionIndex = 0;
    }

    nextInstruction() {
        const count = this.instructions.length;
        const index = this.instructionIndex;

        if (count == 0 || index === null) {
            return null;
        }

        const instruction = this.instructions[index];

        if (index < count - 1) {
            this.instructionIndex++;
        } else {
            this.instructionIndex = null;
        }

        return instruction;
    }
}

export class Writer {
    constructor(canvas, width, height, cols = 40, rows = 25) {
        /** @type {HTMLCanvasElement} */
        this.canvas = canvas;

        this.canvas.width = width;
        this.canvas.height = height;

        /** @type {CanvasRenderingContext2D} */
        this.ctx = canvas.getContext('2d');

        /** @type {number} */
        this.cols = cols;

        /** @type {number} */
        this.rows = rows;

        /** @type {Demo} */
        this.demo = new Demo();

        this.init();
    }

    static debugColors = [
        '#ff0000', // Red
        '#00ff00', // Green
        '#3399ff', // Lighter Blue
        '#ffff00', // Yellow
        '#ff00ff', // Magenta
        '#00ffff', // Cyan
        '#ff9900', // Orange
        '#9900ff', // Purple
        '#eeeeee', // Almost white
        '#111111', // Almost black
    ];

    init() {
        /** @type {number} */
        this.lastRun = performance.now();

        /** @type {*} */
        this.debug = null;

        /** @type {Cell[]} */
        this.cells = [];
        for (let i = 0; i < this.cols * this.rows; i++) {
            this.cells.push(new Cell());
        }

        /** @type {number} Timestamp of last cycle */
        this.cycleLastTimestamp = 0;

        /** @type {number} Cycle value between 0 and 255 */
        this.cycleVal = 0;

        /** @type {bool} Cycle direction (up=true, down=false) */
        this.cycleUp = true;

        /** @type {number} Timestamp of last afterflow decrement */
        this.afterglowLastTimestamp = 0;

        /** @type {number} Speed between 0 and 1 */
        this.speed = .5;

        /** @type {Cell} */
        this.globalStyle = new Cell();
        this.globalStyle.foregroundColor = '#eeeeee';
        this.globalStyle.backgroundColor = '#111111';
        this.globalStyle.borderColor = '#222222';
        this.borderWidth = 2;

        /** @type {Cursor} */
        this.cursor = new Cursor();

        this.cellWidth = (this.canvas.width - this.borderWidth * 2) / this.cols;
        this.cellHeight = (this.canvas.height - this.borderWidth * 2) / this.rows;

        // FIXME: Introduce state machine: Menu, Record, Playback, ...
        /** @type {boolean} */
        this.playback = false;

        /** @type {number} Timestamp of last playback instruction */
        this.playbackLastTimestamp = 0;
    }

    mainLoop(timestamp) {
        const delta = (timestamp - this.lastRun) / 1000;
        const fps = 1 / delta;

        this.#handleInput();
        this.#update(timestamp);
        this.#render(fps);

        this.lastRun = timestamp;
        requestAnimationFrame(this.mainLoop.bind(this));
    }

    play() {
        this.init();
        this.playback = true;
        this.playbackLastTimestamp = 0;
        this.demo.resetInstructionIndex();
    }

    getCell(col, row) {
        return this.cells[row * this.cols + col];
    }

    static #to2DigitHex(value) {
        return value.toString(16).padStart(2, '0');
    }

    #handleInput() {
    }

    #update(timestamp) {
        if (this.playback) {
            const msPlaybackWait = 100 * (1 - this.speed);

            if (timestamp - this.playbackLastTimestamp > msPlaybackWait) {
                const instruction = this.demo.nextInstruction();
                if (instruction !== null) {
                    const delay = this.#executeInstruction(instruction);

                    this.playbackLastTimestamp = timestamp;
                    if (!delay) {
                        this.playbackLastTimestamp = 0;
                    }
                } else {
                    this.playback = false;
                    console.info('Plackback stopped');
                }
            }
        }

        // Cycle
        const msCycleWait = 50 * (1 - this.speed);

        if (timestamp - this.cycleLastTimestamp > msCycleWait) {
            // TODO: Cycle with quadratic function instead of linear?
            if (this.cycleUp) {
                this.cycleVal += 10;
                if (this.cycleVal >= 255) {
                    this.cycleVal = 255;
                    this.cycleUp = false;
                }
            } else {
                this.cycleVal -= 20;
                if (this.cycleVal <= 0) {
                    this.cycleVal = 0;
                    this.cycleUp = true;
                }
            }

            this.cycleLastTimestamp = timestamp;
        }

        // Afterglow
        const msAfterglowWait = 5 * (1 - this.speed);

        if (timestamp - this.afterglowLastTimestamp > msAfterglowWait) {
            for (let row = 0; row < this.rows; row++) {
                for (let col = 0; col < this.cols; col++) {
                    const cell = this.getCell(col, row);

                    if (this.globalStyle.backgroundPulse) {
                        cell.afterglowCounter = null;       // reset any afterglow
                    } else if (cell.afterglowCounter !== null) {
                        cell.afterglowCounter -= 5;
                        if (cell.afterglowCounter <= 0) {
                            cell.afterglowCounter = null;
                        }
                    }
                }
            }

            this.afterglowLastTimestamp = timestamp;
        }
    }

    #render(fps) {
        const c = this.ctx;

        c.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.#renderCells();
        this.#renderCursor();

        this.#renderInfo(fps);
        this.#renderDebug();
    }

    #renderInfo(fps) {
        const c = this.ctx;
        let infoParts = [Math.floor(fps) + ' fps'];

        c.fillStyle = 'Gray';
        c.font = '0.75rem monospace';
        c.fillText(infoParts.join(' · '), 2, 12);
    }

    #renderDebug() {
        const c = this.ctx;

        if (!this.debug) {
            return;
        }

        c.fillStyle = 'Red';
        c.fillText(JSON.stringify(this.debug), 2, 30);
    }

    #renderCells() {
        const c = this.ctx;

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = this.getCell(col, row);

                // Background
                c.beginPath();
                c.rect(
                    col * this.cellWidth + this.borderWidth/2, row * this.cellHeight + this.borderWidth/2,
                    this.cellWidth - this.borderWidth, this.cellHeight - this.borderWidth
                );

                let color = this.globalStyle.backgroundColor;
                let transparency = null;
                if (cell.backgroundColor !== null) {
                    color = cell.backgroundColor;
                    if (cell.backgroundPulse) {
                        transparency = this.cycleVal;
                    }
                } else if (this.globalStyle.backgroundPulse) {
                    transparency = this.cycleVal;
                } else if (cell.afterglowCounter !== null) {
                    color = cell.afterglowColor;
                    transparency = Math.ceil(cell.afterglowCounter * .5);
                }
                c.fillStyle = color + (transparency !== null ? Writer.#to2DigitHex(transparency) : '');
                c.fill();

                // Border
                color = this.globalStyle.borderColor;
                transparency = null;
                if (cell.borderColor !== null) {
                    color = cell.borderColor;
                    if (cell.borderPulse) {
                        transparency = this.cycleVal;
                    }
                } else if (this.globalStyle.borderPulse) {
                    transparency = this.cycleVal;
                }
                c.strokeStyle = color + (transparency !== null ? Writer.#to2DigitHex(transparency) : '');
                c.lineWidth = this.borderWidth;
                c.stroke();

                // Character
                if (cell.character !== null) {
                    const fontSize = this.cellHeight * .6;
                    color = this.globalStyle.foregroundColor;
                    transparency = null;
                    if (cell.foregroundColor !== null) {
                        color = cell.foregroundColor;
                        if (cell.foregroundPulse) {
                            transparency = this.cycleVal;
                        }
                    } else if (this.globalStyle.foregroundPulse) {
                        transparency = this.cycleVal;
                    }
                    c.fillStyle = color + (transparency !== null ? Writer.#to2DigitHex(transparency) : '');
                    c.font = `bold ${fontSize}px monospace`;
                    const metrics = c.measureText(cell.character);
                    c.fillText(
                        cell.character,
                        col * this.cellWidth + this.cellWidth/2 + this.borderWidth/2 - metrics.width / 2,
                        row * this.cellHeight + this.cellHeight + this.borderWidth/2 - fontSize / 2,
                    );
                }
            }
        }
    }

    #renderCursor() {
        const c = this.ctx;
        const cursor = this.cursor;
        const col = cursor.col;
        const row = cursor.row;

        c.beginPath();
        c.rect(
            col * this.cellWidth + this.borderWidth/2, row * this.cellHeight + this.borderWidth/2,
            this.cellWidth - this.borderWidth, this.cellHeight - this.borderWidth
        );

        let color = cursor.cell.backgroundColor ?? '#aaaaaa';   // fallback color
        c.fillStyle = color + Writer.#to2DigitHex(this.cycleVal) /* transparency */;
        c.fill();

        c.lineWidth = this.borderWidth;
        c.strokeStyle = cursor.cell.borderColor + Writer.#to2DigitHex(this.cycleVal) /* transparency */;
        c.stroke();
    }

    #triggerAfterglow(col = this.cursor.col, row = this.cursor.row, color = this.cursor.cell.backgroundColor, counter = this.cycleVal) {
        const cell = this.getCell(col, row);

        if (color === null) {
            color = '#eeeeee';
        }

        cell.afterglowColor = color;
        cell.afterglowCounter = counter;
    }

    #record(instruction) {
        if (!this.playback) {
            this.demo.addInstruction(instruction);
        }
    }

    #executeInstruction(instruction) {
        const m = instruction.mnemonic;
        const a1 = instruction.argument1;
        const a2 = instruction.argument2;

        let delay = true;

        if (m === Instruction.Scroll) {
            this.scroll();
        } else if (m === Instruction.CursorUp) {
            this.cursorUp();
        } else if (m === Instruction.CursorDown) {
            this.cursorDown();
        } else if (m === Instruction.CursorLeft) {
            this.cursorLeft();
        } else if (m === Instruction.CursorRight) {
            this.cursorRight();
        } else if (m === Instruction.Advance) {
            this.advance();
        } else if (m === Instruction.Retract) {
            this.retract();
        } else if (m === Instruction.Character) {
            this.character(a1);
            delay = false;
        } else if (m === Instruction.ClearCell) {
            this.clearCell();
        } else if (m === Instruction.CursorForegroundColor) {
            this.setColor('cursor', 'foreground', a1);
        } else if (m === Instruction.CursorBackgroundColor) {
            this.setColor('cursor', 'background', a1);
        } else if (m === Instruction.CursorBorderColor) {
            this.setColor('cursor', 'border', a1);
        } else if (m === Instruction.GlobalForegroundColor) {
            this.setColor('global', 'foreground', a1);
        } else if (m === Instruction.GlobalBackgroundColor) {
            this.setColor('global', 'background', a1);
        } else if (m === Instruction.GlobalBorderColor) {
            this.setColor('global', 'border', a1);
        } else if (m === Instruction.CursorForegroundPulse) {
            this.setPulse('cursor', 'foreground', a1);
        } else if (m === Instruction.CursorBackgroundPulse) {
            this.setPulse('cursor', 'background', a1);
        } else if (m === Instruction.CursorBorderPulse) {
            this.setPulse('cursor', 'border', a1);
        } else if (m === Instruction.GlobalForegroundPulse) {
            this.setPulse('global', 'foreground', a1);
        } else if (m === Instruction.GlobalBackgroundPulse) {
            this.setPulse('global', 'background', a1);
        } else if (m === Instruction.GlobalBorderPulse) {
            this.setPulse('global', 'border', a1);
        } else {
            console.warn(`Instruction with mnemonic ${m} not handled`);
            delay = false;
        }

        return delay;
    }

    scroll() {
        this.#record(new Instruction(Instruction.Scroll));

        // Remove first row
        this.cells.splice(0, this.cols);

        // Insert empty new row
        for (let i = 0; i < this.cols; i++) {
            this.cells.push(new Cell());
        }

        // Afterglow
        for (let row = 0; row < this.rows - 1 /* excluding last row */; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = this.getCell(col, row);

                // TODO: Support afterglow for border and character
                if (cell.backgroundColor === null) {
                    continue;
                }

                this.#triggerAfterglow(col, row + 1, cell.backgroundColor, cell.backgroundPulse ? this.cycleVal : 255);
            }
        }
    }

    cursorUp() {
        this.#record(new Instruction(Instruction.CursorUp));

        if (this.cursor.row === 0) {
            return;
        }

        this.#triggerAfterglow();
        this.cursor.row--;
    }

    cursorDown() {
        this.#record(new Instruction(Instruction.CursorDown));

        if (this.cursor.row === this.rows - 1) {
            this.scroll();
            return;
        }

        this.#triggerAfterglow();
        this.cursor.row++;
    }

    cursorLeft() {
        this.#record(new Instruction(Instruction.CursorLeft));

        this.#triggerAfterglow();
        if (this.cursor.col === 0) {
            this.cursor.col = this.cols - 1;
        } else {
            this.cursor.col--;
        }
    }

    cursorRight() {
        this.#record(new Instruction(Instruction.CursorRight));

        this.#triggerAfterglow();
        if (this.cursor.col === this.cols - 1) {
            this.cursor.col = 0;
        } else {
            this.cursor.col++;
        }
    }

    advance() {
        this.#record(new Instruction(Instruction.Advance));

        const cursor = this.cursor;

        if (cursor.col === this.cols - 1) {
            if (cursor.row !== this.rows - 1) {
                this.#triggerAfterglow();
                cursor.col = 0;
                cursor.row++;
            } else {
                this.scroll();
                cursor.col = 0;
            }
        } else {
            this.#triggerAfterglow();
            cursor.col++;
        }
    }

    retract() {
        this.#record(new Instruction(Instruction.Retract));

        const cursor = this.cursor;

        if (cursor.col === 0) {
            if (cursor.row !== 0) {
                this.#triggerAfterglow();
                cursor.col = this.cols - 1;
                cursor.row--;
            } else {
                return false;
            }
        } else {
            this.#triggerAfterglow();
            cursor.col--;
        }

        return true;
    }

    character(character) {
        this.#record(new Instruction(Instruction.Character, character));

        const cursor = this.cursor;
        const col = cursor.col;
        const row = cursor.row;
        const cell = this.getCell(col, row);

        cell.character = character;

        cell.foregroundColor = cursor.cell.foregroundColor;
        cell.foregroundPulse = cursor.cell.foregroundPulse;

        cell.backgroundColor = cursor.cell.backgroundColor;
        cell.backgroundPulse = cursor.cell.backgroundPulse;

        cell.borderColor = cursor.cell.borderColor;
        cell.borderPulse = cursor.cell.borderPulse;
    }

    clearCell() {
        this.#record(new Instruction(Instruction.ClearCell));

        const cursor = this.cursor;

        this.cells[cursor.row * this.cols + cursor.col] = new Cell();
    }

    /**
     * @param {('cursor'|'global')} scope
     * @param {('foreground'|'background'|'border')} target
     * @param {?string} color
     */
    setColor(scope, target, color) {
        const cell = scope === 'cursor' ? this.cursor.cell : this.globalStyle;

        if (scope === 'global' && color === null) {
            console.warn(`Not unsetting global color for ${target}`);
            return;
        }

        let mnemonic = null;

        if (target === 'foreground') {
            cell.foregroundColor = color;
            mnemonic = Instruction.CursorForegroundColor;
        } else if (target === 'background') {
            cell.backgroundColor = color;
            mnemonic = Instruction.CursorBackgroundColor;
        } else if (target === 'border') {
            cell.borderColor = color;
            mnemonic = Instruction.CursorBorderColor;
        } else {
            console.error(`Target '${target}' not implemented`);
            return;
        }

        if (scope === 'global') {
            // Replace first character 'C' (cell) with 'G' (global)
            mnemonic = 'G' + mnemonic.slice(1);
        }

        this.#record(new Instruction(mnemonic, color));
    }

    /**
     * @param {('cursor'|'global')} scope
     * @param {('foreground'|'background'|'border')} target
     * @param {boolean} enabled
     */
    setPulse(scope, target, enabled) {
        const cell = scope === 'cursor' ? this.cursor.cell : this.globalStyle;

        let mnemonic = null;

        if (target === 'foreground') {
            cell.foregroundPulse = enabled;
            mnemonic = Instruction.CursorForegroundPulse;
        } else if (target === 'background') {
            cell.backgroundPulse = enabled;
            mnemonic = Instruction.CursorBackgroundPulse;
        } else if (target === 'border') {
            cell.borderPulse = enabled;
            mnemonic = Instruction.CursorBorderPulse;
        } else {
            console.error(`Target '${target}' not implemented`);
            return;
        }

        if (scope === 'global') {
            // Replace first character 'C' (cell) with 'G' (global)
            mnemonic = 'G' + mnemonic.slice(1);
        }

        this.#record(new Instruction(mnemonic, enabled));
    }
}
