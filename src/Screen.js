import Writer from './Writer';

export default class Screen {
    /** @type {HTMLCanvasElement} */
    #canvas;

    /** @type {CanvasRenderingContext2D} */
    #ctx;

    /** @type {number} Number of columns */
    #cols;

    /** @type {number} Number of rows */
    #rows;

    /** @type {number} */
    #borderWidth = 2;

    /** @type {number} Calculated cell width */
    #cellWidth;

    /** @type {number} Calculated cell height */
    #cellHeight;

    /**
     * @param {HTMLCanvasElement} canvas
     * @param {number} width Canvas width in px
     * @param {number} height Canvas height in px
     * @param {number} cols Number of columns
     * @param {number} rows Number of rows
     */
    constructor(canvas, width, height, cols, rows) {
        this.#canvas = canvas;

        this.#canvas.width = width;
        this.#canvas.height = height;

        this.#ctx = canvas.getContext('2d');

        /** @type {number} */
        this.#cols = cols;

        /** @type {number} */
        this.#rows = rows;

        this.#cellWidth = (this.#canvas.width - this.#borderWidth * 2) / this.#cols;
        this.#cellHeight = (this.#canvas.height - this.#borderWidth * 2) / this.#rows;
    }

    static #to2DigitHex(value) {
        return value.toString(16).padStart(2, '0');
    }

    get canvas() {
        return this.#canvas;
    }

    /**
     * @param {Writer} writer
     */
    render(writer) {
        const c = this.#ctx;

        c.clearRect(0, 0, this.#canvas.width, this.#canvas.height);

        this.#renderCells(writer);
        this.#renderCursor(writer);

        if (writer.appState === 'pause') {
            this.#renderPause(writer);
        }

        this.#renderInfo(writer);

        if (writer.debug) {
            this.#renderDebug(writer);
        }
    }

    /**
     * @param {Writer} writer
     */
    #renderInfo(writer) {
        const c = this.#ctx;
        const fps = writer.fps;

        let infoParts = [];

        if (fps !== null) {
            infoParts.push(Math.floor(writer.fps) + ' fps');
        }

        if (infoParts.length) {
            const fontSize = this.#cellHeight * 0.5;
            c.fillStyle = 'Gray';
            c.font = `${fontSize}px monospace`;
            c.fillText(infoParts.join(' · '), 2, fontSize);
        }
    }

    /**
     * @param {Writer} writer
     */
    #renderDebug(writer) {
        const c = this.#ctx;

        c.fillStyle = 'Red';
        c.fillText(JSON.stringify(writer.debug), 2, 30);
    }

    /**
     * @param {Writer} writer
     */
    #renderPause(writer) {
        const c = this.#ctx;

        const text = '♥︎ PAUSE ♥︎';
        const fontSize = this.#cellHeight * 5;
        const counter = Math.ceil(Date.now() / 400);

        c.font = `${fontSize}px monospace`;

        const metrics = c.measureText(text);
        const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        const x = this.#canvas.width / 2 - metrics.width / 2, y = this.#canvas.height / 2 + textHeight / 2;

        c.lineWidth = fontSize * 0.02;

        c.fillStyle = Writer.colorPalette[counter % Math.min(Writer.colorPalette.length, 4)];
        c.fillText(text, x, y);
        c.strokeStyle = 'black';
        c.strokeText(text, x, y);

        const distance = fontSize * 0.04;

        c.fillStyle = 'black';
        c.fillText(text, x - distance, y - distance);
        c.strokeStyle = 'white';
        c.strokeText(text, x - distance, y - distance);
    }

    /**
     * @param {Writer} writer
     */
    #renderCells(writer) {
        const c = this.#ctx;

        for (let row = 0; row < this.#rows; row++) {
            for (let col = 0; col < this.#cols; col++) {
                const cell = writer.getCell(col, row);

                // Background
                c.beginPath();
                c.rect(
                    col * this.#cellWidth + this.#borderWidth/2, row * this.#cellHeight + this.#borderWidth/2,
                    this.#cellWidth - this.#borderWidth, this.#cellHeight - this.#borderWidth
                );

                let color = writer.globalStyle.backgroundColor;
                let transparency = null;
                if (cell.backgroundColor !== null) {
                    color = cell.backgroundColor;
                    if (cell.backgroundPulse) {
                        transparency = writer.cycleVal;
                    }
                } else if (writer.globalStyle.backgroundPulse) {
                    transparency = writer.cycleVal;
                } else if (cell.afterglowCounter !== null) {
                    color = cell.afterglowColor;
                    transparency = Math.ceil(cell.afterglowCounter * .5);
                }
                c.fillStyle = color + (transparency !== null ? Screen.#to2DigitHex(transparency) : '');
                c.fill();

                // Border
                color = writer.globalStyle.borderColor;
                transparency = null;
                if (cell.borderColor !== null) {
                    color = cell.borderColor;
                    if (cell.borderPulse) {
                        transparency = writer.cycleVal;
                    }
                } else if (writer.globalStyle.borderPulse) {
                    transparency = writer.cycleVal;
                }
                c.strokeStyle = color + (transparency !== null ? Screen.#to2DigitHex(transparency) : '');
                c.lineWidth = this.#borderWidth;
                c.stroke();

                // Character
                if (cell.character !== null) {
                    const fontSize = this.#cellHeight * .6;
                    color = writer.globalStyle.foregroundColor;
                    transparency = null;
                    if (cell.foregroundColor !== null) {
                        color = cell.foregroundColor;
                        if (cell.foregroundPulse) {
                            transparency = writer.cycleVal;
                        }
                    } else if (writer.globalStyle.foregroundPulse) {
                        transparency = writer.cycleVal;
                    }
                    c.fillStyle = color + (transparency !== null ? Screen.#to2DigitHex(transparency) : '');
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

    /**
     * @param {Writer} writer
     */
    #renderCursor(writer) {
        const c = this.#ctx;
        const cursor = writer.cursor;
        const col = cursor.col;
        const row = cursor.row;

        c.beginPath();
        c.rect(
            col * this.#cellWidth + this.#borderWidth/2, row * this.#cellHeight + this.#borderWidth/2,
            this.#cellWidth - this.#borderWidth, this.#cellHeight - this.#borderWidth
        );

        let color = cursor.cell.backgroundColor ?? '#aaaaaa';   // fallback color
        c.fillStyle = color + Screen.#to2DigitHex(writer.cycleVal) /* transparency */;
        c.fill();

        c.lineWidth = this.#borderWidth;
        c.strokeStyle = cursor.cell.borderColor + Screen.#to2DigitHex(writer.cycleVal) /* transparency */;
        c.stroke();
    }
}
