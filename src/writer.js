class Cell {
    constructor() {
        this.foregroundColor = '#eeeeee';
        this.foregroundPulse = false;

        this.backgroundColor = null;
        this.backgroundPulse = true;

        this.afterglowColor = null;
        this.afterglowCounter = null;

        //this.character = null;
        //this.foregroundMode
        //this.backgroundMode
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

        this.backgroundColor = '#111111';

        this.borderWidth = 2;
        this.borderColor = '#222222';

        this.debugColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];

        this.init();
    }

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

        /** @type {number} Cycle value between 0 and 255 */
        this.cycleLastTimestamp = 0;

        /** @type {number} Cycle value between 0 and 255 */
        this.cycleVal = 0;

        /** @type {bool} Cycle direction (up=true, down=false) */
        this.cycleUp = true;

        /** @type {number} Speed between 0 and 1 */
        this.speed = .5;

        /** @type {Cursor} */
        this.cursor = new Cursor();
        this.cursor.cell.backgroundColor = '#eeeeee';

        this.cellWidth = (this.canvas.width - this.borderWidth * 2) / this.cols;
        this.cellHeight = (this.canvas.height - this.borderWidth * 2) / this.rows;
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

    getCell(col, row) {
        return this.cells[row * this.cols + col];
    }

    static #to2DigitHex(value) {
        return value.toString(16).padStart(2, '0');
    }

    #handleInput() {
    }

    #update(timestamp) {
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
                let cell = this.getCell(col, row);

                c.beginPath();
                c.rect(
                    col * this.cellWidth + this.borderWidth/2, row * this.cellHeight + this.borderWidth/2,
                    this.cellWidth - this.borderWidth, this.cellHeight - this.borderWidth
                );

                let backgroundColor = this.backgroundColor;
                let transparency = null;
                if (cell.backgroundColor !== null) {
                    backgroundColor = cell.backgroundColor;
                    if (cell.backgroundPulse) {
                        transparency = this.cycleVal;
                    }
                } else if (cell.afterglowCounter !== null) {
                    backgroundColor = cell.afterglowColor;
                    transparency = Math.ceil(cell.afterglowCounter * .5);
                    cell.afterglowCounter -= 5;
                    if (cell.afterglowCounter <= 0) {
                        cell.afterglowCounter = null;
                    }
                }
                c.fillStyle = backgroundColor + (transparency !== null ? Writer.#to2DigitHex(transparency) : '');
                c.fill();

                c.lineWidth = this.borderWidth;
                c.strokeStyle = this.borderColor;   // this.debugColors[((col + 1) * (row + 1)) % this.debugColors.length]
                c.stroke();
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

        c.fillStyle = cursor.cell.backgroundColor + Writer.#to2DigitHex(this.cycleVal) /* transparency */;
        c.fill();

        c.lineWidth = this.borderWidth;
        c.strokeStyle = this.borderColor;
        c.stroke();
    }

    cursorUp() {
        if (this.cursor.row === 0) {
            return;
        }

        this.triggerAfterglow();
        this.cursor.row--;
    }

    cursorDown() {
        // TODO: Scroll
        if (this.cursor.row === this.rows - 1) {
            return;
        }

        this.triggerAfterglow();
        this.cursor.row++;
    }

    cursorLeft() {
        this.triggerAfterglow();
        if (this.cursor.col === 0) {
            this.cursor.col = this.cols - 1;
        } else {
            this.cursor.col--;
        }
    }

    cursorRight() {
        this.triggerAfterglow();
        if (this.cursor.col === this.cols - 1) {
            this.cursor.col = 0;
        } else {
            this.cursor.col++;
        }
    }

    testAction() {
        const cursor = this.cursor;
        const col = cursor.col;
        const row = cursor.row;
        const cell = this.getCell(col, row);

        cursor.cell.backgroundColor = this.debugColors[(row * this.cols + col) % this.debugColors.length];
        cell.backgroundColor = cursor.cell.backgroundColor;

        this.cursorRight();
    }

    triggerAfterglow(col = this.cursor.col, row = this.cursor.row, color = this.cursor.cell.backgroundColor) {
        const cell = this.getCell(col, row);

        if (color === null) {
            color = '#eeeeee';
        }

        cell.afterglowColor = color;
        cell.afterglowCounter = this.cycleVal;
    }
}
