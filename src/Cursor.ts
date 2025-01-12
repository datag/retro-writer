import Cell from './Cell'

export default class Cursor {
    /** 0-based column index */
    col: number = 0;

    /** 0-based row index */
    row: number = 0;

    /** The cursor's current cell (style) */
    cell: Cell = new Cell();
}
