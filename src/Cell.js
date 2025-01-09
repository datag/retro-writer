export default class Cell {
    /** @type {?string} Foreground color */
    foregroundColor = null;

    /** @type {boolean} Foreground pulse */
    foregroundPulse = false;


    /** @type {?string} Background color */
    backgroundColor = null;

    /** @type {boolean} Background pulse */
    backgroundPulse = false;


    /** @type {?string} Border color */
    borderColor = null;

    /** @type {boolean} Border pulse */
    borderPulse = false;


    /** @type {?string} Character/Symbol */
    character = null;


    /**
     * @type {?string} Afterglow color
     * @todo Change to Cell (style) and also handle border and character in afterglow
     */
    afterglowColor = null;

    /** @type {number} Afterglow counter ranging from 0 to 255 (integer) */
    afterglowCounter = null;
};
