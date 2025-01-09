export default class Instruction {
    static cursorUp    = 'CUP';
    static cursorDown  = 'CDW';
    static cursorLeft  = 'CLF';
    static cursorRight = 'CRT';
    static scroll      = 'SCR';
    static advance     = 'ADV';
    static retract     = 'RCT';
    static character   = 'CHR';
    static clearCell   = 'CLR';

    static cursorForegroundColor = 'CFC';
    static cursorBackgroundColor = 'CBC';
    static cursorBorderColor     = 'CDC';
    static cursorForegroundPulse = 'CFP';
    static cursorBackgroundPulse = 'CBP';
    static cursorBorderPulse     = 'CDP';

    static globalForegroundColor = 'GFC';
    static globalBackgroundColor = 'GBC';
    static globalBorderColor     = 'GDC';
    static globalForegroundPulse = 'GFP';
    static globalBackgroundPulse = 'GBP';
    static globalBorderPulse     = 'GDP';


    /**
     * @param {string} mnemonic Instruction mnemonic
     * @param {null|string|number} argument1 First argument (depending on instruction)
     * @param {null|string|number} argument2 Second argument (depending on instruction)
     */
    constructor(mnemonic, argument1 = null, argument2 = null) {
        this.mnemonic = mnemonic;
        this.argument1 = argument1;
        this.argument2 = argument2;
    }
}
