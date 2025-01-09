export default class Cell {
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
};
