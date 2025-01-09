import Cell from './Cell'

export default class Cursor {
    /** @type {number} 0-based column index */
    col = 0;

    /** @type {number} 0-based row index */
    row = 0;

    /** @type {Cell} The cursor's current cell (style) */
    cell = new Cell();
}
