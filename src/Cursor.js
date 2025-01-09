import Cell from './Cell'

export default class Cursor {
    constructor() {
        /** @type {number} */
        this.col = 0;

        /** @type {number} */
        this.row = 0;

        /** @type {Cell} */
        this.cell = new Cell();
    }
}
