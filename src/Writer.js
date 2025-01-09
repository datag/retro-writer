import Cell from './Cell';
import Cursor from './Cursor';
import Instruction from './Instruction';
import Demo from './Demo';

export default class Writer {
    static colorPalette = [
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

    /** @type {HTMLCanvasElement} */
    #canvas;

    /** @type {CanvasRenderingContext2D} */
    #ctx;

    /** @type {number} Number of columns */
    #cols;

    /** @type {number} Number of rows */
    #rows;

    /** @type {Demo} */
    #demo = new Demo();

    /** @type {number} */
    #borderWidth = 2;

    /** @type {number} Speed between 0 and 1 (float) */
    #speed = .5;


    // From here on properties to be set on init()...

    /** @type {number} Timestamp of last frame render */
    #lastRun;

    /** @type {*} */
    #debug;

    /** @type {Cell[]} */
    #cells;

    /** @type {number} Timestamp of last cycle */
    #cycleLastTimestamp;

    /** @type {number} Cycle value between 0 and 255 */
    #cycleVal;

    /** @type {bool} Cycle direction (up=true, down=false) */
    #cycleUp;

    /** @type {number} Timestamp of last afterflow decrement */
    #afterglowLastTimestamp;

    /** @type {Cell} */
    #globalStyle = new Cell();

    /** @type {Cursor} */
    #cursor;

    /** @type {number} Calculated cell width */
    #cellWidth;

    /** @type {number} Calculated cell height */
    #cellHeight;

    /**
     * @type {boolean}
     * @todo Introduce state machine: Menu, Record, Playback, ...
     */
    #playback;

    /** @type {number} Timestamp of last playback instruction */
    #playbackLastTimestamp = 0;


    /**
     * @param {HTMLCanvasElement} canvas
     * @param {number} width Canvas width in px
     * @param {number} height Canvas height in px
     * @param {number} cols Number of columns
     * @param {number} rows Number of rows
     */
    constructor(canvas, width, height, cols = 40, rows = 25) {
        this.#canvas = canvas;

        this.#canvas.width = width;
        this.#canvas.height = height;

        this.#ctx = canvas.getContext('2d');

        /** @type {number} */
        this.#cols = cols;

        /** @type {number} */
        this.#rows = rows;

        this.init();
    }

    init() {
        this.#lastRun = performance.now();

        this.#debug = null;

        this.#cells = [];
        for (let i = 0; i < this.#cols * this.#rows; i++) {
            this.#cells.push(new Cell());
        }

        this.#cycleLastTimestamp = 0;
        this.#cycleVal = 0;
        this.#cycleUp = true;

        this.#afterglowLastTimestamp = 0;

        this.#globalStyle = new Cell();
        this.#globalStyle.foregroundColor = '#eeeeee';
        this.#globalStyle.backgroundColor = '#111111';
        this.#globalStyle.borderColor = '#222222';

        this.#cursor = new Cursor();

        this.#cellWidth = (this.#canvas.width - this.#borderWidth * 2) / this.#cols;
        this.#cellHeight = (this.#canvas.height - this.#borderWidth * 2) / this.#rows;

        this.#playback = false;

        this.#playbackLastTimestamp = 0;
    }

    /**
     * @param {number} timestamp Current timestamp
     */
    mainLoop(timestamp) {
        const delta = (timestamp - this.#lastRun) / 1000;
        const fps = 1 / delta;

        this.#handleInput();
        this.#update(timestamp);
        this.#render(fps);

        this.#lastRun = timestamp;
        requestAnimationFrame(this.mainLoop.bind(this));
    }

    play() {
        this.init();
        this.#playback = true;
        this.#playbackLastTimestamp = 0;
        this.#demo.resetInstructionIndex();
    }

    getCell(col, row) {
        return this.#cells[row * this.#cols + col];
    }

    static #to2DigitHex(value) {
        return value.toString(16).padStart(2, '0');
    }

    #handleInput() {
    }

    /**
     * @param {number} timestamp Current timestamp
     */
    #update(timestamp) {
        if (this.#playback) {
            const msPlaybackWait = 100 * (1 - this.#speed);

            if (timestamp - this.#playbackLastTimestamp > msPlaybackWait) {
                const instruction = this.#demo.nextInstruction();
                if (instruction !== null) {
                    const delay = this.#executeInstruction(instruction);

                    this.#playbackLastTimestamp = timestamp;
                    if (!delay) {
                        this.#playbackLastTimestamp = 0;
                    }
                } else {
                    this.#playback = false;
                    console.info('Playback stopped');
                }
            }
        }

        // Cycle
        const msCycleWait = 50 * (1 - this.#speed);

        if (timestamp - this.#cycleLastTimestamp > msCycleWait) {
            // TODO: Cycle with quadratic function instead of linear?
            if (this.#cycleUp) {
                this.#cycleVal += 10;
                if (this.#cycleVal >= 255) {
                    this.#cycleVal = 255;
                    this.#cycleUp = false;
                }
            } else {
                this.#cycleVal -= 20;
                if (this.#cycleVal <= 0) {
                    this.#cycleVal = 0;
                    this.#cycleUp = true;
                }
            }

            this.#cycleLastTimestamp = timestamp;
        }

        // Afterglow
        const msAfterglowWait = 5 * (1 - this.#speed);

        if (timestamp - this.#afterglowLastTimestamp > msAfterglowWait) {
            for (let row = 0; row < this.#rows; row++) {
                for (let col = 0; col < this.#cols; col++) {
                    const cell = this.getCell(col, row);

                    if (this.#globalStyle.backgroundPulse) {
                        cell.afterglowCounter = null;       // reset any afterglow
                    } else if (cell.afterglowCounter !== null) {
                        cell.afterglowCounter -= 5;
                        if (cell.afterglowCounter <= 0) {
                            cell.afterglowCounter = null;
                        }
                    }
                }
            }

            this.#afterglowLastTimestamp = timestamp;
        }
    }

    /**
     * @param {number} fps Calculated frames per second (float)
     */
    #render(fps) {
        const c = this.#ctx;

        c.clearRect(0, 0, this.#canvas.width, this.#canvas.height);

        this.#renderCells();
        this.#renderCursor();

        this.#renderInfo(fps);
        this.#renderDebug();
    }

    /**
     * @param {number} fps Calculated frames per second (float)
     */
    #renderInfo(fps) {
        const c = this.#ctx;
        let infoParts = [Math.floor(fps) + ' fps'];

        c.fillStyle = 'Gray';
        c.font = '0.75rem monospace';
        c.fillText(infoParts.join(' · '), 2, 12);
    }

    #renderDebug() {
        const c = this.#ctx;

        if (!this.#debug) {
            return;
        }

        c.fillStyle = 'Red';
        c.fillText(JSON.stringify(this.#debug), 2, 30);
    }

    #renderCells() {
        const c = this.#ctx;

        for (let row = 0; row < this.#rows; row++) {
            for (let col = 0; col < this.#cols; col++) {
                const cell = this.getCell(col, row);

                // Background
                c.beginPath();
                c.rect(
                    col * this.#cellWidth + this.#borderWidth/2, row * this.#cellHeight + this.#borderWidth/2,
                    this.#cellWidth - this.#borderWidth, this.#cellHeight - this.#borderWidth
                );

                let color = this.#globalStyle.backgroundColor;
                let transparency = null;
                if (cell.backgroundColor !== null) {
                    color = cell.backgroundColor;
                    if (cell.backgroundPulse) {
                        transparency = this.#cycleVal;
                    }
                } else if (this.#globalStyle.backgroundPulse) {
                    transparency = this.#cycleVal;
                } else if (cell.afterglowCounter !== null) {
                    color = cell.afterglowColor;
                    transparency = Math.ceil(cell.afterglowCounter * .5);
                }
                c.fillStyle = color + (transparency !== null ? Writer.#to2DigitHex(transparency) : '');
                c.fill();

                // Border
                color = this.#globalStyle.borderColor;
                transparency = null;
                if (cell.borderColor !== null) {
                    color = cell.borderColor;
                    if (cell.borderPulse) {
                        transparency = this.#cycleVal;
                    }
                } else if (this.#globalStyle.borderPulse) {
                    transparency = this.#cycleVal;
                }
                c.strokeStyle = color + (transparency !== null ? Writer.#to2DigitHex(transparency) : '');
                c.lineWidth = this.#borderWidth;
                c.stroke();

                // Character
                if (cell.character !== null) {
                    const fontSize = this.#cellHeight * .6;
                    color = this.#globalStyle.foregroundColor;
                    transparency = null;
                    if (cell.foregroundColor !== null) {
                        color = cell.foregroundColor;
                        if (cell.foregroundPulse) {
                            transparency = this.#cycleVal;
                        }
                    } else if (this.#globalStyle.foregroundPulse) {
                        transparency = this.#cycleVal;
                    }
                    c.fillStyle = color + (transparency !== null ? Writer.#to2DigitHex(transparency) : '');
                    c.font = `bold ${fontSize}px monospace`;
                    const metrics = c.measureText(cell.character);
                    c.fillText(
                        cell.character,
                        col * this.#cellWidth + this.#cellWidth/2 + this.#borderWidth/2 - metrics.width / 2,
                        row * this.#cellHeight + this.#cellHeight + this.#borderWidth/2 - fontSize / 2,
                    );
                }
            }
        }
    }

    #renderCursor() {
        const c = this.#ctx;
        const cursor = this.#cursor;
        const col = cursor.col;
        const row = cursor.row;

        c.beginPath();
        c.rect(
            col * this.#cellWidth + this.#borderWidth/2, row * this.#cellHeight + this.#borderWidth/2,
            this.#cellWidth - this.#borderWidth, this.#cellHeight - this.#borderWidth
        );

        let color = cursor.cell.backgroundColor ?? '#aaaaaa';   // fallback color
        c.fillStyle = color + Writer.#to2DigitHex(this.#cycleVal) /* transparency */;
        c.fill();

        c.lineWidth = this.#borderWidth;
        c.strokeStyle = cursor.cell.borderColor + Writer.#to2DigitHex(this.#cycleVal) /* transparency */;
        c.stroke();
    }

    /**
     * @param {number} col Column index
     * @param {number} row Row index
     * @param {?string} color Color to set
     * @param {number} counter Start value; Integer from 0 to 255
     */
    #triggerAfterglow(col = this.#cursor.col, row = this.#cursor.row, color = this.#cursor.cell.backgroundColor, counter = this.#cycleVal) {
        const cell = this.getCell(col, row);

        if (color === null) {
            color = '#eeeeee';
        }

        cell.afterglowColor = color;
        cell.afterglowCounter = counter;
    }

    /**
     * @param {Instruction} instruction
     */
    #record(instruction) {
        if (!this.#playback) {
            this.#demo.addInstruction(instruction);
        }
    }

    /**
     * @param {Instruction} instruction
     * @returns {boolean} false if the should be no delay after this instruction (i.e. on character instruction).
     */
    #executeInstruction(instruction) {
        const m = instruction.mnemonic;
        const a1 = instruction.argument1;
        const a2 = instruction.argument2;

        let delay = true;

        if (m === Instruction.scroll) {
            this.scroll();
        } else if (m === Instruction.cursorUp) {
            this.cursorUp();
        } else if (m === Instruction.cursorDown) {
            this.cursorDown();
        } else if (m === Instruction.cursorLeft) {
            this.cursorLeft();
        } else if (m === Instruction.cursorRight) {
            this.cursorRight();
        } else if (m === Instruction.advance) {
            this.advance();
        } else if (m === Instruction.retract) {
            this.retract();
        } else if (m === Instruction.character) {
            this.character(a1);
            delay = false;
        } else if (m === Instruction.clearCell) {
            this.clearCell();
        } else if (m === Instruction.cursorForegroundColor) {
            this.setColor('cursor', 'foreground', a1);
        } else if (m === Instruction.cursorBackgroundColor) {
            this.setColor('cursor', 'background', a1);
        } else if (m === Instruction.cursorBorderColor) {
            this.setColor('cursor', 'border', a1);
        } else if (m === Instruction.globalForegroundColor) {
            this.setColor('global', 'foreground', a1);
        } else if (m === Instruction.globalBackgroundColor) {
            this.setColor('global', 'background', a1);
        } else if (m === Instruction.globalBorderColor) {
            this.setColor('global', 'border', a1);
        } else if (m === Instruction.cursorForegroundPulse) {
            this.setPulse('cursor', 'foreground', a1);
        } else if (m === Instruction.cursorBackgroundPulse) {
            this.setPulse('cursor', 'background', a1);
        } else if (m === Instruction.cursorBorderPulse) {
            this.setPulse('cursor', 'border', a1);
        } else if (m === Instruction.globalForegroundPulse) {
            this.setPulse('global', 'foreground', a1);
        } else if (m === Instruction.globalBackgroundPulse) {
            this.setPulse('global', 'background', a1);
        } else if (m === Instruction.globalBorderPulse) {
            this.setPulse('global', 'border', a1);
        } else {
            console.warn(`Instruction with mnemonic ${m} not handled`);
            delay = false;
        }

        return delay;
    }

    scroll() {
        this.#record(new Instruction(Instruction.scroll));

        // Remove first row
        this.#cells.splice(0, this.#cols);

        // Insert empty new row
        for (let i = 0; i < this.#cols; i++) {
            this.#cells.push(new Cell());
        }

        // Afterglow
        for (let row = 0; row < this.#rows - 1 /* excluding last row */; row++) {
            for (let col = 0; col < this.#cols; col++) {
                const cell = this.getCell(col, row);

                // TODO: Support afterglow for border and character
                if (cell.backgroundColor === null) {
                    continue;
                }

                this.#triggerAfterglow(col, row + 1, cell.backgroundColor, cell.backgroundPulse ? this.#cycleVal : 255);
            }
        }
    }

    cursorUp() {
        this.#record(new Instruction(Instruction.cursorUp));

        if (this.#cursor.row === 0) {
            return;
        }

        this.#triggerAfterglow();
        this.#cursor.row--;
    }

    cursorDown() {
        this.#record(new Instruction(Instruction.cursorDown));

        if (this.#cursor.row === this.#rows - 1) {
            this.scroll();
            return;
        }

        this.#triggerAfterglow();
        this.#cursor.row++;
    }

    cursorLeft() {
        this.#record(new Instruction(Instruction.cursorLeft));

        this.#triggerAfterglow();
        if (this.#cursor.col === 0) {
            this.#cursor.col = this.#cols - 1;
        } else {
            this.#cursor.col--;
        }
    }

    cursorRight() {
        this.#record(new Instruction(Instruction.cursorRight));

        this.#triggerAfterglow();
        if (this.#cursor.col === this.#cols - 1) {
            this.#cursor.col = 0;
        } else {
            this.#cursor.col++;
        }
    }

    advance() {
        this.#record(new Instruction(Instruction.advance));

        const cursor = this.#cursor;

        if (cursor.col === this.#cols - 1) {
            if (cursor.row !== this.#rows - 1) {
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

    /**
     * @returns {boolean} false if retract could not be performed (i.e. when at first row and first column).
     */
    retract() {
        this.#record(new Instruction(Instruction.retract));

        const cursor = this.#cursor;

        if (cursor.col === 0) {
            if (cursor.row !== 0) {
                this.#triggerAfterglow();
                cursor.col = this.#cols - 1;
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

    /**
     * @param {string} character
     */
    character(character) {
        this.#record(new Instruction(Instruction.character, character));

        const cursor = this.#cursor;
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
        this.#record(new Instruction(Instruction.clearCell));

        const cursor = this.#cursor;

        this.#cells[cursor.row * this.#cols + cursor.col] = new Cell();
    }

    /**
     * @param {('cursor'|'global')} scope
     * @param {('foreground'|'background'|'border')} target
     * @param {?string} color
     */
    setColor(scope, target, color) {
        const cell = scope === 'cursor' ? this.#cursor.cell : this.#globalStyle;

        if (scope === 'global' && color === null) {
            console.warn(`Not unsetting global color for ${target}`);
            return;
        }

        let mnemonic = null;

        if (target === 'foreground') {
            cell.foregroundColor = color;
            mnemonic = Instruction.cursorForegroundColor;
        } else if (target === 'background') {
            cell.backgroundColor = color;
            mnemonic = Instruction.cursorBackgroundColor;
        } else if (target === 'border') {
            cell.borderColor = color;
            mnemonic = Instruction.cursorBorderColor;
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
        const cell = scope === 'cursor' ? this.#cursor.cell : this.#globalStyle;

        let mnemonic = null;

        if (target === 'foreground') {
            cell.foregroundPulse = enabled;
            mnemonic = Instruction.cursorForegroundPulse;
        } else if (target === 'background') {
            cell.backgroundPulse = enabled;
            mnemonic = Instruction.cursorBackgroundPulse;
        } else if (target === 'border') {
            cell.borderPulse = enabled;
            mnemonic = Instruction.cursorBorderPulse;
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
