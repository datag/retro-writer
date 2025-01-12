export default class Cell {
    /** Foreground color */
    foregroundColor: string | null = null;

    /** Foreground pulse */
    foregroundPulse: boolean = false;


    /** Background color */
    backgroundColor: string | null = null;

    /** Background pulse */
    backgroundPulse: boolean = false;


    /** Border color */
    borderColor: string | null = null;

    /** Border pulse */
    borderPulse: boolean = false;


    /** Character/Symbol */
    character: string | null = null;


    /**
     * Afterglow color
     * @todo Change to Cell (style) and also handle border and character in afterglow
     */
    afterglowColor: string | null = null;

    /** Afterglow counter ranging from 0 to 255 (integer) */
    afterglowCounter: number | null = null;
}
