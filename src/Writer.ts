import Screen from './Screen';
import { Demo, DemoFormat } from './Demo';
import Cell from './Cell';
import Cursor from './Cursor';
import Instruction from './Instruction';

interface DefaultColor {
    foreground: string;
    background: string;
    border: string;
}

interface LastTimestamp {
    run: number,
    fps: number,
    cycle: number,
    afterglow: number,
    playback: number,
}

export default class Writer {
    /** Color palette */
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

    /** Default color definitions */
    static defaultColor: DefaultColor = {
        foreground: '#eeeeee',
        background: '#111111',
        border:     '#222222',
    };

    /** Cycle maximum value */
    static cycleMax = 255;

    /** Number of columns */
    #cols: number;

    /** Number of rows */
    #rows: number;

    #screen: Screen;

    #demo: Demo = new Demo();

    /** Speed between 0 and 1 (float) */
    #speed: number = .5;

    /** Whether to show FPS and debug data */
    renderDebugInfo: boolean = false;


    // From here on properties to be set on init()...

    #appState: ('record' | 'play' | 'pause' | 'menu');

    #lastTimestamp: LastTimestamp = {
        run: 0,
        fps: 0,
        cycle: 0,
        afterglow: 0,
        playback: 0,
    };

    /** Frames per second since last calculation */
    #fps: number | null;

    #debug: any;

    #cells: Cell[];

    /** Cycle value between 0 and cycleMax */
    #cycleVal: number;

    /** Cycle direction (up=true, down=false) */
    #cycleUp: boolean;

    #globalStyle: Cell;

    #cursor: Cursor;


    /**
     * @param canvas
     * @param width Canvas width in px
     * @param height Canvas height in px
     * @param cols Number of columns
     * @param rows Number of rows
     */
    constructor(canvas: HTMLCanvasElement, width: number, height: number, cols: number = 40, rows: number = 25) {
        this.#cols = cols;
        this.#rows = rows;

        this.#screen = new Screen(canvas, width, height, cols, rows);

        this.init();
    }

    init() {
        this.#appState = 'record';

        Object.keys(this.#lastTimestamp).forEach(key => this.#lastTimestamp[key as keyof LastTimestamp] = 0);
        this.#lastTimestamp.fps = performance.now();    // Initialize with current TS to give FPS counter time to calculate

        this.#fps = null;

        this.#debug = null;

        this.#cells = [];
        for (let i = 0; i < this.#cols * this.#rows; i++) {
            this.#cells.push(new Cell());
        }

        this.#cycleVal = 0;
        this.#cycleUp = true;

        this.#globalStyle = new Cell();
        this.#globalStyle.foregroundColor = Writer.defaultColor.foreground;
        this.#globalStyle.backgroundColor = Writer.defaultColor.background;
        this.#globalStyle.borderColor = Writer.defaultColor.border;

        this.#cursor = new Cursor();
    }

    /**
     * Current timestamp
     */
    mainLoop(timestamp: number) {
        if (timestamp - this.#lastTimestamp.fps > 250) {
            const delta = (timestamp - this.#lastTimestamp.run) / 1000;
            this.#fps = 1 / delta;
            this.#lastTimestamp.fps = timestamp;
        }

        this.#update(timestamp);
        this.#screen.render(this);

        this.#lastTimestamp.run = timestamp;
        requestAnimationFrame((timestamp) => this.mainLoop(timestamp));
    }

    get appState() {
        return this.#appState;
    }

    set appState(state) {
        // TODO: Validate state transition
        this.#appState = state;
    }

    get screen() {
        return this.#screen;
    }

    get cursor() {
        return this.#cursor;
    }

    get debug() {
        return this.#debug;
    }

    get fps() {
        return this.#fps;
    }

    get cyclePercent() {
        return 100 * this.#cycleVal / Writer.cycleMax;
    }

    get globalStyle() {
        return this.#globalStyle;
    }

    exportCanvas() {
        return this.#screen.canvas.toDataURL();
    }

    exportDemo() {
        return this.#demo.export();
    }

    importDemo(data: DemoFormat) {
        return this.#demo.import(data);
    }

    play() {
        this.init();
        this.#appState = 'play';
        this.#lastTimestamp.playback = 0;
        this.#demo.resetInstructionIndex();
    }

    reset() {
        this.init();
        this.#demo = new Demo();
    }

    getCell(col: number, row: number): Cell {
        return this.#cells[row * this.#cols + col];
    }

    /**
     * @param timestamp Current timestamp
     */
    #update(timestamp: number) {
        const appState = this.#appState;

        if (appState === 'play') {
            const msPlaybackWait = 100 * (1 - this.#speed);

            if (timestamp - this.#lastTimestamp.playback > msPlaybackWait) {
                const instruction = this.#demo.nextInstruction();
                if (instruction !== null) {
                    const delay = this.#executeInstruction(instruction);

                    this.#lastTimestamp.playback = timestamp;
                    if (!delay) {
                        this.#lastTimestamp.playback = 0;
                    }
                } else {
                    this.#appState = 'record';
                    console.info('Playback stopped, switched back to record state');
                }
            }
        }

        if (['record', 'play'].includes(appState)) {
            // Cycle
            const msCycleWait = 50 * (1 - this.#speed);

            if (timestamp - this.#lastTimestamp.cycle > msCycleWait) {
                // TODO: Cycle with quadratic function instead of linear?
                if (this.#cycleUp) {
                    this.#cycleVal += 10;
                    if (this.#cycleVal >= Writer.cycleMax) {
                        this.#cycleVal = Writer.cycleMax;
                        this.#cycleUp = false;
                    }
                } else {
                    this.#cycleVal -= 20;
                    if (this.#cycleVal <= 0) {
                        this.#cycleVal = 0;
                        this.#cycleUp = true;
                    }
                }

                this.#lastTimestamp.cycle = timestamp;
            }

            // Afterglow
            const msAfterglowWait = 5 * (1 - this.#speed);

            if (timestamp - this.#lastTimestamp.afterglow > msAfterglowWait) {
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

                this.#lastTimestamp.afterglow = timestamp;
            }
        }
    }

    /**
     * @param {number} col Column index
     * @param {number} row Row index
     * @param {?string} color Color to set
     * @param {number} counter Start value; Integer from 0 to cycleMax
     */
    #triggerAfterglow(col: number = this.#cursor.col, row: number = this.#cursor.row, color: string | null = this.#cursor.cell.backgroundColor, counter: number = this.#cycleVal) {
        const cell = this.getCell(col, row);

        if (color === null) {
            color = Writer.defaultColor.foreground;
        }

        cell.afterglowColor = color;
        cell.afterglowCounter = counter;
    }

    /**
     * @param {Instruction} instruction
     */
    #record(instruction: Instruction) {
        if (this.#appState === 'record') {
            this.#demo.addInstruction(instruction);
        }
    }

    /**
     * @param {Instruction} instruction
     * @returns {boolean} false if the should be no delay after this instruction (i.e. on character instruction).
     */
    #executeInstruction(instruction: Instruction): boolean {
        const m = instruction.mnemonic;
        const a1 = instruction.argument1;
        // const a2 = instruction.argument2;

        const assertNullableStringArg: (value: any) => asserts value is (string | null) = (value: any) => {
            if (value !== null && typeof value !== 'string') {
                console.info('Last instruction:', instruction);
                throw new Error('Expected null or type string for argument');
            }
        };

        const assertBooleanArg: (value: any) => asserts value is boolean = (value: any) => {
            if (typeof value !== 'boolean') {
                console.info('Last instruction:', instruction);
                throw new Error('Expected type boolean for argument');
            }
        };

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
            assertNullableStringArg(a1);    // NOTE: Space will be encoded as null
            this.character(a1);
            delay = false;
        } else if (m === Instruction.clearCell) {
            this.clearCell();
        } else if (m === Instruction.cursorForegroundColor) {
            assertNullableStringArg(a1);
            this.setColor('cursor', 'foreground', a1);
        } else if (m === Instruction.cursorBackgroundColor) {
            assertNullableStringArg(a1);
            this.setColor('cursor', 'background', a1);
        } else if (m === Instruction.cursorBorderColor) {
            assertNullableStringArg(a1);
            this.setColor('cursor', 'border', a1);
        } else if (m === Instruction.globalForegroundColor) {
            assertNullableStringArg(a1);
            this.setColor('global', 'foreground', a1);
        } else if (m === Instruction.globalBackgroundColor) {
            assertNullableStringArg(a1);
            this.setColor('global', 'background', a1);
        } else if (m === Instruction.globalBorderColor) {
            assertNullableStringArg(a1);
            this.setColor('global', 'border', a1);
        } else if (m === Instruction.cursorForegroundPulse) {
            assertBooleanArg(a1);
            this.setPulse('cursor', 'foreground', a1);
        } else if (m === Instruction.cursorBackgroundPulse) {
            assertBooleanArg(a1);
            this.setPulse('cursor', 'background', a1);
        } else if (m === Instruction.cursorBorderPulse) {
            assertBooleanArg(a1);
            this.setPulse('cursor', 'border', a1);
        } else if (m === Instruction.globalForegroundPulse) {
            assertBooleanArg(a1);
            this.setPulse('global', 'foreground', a1);
        } else if (m === Instruction.globalBackgroundPulse) {
            assertBooleanArg(a1);
            this.setPulse('global', 'background', a1);
        } else if (m === Instruction.globalBorderPulse) {
            assertBooleanArg(a1);
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

                this.#triggerAfterglow(col, row + 1, cell.backgroundColor, cell.backgroundPulse ? this.#cycleVal : Writer.cycleMax);
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
     * @returns false if retract could not be performed (i.e. when at first row and first column).
     */
    retract(): boolean {
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

    character(character: string | null) {
        const instructionCharacter = character !== ' ' ? character : null;
        this.#record(new Instruction(Instruction.character, instructionCharacter));

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

    setColor(scope: ('cursor' | 'global'), target: ('foreground' | 'background' | 'border'), color: string | null) {
        const isCursorScope = scope === 'cursor';
        const cell = isCursorScope ? this.#cursor.cell : this.#globalStyle;
        const useGivenColor = isCursorScope || color !== null;

        let mnemonic = null;

        if (target === 'foreground') {
            cell.foregroundColor = useGivenColor ? color : Writer.defaultColor.foreground;
            mnemonic = Instruction.cursorForegroundColor;
        } else if (target === 'background') {
            cell.backgroundColor = useGivenColor ? color : Writer.defaultColor.background;
            mnemonic = Instruction.cursorBackgroundColor;
        } else if (target === 'border') {
            cell.borderColor = useGivenColor ? color : Writer.defaultColor.border;
            mnemonic = Instruction.cursorBorderColor;
        } else {
            console.error(`Target '${target}' not implemented`);
            return;
        }

        if (!isCursorScope) {
            // Replace first character 'C' (cell) with 'G' (global)
            mnemonic = 'G' + mnemonic.slice(1);
        }

        this.#record(new Instruction(mnemonic, color));
    }

    setPulse(scope: ('cursor' | 'global'), target: ('foreground' | 'background' | 'border'), enabled: boolean) {
        const isCursorScope = scope === 'cursor';
        const cell = isCursorScope ? this.#cursor.cell : this.#globalStyle;

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

        if (!isCursorScope) {
            // Replace first character 'C' (cell) with 'G' (global)
            mnemonic = 'G' + mnemonic.slice(1);
        }

        this.#record(new Instruction(mnemonic, enabled));
    }
}
